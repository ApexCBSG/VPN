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
  AppState
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../styles/theme';
import { Settings, Globe, Power, ShieldCheck, ShieldAlert } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as SecureStore from 'expo-secure-store';
import { generateKeyPair } from '../utils/wireguard';
import { API_URL } from '../config';
import { getPublicIP } from '../utils/network';
import { connectVPN, disconnectVPN } from '../utils/vpnBridge';
import { prewarmVPN, getCachedConfig } from '../utils/vpnPrewarm';
import { useVPNSettings } from '../context/VPNSettingsContext';

const { width } = Dimensions.get('window');

export default function DashboardScreen({ navigation, route }) {
  const { autoConnect, splitTunnelEnabled, splitTunnelApps, setLastServer, lastServer } = useVPNSettings();

  const [isConnected, setIsConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [autoConnectTriggered, setAutoConnectTriggered] = useState(false);
  const [initialIP, setInitialIP] = useState(null);
  const [publicIP, setPublicIP] = useState(null);
  const [pendingConnection, setPendingConnection] = useState(null);
  const [debugInfo, setDebugInfo] = useState('');
  const [connectedNodeId, setConnectedNodeId] = useState(null);
  const connectingRef = useRef(false);

  // Fetch initial IP and trigger pre-warm on mount
  useEffect(() => {
    const init = async () => {
      const [ip, token, pubKey] = await Promise.all([
        getPublicIP(),
        SecureStore.getItemAsync('userToken'),
        SecureStore.getItemAsync('wg_public_key'),
      ]);
      if (ip) setInitialIP(ip);

      // Pre-warm the config for the last/default server in background
      const server = route.params?.selectedServer?._id ? route.params.selectedServer : lastServer;
      if (token && server?._id && pubKey) {
        prewarmVPN(token, server, pubKey).catch(() => {});
      }
    };
    init();
  }, []);

  // Auto-connect on launch
  useEffect(() => {
    if (autoConnect && !autoConnectTriggered && !isConnected && !connecting) {
      setAutoConnectTriggered(true);
      const timer = setTimeout(() => handleToggleConnection(), 1500);
      return () => clearTimeout(timer);
    }
  }, [autoConnect, autoConnectTriggered]);

  // Resume after Android VPN permission dialog
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

  const handleToggleConnection = async () => {
    if (connectingRef.current) return;

    if (isConnected) {
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
      setPublicIP(null);
      setDebugInfo('');
      setConnectedNodeId(null);
      return;
    }

    connectingRef.current = true;
    setConnecting(true);
    setDebugInfo('');

    try {
      // 1. Parallel reads — no sequential waiting
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

      // 2. Ensure WireGuard keys exist
      let clientPubKey = storedPubKey;
      if (!clientPubKey || !storedPrivKey) {
        const { publicKey, privateKey } = generateKeyPair();
        await Promise.all([
          SecureStore.setItemAsync('wg_public_key', publicKey),
          SecureStore.setItemAsync('wg_private_key', privateKey),
        ]);
        clientPubKey = publicKey;
        console.log('[SECURITY] Generated new persistent keys');
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

      // 4. Get config — use cache (pre-warmed) or fetch now
      let config = getCachedConfig(targetServer._id);
      if (!config) {
        console.log('[CONNECT] No cached config — fetching from backend...');
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
      } else {
        console.log('[CONNECT] Using pre-warmed config — skipping backend round-trip');
      }

      await setLastServer(targetServer);
      setConnectedNodeId(targetServer._id);

      // 5. Activate native WireGuard tunnel
      const vpnOptions = {};
      if (splitTunnelEnabled && splitTunnelApps.length > 0) {
        vpnOptions.excludedApps = splitTunnelApps;
      }

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
        Alert.alert(
          'VPN Permission',
          'Tap "Accept" on the system dialog that appears.',
          [{ text: 'OK' }]
        );
        return;
      }

      // 6. Mark connected immediately — trust the native WireGuard layer
      setIsConnected(true);

      // 7. Fetch gateway IP in background for display only — does NOT gate UI
      getPublicIP().then(ip => {
        if (ip) setPublicIP(ip);
      }).catch(() => {});

      // Pre-warm for next time in background
      prewarmVPN(token, targetServer, clientPubKey).catch(() => {});

    } catch (error) {
      console.error('[CONNECT] Error:', error);
      Alert.alert('Protocol Error', error.message || 'Connection failed.');
    } finally {
      connectingRef.current = false;
      setConnecting(false);
    }
  };

  const selectedServer = route.params?.selectedServer || { name: 'Auto Selection', city: 'Optimal Node', countryCode: 'US' };

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
            <Text style={[styles.headerStatus, isConnected && { color: theme.colors.primary }]}>
              {isConnected ? 'CONNECTION ACTIVE' : 'NETWORK DISCONNECTED'}
            </Text>
          </View>

          <TouchableOpacity style={styles.iconButton} onPress={() => navigation.navigate('Account')}>
            <Settings size={20} color={theme.colors.onSurface} strokeWidth={2.5} />
          </TouchableOpacity>
        </View>

        <View style={styles.statusContainer}>
          <View style={[
            styles.statusChip,
            { backgroundColor: isConnected ? theme.colors.primary : 'rgba(255, 113, 108, 0.1)' }
          ]}>
            {isConnected
              ? <ShieldCheck size={12} color={theme.colors.background} />
              : <ShieldAlert size={12} color={theme.colors.error} />}
            <Text style={[
              styles.statusChipText,
              isConnected ? { color: theme.colors.background } : { color: theme.colors.error }
            ]}>
              {isConnected ? 'SECURED' : 'NOT PROTECTED'}
            </Text>
          </View>

          <Text style={styles.displayStatus}>
            {isConnected ? 'Connected' : 'Disconnected'}
          </Text>

          {debugInfo ? (
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
            isConnected && { shadowColor: theme.colors.primary, shadowOpacity: 0.3 }
          ]}
          onPress={handleToggleConnection}
          disabled={connecting}
        >
          <LinearGradient
            colors={isConnected ? ['#81ecff', '#004c5a'] : theme.colors.linearGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.pulseContainer}
          >
            <View style={styles.buttonBody}>
              {connecting
                ? <ActivityIndicator size="large" color={theme.colors.background} />
                : <Power size={50} color={theme.colors.background} strokeWidth={2.5} />}
              <Text style={styles.buttonLabel}>{isConnected ? 'OFF' : 'ON'}</Text>
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
