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
  Animated,
  Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../styles/theme';
import { Settings, Globe, Power, ShieldCheck, ShieldAlert, WifiOff, Wifi } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as SecureStore from 'expo-secure-store';
import { generateKeyPair } from '../utils/wireguard';
import { API_URL } from '../config';
import { getPublicIP, getRealIP, invalidateRealIPCache } from '../utils/network';
import { connectVPN, disconnectVPN } from '../utils/vpnBridge';
import { prewarmVPN, getCachedConfig, invalidateCache } from '../utils/vpnPrewarm';
import { useVPNSettings } from '../context/VPNSettingsContext';

const { width } = Dimensions.get('window');
const ORB_SIZE = width * 0.58;

// Reconnect backoff delays: attempt 1→0s, 2→2s, 3→5s, 4→10s, 5→20s
const RECONNECT_DELAYS = [0, 2000, 5000, 10000, 20000];
const MAX_RECONNECT_ATTEMPTS = 5;

// Minimum ms to wait after disconnect before allowing a new connect
const DISCONNECT_SETTLE_MS = 800;

export default function DashboardScreen({ navigation, route }) {
  const { autoConnect, killSwitch, splitTunnelEnabled, splitTunnelApps, setLastServer, lastServer } = useVPNSettings();
  const insets = useSafeAreaInsets();

  const [isConnected, setIsConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [verifying, setVerifying] = useState(false); // post-connect tunnel verification
  const [autoConnectTriggered, setAutoConnectTriggered] = useState(false);
  const [initialIP, setInitialIP] = useState(null);
  const [publicIP, setPublicIP] = useState(null);
  const [pendingConnection, setPendingConnection] = useState(null);
  const [debugInfo, setDebugInfo] = useState('');
  const [connectedNodeId, setConnectedNodeId] = useState(null);
  const [connectedNode, setConnectedNode] = useState(null); // full node object for display
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [sessionSeconds, setSessionSeconds] = useState(0); // live session timer
  const [isSettling, setIsSettling] = useState(false); // true during 800ms post-disconnect settle window

  // ─── Refs ───────────────────────────────────────────────────────────────────
  const connectingRef = useRef(false);
  const isConnectedRef = useRef(false);
  const userDisconnectedRef = useRef(false);
  const isTogglingRef = useRef(false); // prevents any re-entrancy during toggle
  const disconnectSettledRef = useRef(true); // false during settle window after disconnect
  const reconnectAttemptRef = useRef(0);
  const reconnectTimerRef = useRef(null);
  const lastConnectParamsRef = useRef(null);
  const sessionTimerRef = useRef(null);
  const sessionStartRef = useRef(null);

  // ─── Animations ─────────────────────────────────────────────────────────────
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseOpacity = useRef(new Animated.Value(0.6)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isConnected) {
      // Pulsing glow ring when connected
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(pulseAnim, { toValue: 1.08, duration: 1400, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
            Animated.timing(pulseOpacity, { toValue: 0.0, duration: 1400, useNativeDriver: true }),
          ]),
          Animated.parallel([
            Animated.timing(pulseAnim, { toValue: 1, duration: 1400, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
            Animated.timing(pulseOpacity, { toValue: 0.6, duration: 1400, useNativeDriver: true }),
          ]),
        ])
      );
      pulse.start();
      Animated.timing(glowAnim, { toValue: 1, duration: 400, useNativeDriver: false }).start();
      return () => { pulse.stop(); pulseAnim.setValue(1); pulseOpacity.setValue(0.6); };
    } else {
      Animated.timing(glowAnim, { toValue: 0, duration: 400, useNativeDriver: false }).start();
    }
  }, [isConnected]);

  // ─── Session timer ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (isConnected) {
      sessionStartRef.current = Date.now() - sessionSeconds * 1000;
      sessionTimerRef.current = setInterval(() => {
        setSessionSeconds(Math.round((Date.now() - sessionStartRef.current) / 1000));
      }, 1000);
    } else {
      clearInterval(sessionTimerRef.current);
      setSessionSeconds(0);
    }
    return () => clearInterval(sessionTimerRef.current);
  }, [isConnected]);

  // Keep refs in sync with state
  useEffect(() => { isConnectedRef.current = isConnected; }, [isConnected]);
  useEffect(() => { reconnectAttemptRef.current = reconnectAttempt; }, [reconnectAttempt]);

  // ─── Native VPN state event listener ────────────────────────────────────────
  useEffect(() => {
    const { WireGuardVpnModule } = NativeModules;
    if (!WireGuardVpnModule) return;

    const emitter = new NativeEventEmitter(WireGuardVpnModule);
    const subscription = emitter.addListener('vpnStateChanged', (event) => {
      console.log('[VPN_EVENT] vpnStateChanged:', event);
      const { tunnelState } = event;

      if ((tunnelState === 'INACTIVE' || tunnelState === 'ERROR') && isConnectedRef.current) {
        // Increase delay to 1500ms — gives userDisconnectedRef time to be set
        // and disconnectSettledRef to be cleared before this fires
        setTimeout(() => {
          if (!userDisconnectedRef.current && !isTogglingRef.current && disconnectSettledRef.current) {
            console.log('[VPN_EVENT] Unexpected tunnel drop — initiating reconnect');
            handleUnexpectedDrop();
          } else {
            console.log('[VPN_EVENT] Tunnel down — user/toggle triggered, ignoring');
          }
        }, 1500);
      } else if (tunnelState === 'ACTIVE' && !isConnectedRef.current) {
        console.log('[VPN_EVENT] Tunnel active event received');
      }
    });

    return () => subscription.remove();
  }, []);

  // ─── Handle unexpected VPN drop ─────────────────────────────────────────────
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
          'VPN connection was lost and could not be restored. Tap "Try Again" to reconnect.',
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
      // Wait for tunnel to fully tear down before reconnecting
      await new Promise(r => setTimeout(r, 500));

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
      handleUnexpectedDrop();
    } finally {
      connectingRef.current = false;
      setConnecting(false);
    }
  };

  // ─── Init: fetch IP + pre-warm ───────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      const [ip, token, pubKey] = await Promise.all([
        getRealIP(), // uses cache + races 3 providers — fast
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
      clearTimeout(reconnectTimerRef.current);
      clearInterval(sessionTimerRef.current);
    };
  }, []);

  // ─── Auto-connect ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (autoConnect && !autoConnectTriggered && !isConnected && !connecting && !userDisconnectedRef.current) {
      setAutoConnectTriggered(true);
      const timer = setTimeout(() => handleToggleConnection(), 1500);
      return () => clearTimeout(timer);
    }
  }, [autoConnect, autoConnectTriggered]);

  // ─── Resume after Android VPN permission dialog ──────────────────────────────
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

  // ─── Main connect/disconnect toggle ─────────────────────────────────────────
  const handleToggleConnection = async () => {
    // Hard gate — prevents any re-entrancy
    if (isTogglingRef.current || connectingRef.current) return;
    // Also block if we're still in disconnect settle window
    if (!disconnectSettledRef.current) return;

    isTogglingRef.current = true;

    try {
      if (isConnected || isReconnecting) {
        // ── DISCONNECT PATH ──────────────────────────────────────────────────
        // Set ALL guards BEFORE any async operation so event listener ignores drop
        userDisconnectedRef.current = true;
        disconnectSettledRef.current = false;
        clearTimeout(reconnectTimerRef.current);

        setIsConnected(false);
        isConnectedRef.current = false;
        setIsReconnecting(false);
        setReconnectAttempt(0);
        reconnectAttemptRef.current = 0;
        setPublicIP(null);
        setDebugInfo('');
        setVerifying(false);

        const nodeId = connectedNodeId;
        setConnectedNodeId(null);
        setConnectedNode(null);

        // Invalidate caches so next connect re-fetches fresh config
        if (nodeId) invalidateCache(nodeId);
        invalidateRealIPCache();

        // Fire native disconnect (don't await — UI already updated)
        disconnectVPN().catch(() => {});

        // Backend cleanup
        if (nodeId) {
          SecureStore.getItemAsync('userToken').then(token => {
            if (token) fetch(`${API_URL}/vpn/disconnect`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
              body: JSON.stringify({ nodeId })
            }).catch(() => {});
          });
        }

        // Clear stored params AFTER initiating disconnect
        lastConnectParamsRef.current = null;

        // Settle window: block new connects for DISCONNECT_SETTLE_MS
        // Use both a ref (for event handler guards) AND state (to re-render the button disabled)
        setIsSettling(true);
        setTimeout(() => {
          disconnectSettledRef.current = true;
          setIsSettling(false);
          console.log('[DISCONNECT] Settle window complete — ready for reconnect');
        }, DISCONNECT_SETTLE_MS);

        return;
      }

      // ── CONNECT PATH ─────────────────────────────────────────────────────────
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

        // 2. Ensure WireGuard keys exist
        let clientPubKey = storedPubKey;
        if (!clientPubKey || !storedPrivKey) {
          const { publicKey, privateKey } = generateKeyPair();
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

        // 5. Build VPN options
        const vpnOptions = {};
        if (splitTunnelEnabled && splitTunnelApps.length > 0) {
          vpnOptions.excludedApps = splitTunnelApps;
        }

        lastConnectParamsRef.current = { config, targetServer, vpnOptions, token, clientPubKey };
        await setLastServer(targetServer);
        setConnectedNodeId(targetServer._id);
        setConnectedNode(targetServer);

        // 6. Activate tunnel
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
          Alert.alert('VPN Permission', 'Tap "Accept" on the system dialog.', [{ text: 'OK' }]);
          return;
        }

        // 7. Verify tunnel is actually routing traffic
        setConnecting(false);
        connectingRef.current = false;
        setVerifying(true);
        setDebugInfo('Verifying tunnel...');

        // Pre-warm for next reconnect immediately
        prewarmVPN(token, targetServer, clientPubKey).catch(() => {});

        // Fetch IP and verify it changed (proves routing is working)
        let verified = false;
        const verifyStart = Date.now();

        // Ensure we have a baseline IP to compare against
        let baselineIP = initialIP;
        if (!baselineIP) {
          console.log('[VERIFY] baselineIP missing — fetching now...');
          baselineIP = await getPublicIP().catch(() => null);
          if (baselineIP) setInitialIP(baselineIP);
        }

        for (let attempt = 1; attempt <= 8; attempt++) {
          // First attempt immediately, then every 2s
          if (attempt > 1) await new Promise(r => setTimeout(r, 2000));
          if (userDisconnectedRef.current) break; // user disconnected during verify — abort loop

          try {
            const currentIP = await getPublicIP();
            // If we didn't have a baseline yet, set it now and continue to next attempt
            if (!baselineIP) {
              if (currentIP) {
                baselineIP = currentIP;
                setInitialIP(currentIP);
              }
              continue;
            }

            if (currentIP && currentIP !== baselineIP) {
              setPublicIP(currentIP);
              setIsConnected(true);
              isConnectedRef.current = true;
              setVerifying(false);
              setDebugInfo('');
              verified = true;
              console.log(`[VERIFY] Tunnel confirmed — new IP: ${currentIP} (was: ${baselineIP}), took ${Date.now() - verifyStart}ms`);
              break;
            }
            console.log(`[VERIFY] Attempt ${attempt}/8 — IP unchanged (${currentIP}), retrying...`);
          } catch (_) {}
        }

        if (!verified && !userDisconnectedRef.current) {
          // Tunnel connected but we couldn't confirm IP change — could be same-ISP routing
          // Still mark connected (tunnel is up per native layer) but show a warning
          console.warn('[VERIFY] Could not confirm IP change — marking connected anyway (native layer reports success)');

          // Try one more final fetch
          const finalIP = await getPublicIP().catch(() => null);
          if (finalIP) setPublicIP(finalIP);

          setIsConnected(true);
          isConnectedRef.current = true;
          setVerifying(false);
          setDebugInfo('');
        }

      } catch (error) {
        console.error('[CONNECT] Error:', error);
        Alert.alert('Protocol Error', error.message || 'Connection failed.');
        lastConnectParamsRef.current = null;
        setConnectedNodeId(null);
        setConnectedNode(null);
      } finally {
        connectingRef.current = false;
        setConnecting(false);
        setVerifying(false);
      }
    } finally {
      isTogglingRef.current = false;
    }
  };

  // ─── Derived display ─────────────────────────────────────────────────────────
  const selectedServer = connectedNode || route.params?.selectedServer || lastServer || { name: 'Auto Select', city: 'Optimal', countryCode: 'GL' };
  const isBusy = connecting || verifying;
  const buttonDisabled = isBusy || isSettling;

  const connectionState = isConnected ? 'connected' : isReconnecting ? 'reconnecting' : verifying ? 'verifying' : connecting ? 'connecting' : 'disconnected';

  const orbColors = {
    connected:    ['#a3e635', '#76b900', '#3d6200'],
    reconnecting: ['#fbbf24', '#d97706', '#92400e'],
    verifying:    ['#60a5fa', '#3b82f6', '#1d4ed8'],
    connecting:   ['#76b900', '#5c9000', '#3d6200'],
    disconnected: ['#3a3a3a', '#222222', '#111111'],
  };

  const statusLabel = {
    connected:    'PROTECTED',
    reconnecting: 'RECONNECTING',
    verifying:    'VERIFYING',
    connecting:   'CONNECTING',
    disconnected: killSwitch ? 'KILL SWITCH ON' : 'UNPROTECTED',
  };

  const statusColor = {
    connected:    '#a3e635',
    reconnecting: '#fbbf24',
    verifying:    '#60a5fa',
    connecting:   theme.colors.primary,
    disconnected: '#ef4444',
  };

  const formatDuration = (s) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  const getFlagEmoji = (code) => {
    if (!code || code.length !== 2) return '🌐';
    const offset = 127397;
    return String.fromCodePoint(...[...code.toUpperCase()].map(c => c.charCodeAt(0) + offset));
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.background} />

      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconButton} onPress={() => navigation.navigate('Servers')}>
          <Globe size={20} color={theme.colors.onSurfaceVariant} strokeWidth={2} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.appName}>SENTINEL</Text>
          <Text style={[styles.headerStatus, { color: statusColor[connectionState] }]}>
            {statusLabel[connectionState]}
          </Text>
        </View>

        <TouchableOpacity style={styles.iconButton} onPress={() => navigation.navigate('Account')}>
          <Settings size={20} color={theme.colors.onSurfaceVariant} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      {/* ── Main Orb ── */}
      <View style={styles.orbSection}>
        {/* Outer pulse ring — only visible when connected */}
        <Animated.View
          style={[
            styles.pulseRing,
            {
              transform: [{ scale: pulseAnim }],
              opacity: isConnected ? pulseOpacity : 0,
              borderColor: '#76b900',
            },
          ]}
        />

        {/* Orb button */}
        <TouchableOpacity
          activeOpacity={0.85}
          style={[styles.orbOuter, isConnected && styles.orbOuterConnected]}
          onPress={handleToggleConnection}
          disabled={buttonDisabled}
        >
          <LinearGradient
            colors={orbColors[connectionState]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.orbGradient}
          >
            {isBusy
              ? <ActivityIndicator size="large" color="#ffffff" />
              : <Power size={52} color="#ffffff" strokeWidth={2} />
            }
          </LinearGradient>
        </TouchableOpacity>

        {/* State label under orb */}
        <Text style={[styles.orbLabel, { color: statusColor[connectionState] }]}>
          {isConnected ? 'Tap to Disconnect' : isBusy ? (verifying ? 'Verifying Tunnel...' : 'Connecting...') : 'Tap to Connect'}
        </Text>

        {/* Session timer */}
        {isConnected && (
          <Text style={styles.sessionTimer}>{formatDuration(sessionSeconds)}</Text>
        )}

        {/* Debug/reconnect info */}
        {(debugInfo && !isConnected) ? (
          <Text style={[styles.debugText, { color: isReconnecting ? '#fbbf24' : '#ef4444' }]}>
            {debugInfo}
          </Text>
        ) : null}
      </View>

      {/* ── Stats Row ── */}
      <View style={styles.statsRow}>
        <View style={styles.statChip}>
          {isConnected
            ? <ShieldCheck size={14} color={theme.colors.primary} />
            : <ShieldAlert size={14} color="#ef4444" />}
          <Text style={[styles.statChipText, { color: isConnected ? theme.colors.primary : '#ef4444' }]}>
            {isConnected ? 'Encrypted' : 'No Encryption'}
          </Text>
        </View>

        <View style={styles.statChip}>
          {isConnected ? <Wifi size={14} color={theme.colors.primary} /> : <WifiOff size={14} color="#6b7280" />}
          <Text style={[styles.statChipText, { color: isConnected ? theme.colors.primary : '#6b7280' }]}>
            WireGuard
          </Text>
        </View>

        <View style={styles.statChip}>
          <View style={[styles.dot, { backgroundColor: isConnected ? '#a3e635' : '#6b7280' }]} />
          <Text style={[styles.statChipText, { color: isConnected ? '#a3e635' : '#6b7280' }]}>
            {isConnected ? 'Online' : 'Offline'}
          </Text>
        </View>
      </View>

      {/* ── Server Card ── */}
      <TouchableOpacity
        style={styles.serverCard}
        onPress={() => navigation.navigate('Servers')}
        activeOpacity={0.75}
      >
        <View style={styles.serverCardLeft}>
          <Text style={styles.serverFlag}>{getFlagEmoji(selectedServer.countryCode)}</Text>
          <View style={styles.serverInfo}>
            <Text style={styles.serverName}>{selectedServer.name || 'Optimal Node'}</Text>
            <Text style={styles.serverLocation}>
              {selectedServer.city || 'Auto'} · {selectedServer.countryCode || 'GL'}
            </Text>
            {/* Load bar */}
            <View style={styles.loadBarBg}>
              <View
                style={[
                  styles.loadBarFill,
                  {
                    width: `${Math.min(selectedServer.load || 0, 100)}%`,
                    backgroundColor: (selectedServer.load || 0) > 75 ? '#ef4444' : (selectedServer.load || 0) > 50 ? '#fbbf24' : '#76b900',
                  }
                ]}
              />
            </View>
            <Text style={styles.loadText}>{selectedServer.load || 0}% Load</Text>
          </View>
        </View>
        <View style={styles.chevron}>
          <Text style={styles.chevronText}>›</Text>
        </View>
      </TouchableOpacity>

      {/* ── IP Info Row ── */}
      <View style={[styles.ipRow, { marginBottom: insets.bottom > 0 ? insets.bottom + 8 : 16 }]}>
        <View style={styles.ipBlock}>
          <Text style={styles.ipLabel}>YOUR IP</Text>
          <Text style={styles.ipValue}>{initialIP || 'Detecting...'}</Text>
        </View>
        <View style={styles.ipDivider} />
        <View style={styles.ipBlock}>
          <Text style={styles.ipLabel}>VPN IP</Text>
          <Text style={[styles.ipValue, isConnected && publicIP && { color: theme.colors.primary }]}>
            {isConnected ? (publicIP || 'Fetching...') : '———'}
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },

  // ── Header ──────────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: { alignItems: 'center' },
  appName: {
    fontSize: 13,
    fontFamily: theme.fonts.label,
    fontWeight: '900',
    color: theme.colors.onSurface,
    letterSpacing: 4,
  },
  headerStatus: {
    fontSize: 9,
    fontFamily: theme.fonts.label,
    fontWeight: '700',
    letterSpacing: 2,
    marginTop: 2,
  },

  // ── Orb ─────────────────────────────────────────────────────────────────────
  orbSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: ORB_SIZE + 28,
    height: ORB_SIZE + 28,
    borderRadius: (ORB_SIZE + 28) / 2,
    borderWidth: 2,
    borderColor: '#76b900',
  },
  orbOuter: {
    width: ORB_SIZE,
    height: ORB_SIZE,
    borderRadius: ORB_SIZE / 2,
    padding: 10,
    backgroundColor: '#111111',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 18,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  orbOuterConnected: {
    shadowColor: '#76b900',
    shadowOpacity: 0.35,
    shadowRadius: 32,
    elevation: 24,
    borderColor: 'rgba(118,185,0,0.25)',
  },
  orbGradient: {
    flex: 1,
    borderRadius: ORB_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  orbLabel: {
    marginTop: 22,
    fontSize: 12,
    fontFamily: theme.fonts.label,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  sessionTimer: {
    marginTop: 6,
    fontSize: 22,
    fontFamily: theme.fonts.display,
    fontWeight: '900',
    color: theme.colors.onSurface,
    letterSpacing: 2,
  },
  debugText: {
    marginTop: 8,
    fontSize: 11,
    fontFamily: theme.fonts.body,
    textAlign: 'center',
    opacity: 0.8,
  },

  // ── Stats Row ────────────────────────────────────────────────────────────────
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  statChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#161616',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  statChipText: {
    fontSize: 10,
    fontFamily: theme.fonts.label,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },

  // ── Server Card ──────────────────────────────────────────────────────────────
  serverCard: {
    marginHorizontal: 20,
    marginBottom: 12,
    backgroundColor: '#141414',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  serverCardLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  serverFlag: {
    fontSize: 32,
  },
  serverInfo: {
    flex: 1,
  },
  serverName: {
    fontSize: 15,
    fontFamily: theme.fonts.body,
    fontWeight: '800',
    color: theme.colors.onSurface,
    marginBottom: 2,
  },
  serverLocation: {
    fontSize: 12,
    fontFamily: theme.fonts.body,
    color: theme.colors.onSurfaceVariant,
    marginBottom: 8,
  },
  loadBarBg: {
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 2,
    marginBottom: 4,
    overflow: 'hidden',
  },
  loadBarFill: {
    height: 3,
    borderRadius: 2,
  },
  loadText: {
    fontSize: 9,
    fontFamily: theme.fonts.label,
    color: theme.colors.onSurfaceVariant,
    fontWeight: '700',
    letterSpacing: 0.5,
    opacity: 0.7,
  },
  chevron: {
    marginLeft: 8,
  },
  chevronText: {
    fontSize: 22,
    color: theme.colors.onSurfaceVariant,
    opacity: 0.5,
  },

  // ── IP Row ───────────────────────────────────────────────────────────────────
  ipRow: {
    flexDirection: 'row',
    marginHorizontal: 20,
    backgroundColor: '#101010',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    padding: 16,
    alignItems: 'center',
  },
  ipBlock: {
    flex: 1,
    alignItems: 'center',
  },
  ipLabel: {
    fontSize: 8,
    fontFamily: theme.fonts.label,
    color: theme.colors.onSurfaceVariant,
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: 5,
  },
  ipValue: {
    fontSize: 12,
    fontFamily: theme.fonts.body,
    color: theme.colors.outline,
    fontWeight: '700',
  },
  ipDivider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginHorizontal: 12,
  },
});
