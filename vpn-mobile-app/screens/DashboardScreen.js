import { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  ActivityIndicator,
  Alert,
  AppState,
  NativeEventEmitter,
  NativeModules,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../styles/theme';
import { Settings, Globe, Power, ShieldCheck, ShieldAlert, WifiOff } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as SecureStore from 'expo-secure-store';
import { generateKeyPair } from '../utils/wireguard';
import { API_URL } from '../config';
import { getPublicIP } from '../utils/network';
import { connectVPN, disconnectVPN } from '../utils/vpnBridge';
import { prewarmVPN, getCachedConfig } from '../utils/vpnPrewarm';
import { useVPNSettings } from '../context/VPNSettingsContext';

const { width } = Dimensions.get('window');

// Reconnect backoff delays in ms: attempt 1→0s, 2→2s, 3→5s, 4→10s, 5→20s
const RECONNECT_DELAYS = [0, 2000, 5000, 10000, 20000];
const MAX_RECONNECT_ATTEMPTS = 5;

export default function DashboardScreen({ navigation, route }) {
  const { autoConnect, killSwitch, splitTunnelEnabled, splitTunnelApps, setLastServer, lastServer } = useVPNSettings();

  const [isConnected, setIsConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [autoConnectTriggered, setAutoConnectTriggered] = useState(false);
  const [initialIP, setInitialIP] = useState(null);
  const [publicIP, setPublicIP] = useState(null);
  const [pendingConnection, setPendingConnection] = useState(null);
  const [debugInfo, setDebugInfo] = useState('');
  const [connectedNodeId, setConnectedNodeId] = useState(null);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  const [isReconnecting, setIsReconnecting] = useState(false);

  // Refs to access latest state inside event callbacks without stale closures
  const connectingRef = useRef(false);
  const isConnectedRef = useRef(false);
  const userDisconnectedRef = useRef(false); // true when user manually taps disconnect
  const reconnectAttemptRef = useRef(0);
  const reconnectTimerRef = useRef(null);
  const lastConnectParamsRef = useRef(null); // stores { config, targetServer, vpnOptions, token, clientPubKey }

  // Keep refs in sync with state
  useEffect(() => { isConnectedRef.current = isConnected; }, [isConnected]);
  useEffect(() => { reconnectAttemptRef.current = reconnectAttempt; }, [reconnectAttempt]);

  // ─── Native VPN state event listener ───────────────────────────────────────
  // The native WireGuardVpnModule emits 'vpnStateChanged' whenever the tunnel
  // state changes (UP → DOWN, DOWN → UP, ERROR, etc.)
  useEffect(() => {
    const { WireGuardVpnModule } = NativeModules;
    if (!WireGuardVpnModule) return;

    const emitter = new NativeEventEmitter(WireGuardVpnModule);
    const subscription = emitter.addListener('vpnStateChanged', (event) => {
      console.log('[VPN_EVENT] vpnStateChanged:', event);
      const { tunnelState } = event;

      if ((tunnelState === 'INACTIVE' || tunnelState === 'ERROR') && isConnectedRef.current) {
        // Tunnel dropped while we expected it to be up
        if (!userDisconnectedRef.current) {
          console.log('[VPN_EVENT] Unexpected tunnel drop detected — initiating reconnect');
          handleUnexpectedDrop();
        } else {
          // User tapped disconnect — this is expected
          console.log('[VPN_EVENT] Tunnel down after user disconnect — expected');
        }
      } else if (tunnelState === 'ACTIVE' && !isConnectedRef.current) {
        // Tunnel came back up (e.g. after reconnect)
        console.log('[VPN_EVENT] Tunnel active');
        setIsConnected(true);
        setIsReconnecting(false);
        setDebugInfo('');
      }
    });

    return () => subscription.remove();
  }, []);

  // ─── Handle unexpected VPN drop ────────────────────────────────────────────
  const handleUnexpectedDrop = () => {
    setIsConnected(false);
    isConnectedRef.current = false;
    setPublicIP(null);

    const attempt = reconnectAttemptRef.current;
    if (attempt >= MAX_RECONNECT_ATTEMPTS) {
      console.log('[RECONNECT] Max attempts reached');
      setIsReconnecting(false);
      setReconnectAttempt(0);
      reconnectAttemptRef.current = 0;
      setDebugInfo('Reconnect failed after 5 attempts');

      if (killSwitch) {
        Alert.alert(
          'Kill Switch Active',
          'VPN connection was lost and could not be restored. Your internet is blocked until VPN reconnects.\n\nTap "Try Again" to reconnect.',
          [{ text: 'Try Again', onPress: () => startReconnect() }]
        );
      }
      return;
    }

    setIsReconnecting(true);
    const delay = RECONNECT_DELAYS[attempt] ?? 20000;
    const nextAttempt = attempt + 1;
    setReconnectAttempt(nextAttempt);
    reconnectAttemptRef.current = nextAttempt;

    console.log(`[RECONNECT] Attempt ${nextAttempt}/${MAX_RECONNECT_ATTEMPTS} in ${delay}ms`);
    setDebugInfo(`Reconnecting... (${nextAttempt}/${MAX_RECONNECT_ATTEMPTS})`);

    clearTimeout(reconnectTimerRef.current);
    reconnectTimerRef.current = setTimeout(() => startReconnect(), delay);
  };

  const startReconnect = async () => {
    if (!lastConnectParamsRef.current) {
      console.warn('[RECONNECT] No stored connection params — cannot reconnect');
      setIsReconnecting(false);
      return;
    }

    const { config, targetServer, vpnOptions, token, clientPubKey } = lastConnectParamsRef.current;
    console.log('[RECONNECT] Firing reconnect with stored params');

    connectingRef.current = true;
    setConnecting(true);

    try {
      await disconnectVPN().catch(() => {});

      // Re-fetch fresh config in case the cached one is stale
      let freshConfig = getCachedConfig(targetServer._id);
      if (!freshConfig) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        const response = await fetch(`${API_URL}/vpn/connect`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
          body: JSON.stringify({ nodeId: targetServer._id, publicKey: clientPubKey }),
          signal: controller.signal,
        });
        clearTimeout(timeout);
        if (response.ok) {
          const data = await response.json();
          freshConfig = data.config;
        }
      }
      const connectConfig = freshConfig || config;

      const vpnPromise = connectVPN(connectConfig, vpnOptions);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), 15000)
      );

      const result = await Promise.race([vpnPromise, timeoutPromise]);

      if (result === 'CONNECTED') {
        console.log('[RECONNECT] Success');
        setIsConnected(true);
        isConnectedRef.current = true;
        setIsReconnecting(false);
        setReconnectAttempt(0);
        reconnectAttemptRef.current = 0;
        setDebugInfo('');
        getPublicIP().then(ip => { if (ip) setPublicIP(ip); }).catch(() => {});
        prewarmVPN(token, targetServer, clientPubKey).catch(() => {});
      } else {
        throw new Error('Reconnect result: ' + result);
      }
    } catch (err) {
      console.warn('[RECONNECT] Failed:', err.message);
      // Trigger next backoff attempt via handleUnexpectedDrop
      handleUnexpectedDrop();
    } finally {
      connectingRef.current = false;
      setConnecting(false);
    }
  };

  // ─── Init: fetch IP + pre-warm ──────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      const [ip, token, pubKey] = await Promise.all([
        getPublicIP(),
        SecureStore.getItemAsync('userToken'),
        SecureStore.getItemAsync('wg_public_key'),
      ]);
      if (ip) setInitialIP(ip);

      const server = route.params?.selectedServer?._id ? route.params.selectedServer : lastServer;
      if (token && server?._id && pubKey) {
        prewarmVPN(token, server, pubKey).catch(() => {});
      }
    };
    init();

    return () => {
      // Clear any pending reconnect timer on unmount
      clearTimeout(reconnectTimerRef.current);
    };
  }, []);

  // ─── Auto-connect on launch ─────────────────────────────────────────────────
  useEffect(() => {
    if (autoConnect && !autoConnectTriggered && !isConnected && !connecting) {
      setAutoConnectTriggered(true);
      const timer = setTimeout(() => handleToggleConnection(), 1500);
      return () => clearTimeout(timer);
    }
  }, [autoConnect, autoConnectTriggered]);

  // ─── Resume after Android VPN permission dialog ─────────────────────────────
  useEffect(() => {
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [pendingConnection]);

  const handleAppStateChange = async (state) => {
    if (state === 'active' && pendingConnection) {
      setPendingConnection(null);
      await new Promise(r => setTimeout(r, 300));
      await handleToggleConnection();
    }
  };

  // ─── Main connect/disconnect toggle ────────────────────────────────────────
  const handleToggleConnection = async () => {
    if (connectingRef.current) return;

    if (isConnected || isReconnecting) {
      // User manually disconnecting — stop any reconnect loop
      userDisconnectedRef.current = true;
      clearTimeout(reconnectTimerRef.current);
      setIsReconnecting(false);
      setReconnectAttempt(0);
      reconnectAttemptRef.current = 0;
      lastConnectParamsRef.current = null;

      await disconnectVPN().catch(() => {});

      if (connectedNodeId) {
        SecureStore.getItemAsync('userToken').then(token => {
          if (token) fetch(`${API_URL}/vpn/disconnect`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
            body: JSON.stringify({ nodeId: connectedNodeId })
          }).catch(() => {});
        });
      }

      setIsConnected(false);
      isConnectedRef.current = false;
      setPublicIP(null);
      setDebugInfo('');
      setConnectedNodeId(null);
      return;
    }

    // Reset manual disconnect flag before new connect
    userDisconnectedRef.current = false;
    connectingRef.current = true;
    setConnecting(true);
    setDebugInfo('');

    try {
      // 1. Parallel reads
      const [token, storedPubKey, storedPrivKey] = await Promise.all([
        SecureStore.getItemAsync('userToken'),
        SecureStore.getItemAsync('wg_public_key'),
        SecureStore.getItemAsync('wg_private_key'),
      ]);

      if (!token) {
        Alert.alert('Auth Error', 'Please log in again.');
        navigation.navigate('Login');
        return;
      }

      // 2. Ensure WireGuard keys exist — generate ONCE, never overwrite
      let clientPubKey = storedPubKey;
      if (!clientPubKey || !storedPrivKey) {
        const { publicKey, privateKey } = generateKeyPair();
        // Write both atomically; if one fails, clear both so next attempt regenerates cleanly
        try {
          await SecureStore.setItemAsync('wg_private_key', privateKey);
          await SecureStore.setItemAsync('wg_public_key', publicKey);
          clientPubKey = publicKey;
          console.log('[SECURITY] Generated new persistent WireGuard keys');
        } catch (e) {
          await SecureStore.deleteItemAsync('wg_public_key').catch(() => {});
          await SecureStore.deleteItemAsync('wg_private_key').catch(() => {});
          throw new Error('Failed to save WireGuard keys: ' + e.message);
        }
      }

      // 3. Resolve target server
      let targetServer = route.params?.selectedServer?._id ? route.params.selectedServer : null;
      if (!targetServer) {
        if (lastServer?._id) {
          targetServer = lastServer;
        } else {
          const nodeRes = await fetch(`${API_URL}/nodes`);
          const nodes = await nodeRes.json();
          if (nodeRes.ok && nodes.length > 0) {
            targetServer = nodes[0];
          } else {
            throw new Error('No active VPN nodes available.');
          }
        }
      }

      // 4. Get config — use pre-warmed cache or fetch
      let config = getCachedConfig(targetServer._id);
      if (!config) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        const response = await fetch(`${API_URL}/vpn/connect`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
          body: JSON.stringify({ nodeId: targetServer._id, publicKey: clientPubKey }),
          signal: controller.signal,
        });
        clearTimeout(timeout);
        const data = await response.json();
        if (!response.ok) throw new Error(data.msg || 'Handshake failed.');
        config = data.config;
      }

      // 5. Build VPN options (split tunneling)
      const vpnOptions = {};
      if (splitTunnelEnabled && splitTunnelApps.length > 0) {
        vpnOptions.excludedApps = splitTunnelApps;
      }

      // Store params for auto-reconnect
      lastConnectParamsRef.current = { config, targetServer, vpnOptions, token, clientPubKey };

      await setLastServer(targetServer);
      setConnectedNodeId(targetServer._id);

      // 6. Activate native WireGuard tunnel
      const vpnPromise = connectVPN(config, vpnOptions);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('VPN tunnel activation timeout (15s)')), 15000)
      );

      let vpnResult;
      try {
        vpnResult = await Promise.race([vpnPromise, timeoutPromise]);
      } catch (nativeErr) {
        setDebugInfo(`Tunnel Error: ${nativeErr.message || 'Unknown'}`);
        Alert.alert('Connection Failed', nativeErr.message || 'Unknown error', [{ text: 'OK' }]);
        return;
      }

      if (vpnResult === 'PERMISSION_PENDING') {
        setPendingConnection(config);
        Alert.alert('VPN Permission', 'Tap "Accept" on the system dialog that appears.', [{ text: 'OK' }]);
        return;
      }

      // 7. Mark connected — trust the native layer
      setIsConnected(true);
      isConnectedRef.current = true;

      // Pre-warm for next reconnect
      prewarmVPN(token, targetServer, clientPubKey).catch(() => {});

      // Fetch gateway IP — retry every 3s for up to 30s.
      // The WireGuard UDP handshake completes a few seconds after connect() resolves.
      (async () => {
        for (let attempt = 1; attempt <= 10; attempt++) {
          await new Promise(r => setTimeout(r, 3000));
          if (!isConnectedRef.current) break; // user disconnected — stop
          try {
            const ip = await getPublicIP();
            if (ip) { setPublicIP(ip); break; }
          } catch (_) {}
          console.log(`[IP_FETCH] Attempt ${attempt}/10 — retrying...`);
        }
      })();

    } catch (error) {
      console.error('[CONNECT] Error:', error);
      Alert.alert('Protocol Error', error.message || 'Connection failed.');
    } finally {
      connectingRef.current = false;
      setConnecting(false);
    }
  };

  const selectedServer = route.params?.selectedServer || { name: 'Auto Selection', city: 'Optimal Node', countryCode: 'US' };

  // UI status derived values
  const buttonDisabled = connecting;
  const showReconnecting = isReconnecting && !connecting;
  const chipColor = isConnected
    ? theme.colors.primary
    : isReconnecting
      ? 'rgba(255,179,0,0.15)'
      : 'rgba(255,113,108,0.1)';
  const chipTextColor = isConnected
    ? theme.colors.background
    : isReconnecting
      ? '#ffb300'
      : theme.colors.error;
  const chipLabel = isConnected
    ? 'SECURED'
    : isReconnecting
      ? 'RECONNECTING...'
      : killSwitch
        ? 'BLOCKED — NO VPN'
        : 'NOT PROTECTED';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" />

      <View style={styles.header}>
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.iconButton} onPress={() => navigation.navigate('Servers')}>
            <Globe size={20} color={theme.colors.onSurface} strokeWidth={2.5} />
          </TouchableOpacity>

          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>VPN DASHBOARD</Text>
            <Text style={[styles.headerStatus, isConnected && { color: theme.colors.primary }, isReconnecting && { color: '#ffb300' }]}>
              {isConnected ? 'CONNECTION ACTIVE' : isReconnecting ? 'RESTORING TUNNEL...' : 'NETWORK DISCONNECTED'}
            </Text>
          </View>

          <TouchableOpacity style={styles.iconButton} onPress={() => navigation.navigate('Account')}>
            <Settings size={20} color={theme.colors.onSurface} strokeWidth={2.5} />
          </TouchableOpacity>
        </View>

        <View style={styles.statusContainer}>
          <View style={[styles.statusChip, { backgroundColor: chipColor }]}>
            {isConnected
              ? <ShieldCheck size={12} color={theme.colors.background} />
              : isReconnecting
                ? <ShieldAlert size={12} color="#ffb300" />
                : killSwitch
                  ? <WifiOff size={12} color={theme.colors.error} />
                  : <ShieldAlert size={12} color={theme.colors.error} />}
            <Text style={[styles.statusChipText, { color: chipTextColor }]}>
              {chipLabel}
            </Text>
          </View>

          <Text style={styles.displayStatus}>
            {isConnected ? 'Connected' : isReconnecting ? 'Reconnecting' : 'Disconnected'}
          </Text>

          {showReconnecting && (
            <Text style={[styles.bridgeInfo, { color: '#ffb300' }]}>
              {debugInfo || 'Restoring secure connection...'}
            </Text>
          )}
          {!showReconnecting && debugInfo ? (
            <Text style={[styles.bridgeInfo, { color: '#ff6b6b', marginTop: 12 }]}>
              {debugInfo}
            </Text>
          ) : null}
        </View>
      </View>

      <View style={styles.main}>
        <TouchableOpacity
          activeOpacity={0.8}
          style={[
            styles.connectOuter,
            isConnected && { shadowColor: theme.colors.primary, shadowOpacity: 0.3 },
            isReconnecting && { shadowColor: '#ffb300', shadowOpacity: 0.3 },
          ]}
          onPress={handleToggleConnection}
          disabled={buttonDisabled}
        >
          <LinearGradient
            colors={
              isConnected
                ? ['#81ecff', '#004c5a']
                : isReconnecting
                  ? ['#ffb300', '#4a3a00']
                  : theme.colors.linearGradient
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.pulseContainer}
          >
            <View style={styles.buttonBody}>
              {connecting
                ? <ActivityIndicator size="large" color={theme.colors.background} />
                : <Power size={50} color={theme.colors.background} strokeWidth={2.5} />}
              <Text style={styles.buttonLabel}>
                {isConnected || isReconnecting ? 'OFF' : 'ON'}
              </Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.glassPanel}
          onPress={() => navigation.navigate('Servers')}
          activeOpacity={0.75}
        >
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>SERVER REGION</Text>
            <Text style={styles.statValue}>{selectedServer.name || 'Optimal Node'}</Text>
            <Text style={styles.statSubValue}>{selectedServer.city || 'Selecting...'}, {selectedServer.countryCode || 'Global'}</Text>
          </View>
          <Text style={styles.changeServerHint}>TAP TO CHANGE</Text>
        </TouchableOpacity>

        <View style={styles.ipContainer}>
          <View style={styles.ipSection}>
            <Text style={styles.ipLabel}>ORIGINAL IP</Text>
            <Text style={styles.ipValue}>{initialIP || 'Checking...'}</Text>
          </View>
          <View style={styles.ipDivider} />
          <View style={styles.ipSection}>
            <Text style={styles.ipLabel}>ASSIGNED GATEWAY</Text>
            <Text style={[styles.ipValue, isConnected && publicIP && { color: theme.colors.primary }]}>
              {isConnected ? (publicIP || 'Fetching...') : '---.---.---.---'}
            </Text>
          </View>
        </View>
        <Text style={styles.footerBranding}>SECURE TUNNEL NETWORK ACCESS</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: { paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.md },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  headerInfo: { alignItems: 'center' },
  headerTitle: { fontSize: 10, fontFamily: theme.fonts.label, color: theme.colors.onSurfaceVariant, fontWeight: '900', letterSpacing: 2 },
  headerStatus: { fontSize: 10, fontFamily: theme.fonts.label, color: theme.colors.outline, fontWeight: '900', marginTop: 2, letterSpacing: 1 },
  iconButton: { width: 46, height: 46, borderRadius: 23, backgroundColor: theme.colors.surfaceContainerHigh, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: theme.colors.outlineVariant },
  statusContainer: { alignItems: 'center' },
  statusChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginBottom: 12, gap: 6 },
  statusChipText: { fontSize: 9, fontFamily: theme.fonts.label, fontWeight: '900', letterSpacing: 1 },
  displayStatus: { fontSize: 38, fontFamily: theme.fonts.display, color: theme.colors.onBackground, fontWeight: '900', textAlign: 'center', letterSpacing: -1 },
  bridgeInfo: { fontSize: 11, color: '#ffb300', fontFamily: theme.fonts.body, marginTop: 8, textAlign: 'center', opacity: 0.8 },
  main: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  connectOuter: { width: width * 0.52, height: width * 0.52, borderRadius: width * 0.26, padding: 10, backgroundColor: theme.colors.surfaceContainerHigh, shadowOffset: { width: 0, height: 10 }, shadowRadius: 30, elevation: 20 },
  pulseContainer: { flex: 1, borderRadius: width * 0.26, justifyContent: 'center', alignItems: 'center' },
  buttonBody: { alignItems: 'center' },
  buttonLabel: { color: theme.colors.background, fontSize: 12, fontFamily: theme.fonts.label, fontWeight: '900', letterSpacing: 3, marginTop: 15 },
  footer: { paddingHorizontal: theme.spacing.lg, paddingBottom: 100 },
  glassPanel: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(255, 255, 255, 0.03)', borderRadius: 18, paddingHorizontal: 20, paddingVertical: 16, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.06)', marginBottom: 14 },
  statItem: { flex: 1 },
  statLabel: { fontSize: 9, fontFamily: theme.fonts.label, color: theme.colors.onSurfaceVariant, fontWeight: '900', letterSpacing: 1, marginBottom: 5 },
  statValue: { fontSize: 14, fontFamily: theme.fonts.body, color: theme.colors.onSurface, fontWeight: '800' },
  statSubValue: { fontSize: 11, fontFamily: theme.fonts.body, color: theme.colors.onSurfaceVariant, marginTop: 2 },
  changeServerHint: { fontSize: 8, fontFamily: theme.fonts.label, color: theme.colors.primary, fontWeight: '900', letterSpacing: 1, opacity: 0.7 },
  ipContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255, 255, 255, 0.02)', borderRadius: 16, padding: 15, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.03)' },
  ipSection: { flex: 1, alignItems: 'center' },
  ipLabel: { fontSize: 8, fontFamily: theme.fonts.label, color: theme.colors.onSurfaceVariant, fontWeight: '800', letterSpacing: 1.5, marginBottom: 4 },
  ipValue: { fontSize: 11, fontFamily: theme.fonts.body, color: theme.colors.outline, fontWeight: '700' },
  ipDivider: { width: 1, height: 20, backgroundColor: 'rgba(255, 255, 255, 0.1)', marginHorizontal: 10 },
  footerBranding: { textAlign: 'center', marginTop: 15, fontSize: 8, fontFamily: theme.fonts.label, color: theme.colors.onSurfaceVariant, letterSpacing: 2, opacity: 0.5 },
});
