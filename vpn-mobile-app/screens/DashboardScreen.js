import React, { useState, useEffect } from 'react';
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
import { runVPNDiagnostics } from '../utils/vpnDiagnostics';

import { connectVPN, disconnectVPN } from '../utils/vpnBridge';
import { useVPNSettings } from '../context/VPNSettingsContext';

const { width } = Dimensions.get('window');

export default function DashboardScreen({ navigation, route }) {
  const { autoConnect, splitTunnelEnabled, splitTunnelApps, setLastServer, lastServer } = useVPNSettings();

  const [isConnected, setIsConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [autoConnectTriggered, setAutoConnectTriggered] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [initialIP, setInitialIP] = useState(null);
  const [publicIP, setPublicIP] = useState(null);
  const [pendingConnection, setPendingConnection] = useState(null);
  const [debugInfo, setDebugInfo] = useState('');

  useEffect(() => {
    const fetchInitial = async () => {
        const ip = await getPublicIP();
        setInitialIP(ip || 'VPN Gateway');
    };
    fetchInitial();
  }, []);

  // Auto-connect on app launch if enabled and not already triggered
  useEffect(() => {
    if (autoConnect && !autoConnectTriggered && !isConnected && !connecting) {
      console.log('[AUTO-CONNECT] Auto-connect enabled, triggering connection...');
      setAutoConnectTriggered(true);
      // Small delay to let the screen fully mount and IP fetch complete
      const timer = setTimeout(() => {
        handleToggleConnection();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [autoConnect, autoConnectTriggered]);

  // Handle app returning from foreground (after user grants VPN permission)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [pendingConnection]);

  const handleAppStateChange = async (state) => {
    if (state === 'active' && pendingConnection) {
      console.log('[AppState] App returned to foreground with pending VPN connection');
      setPendingConnection(null);
      // Auto-retry connection
      await new Promise(r => setTimeout(r, 500)); // Small delay
      await handleToggleConnection();
    }
  };
  useEffect(() => {
    let interval;
    if (isConnected && !isVerified) {
      interval = setInterval(async () => {
        const currentIP = await getPublicIP();
        if (currentIP && (currentIP !== initialIP || currentIP === selectedServer?.ipAddress)) {
          console.log('[HEARTBEAT] Tunnel Verified via IP Shift:', currentIP);
          setPublicIP(currentIP);
          setIsVerified(true);
          setDebugInfo('');
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isConnected, isVerified, initialIP]);

  const selectedServer = route.params?.selectedServer || { 
    name: 'Auto Selection', 
    city: 'Optimal Node', 
    countryCode: 'US' 
  };

  const handleToggleConnection = async () => {
    if (isConnected) {
      await disconnectVPN().catch(() => {});
      setIsConnected(false);
      setIsVerified(false);
      setPublicIP(null);
      setDebugInfo('');
      return;
    }

    setConnecting(true);
    try {
      const token = await SecureStore.getItemAsync('userToken');
      if (!token) {
        Alert.alert('Auth Error', 'Please log in again.');
        navigation.navigate('Login');
        return;
      }

      // 0. Kill any stale VPN tunnel and re-capture the real IP
      await disconnectVPN().catch(() => {});
      await new Promise(r => setTimeout(r, 1000));
      const freshIP = await getPublicIP();
      if (freshIP && freshIP !== initialIP) {
        console.log('[CONNECT] Re-captured real IP after stale tunnel cleanup:', freshIP);
        setInitialIP(freshIP);
      }
      const baseIP = freshIP || initialIP;

      // 1. Auto-select server: route param > last server > first available
      let targetServer = selectedServer;
      if (!targetServer._id) {
        // Try last used server first (auto-connect convenience)
        if (lastServer?._id) {
          targetServer = lastServer;
          console.log('[CONNECT] Using last server:', lastServer.name);
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

      // 2. Persistent Security Keys (Handshake Stabilization)
      let clientPubKey = await SecureStore.getItemAsync('wg_public_key');
      let clientPrivKey = await SecureStore.getItemAsync('wg_private_key');

      if (!clientPubKey || !clientPrivKey) {
        const { publicKey, privateKey } = generateKeyPair();
        await SecureStore.setItemAsync('wg_public_key', publicKey);
        await SecureStore.setItemAsync('wg_private_key', privateKey);
        clientPubKey = publicKey;
        console.log('[SECURITY] Generated New Persistent Keys:', clientPubKey);
      }

      // 3. Handshake with Sentinel Node
      const response = await fetch(`${API_URL}/vpn/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
        body: JSON.stringify({ nodeId: targetServer._id, publicKey: clientPubKey })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.msg || 'Handshake failed.');

      // 4. ACTIVATE NATIVE TUNNEL - pass split tunneling options
      // Save server for auto-connect next time
      await setLastServer(targetServer);

      let vpnResult;
      try {
        console.log('[DASHBOARD] Activating native VPN tunnel...');

        // Build split tunneling options
        const vpnOptions = {};
        if (splitTunnelEnabled && splitTunnelApps.length > 0) {
          vpnOptions.excludedApps = splitTunnelApps;
          console.log('[DASHBOARD] Split tunnel active, excluding:', splitTunnelApps);
        }

        // Add timeout in case native module hangs
        const vpnPromise = connectVPN(data.config, vpnOptions);
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('VPN tunnel activation timeout (30s)')), 30000)
        );
        
        vpnResult = await Promise.race([vpnPromise, timeoutPromise]);
        
        if (vpnResult === 'PERMISSION_PENDING') {
          console.log('[VPN] Waiting for Android VPN permission dialog...');
          setPendingConnection(data.config);
          Alert.alert(
            'VPN Permission',
            'Android is requesting permission to create a local VPN tunnel.\n\nTap "Accept" on the system dialog that appears next.',
            [{ text: 'OK' }]
          );
          setConnecting(false);
          return;
        }
        
        console.log('[DASHBOARD] ✅ VPN tunnel result:', vpnResult);
      } catch (nativeErr) {
        console.error('[Native] VPN Activation Error:', nativeErr.message || nativeErr);
        setDebugInfo(`Tunnel Error: ${nativeErr.message || 'Unknown'}`);
        Alert.alert(
          'Connection Failed', 
          'Failed to activate VPN tunnel:\n\n' + (nativeErr.message || 'Unknown error') +
          '\n\nMake sure:\n- Android VPN permission is granted\n- App has required permissions\n- Try again.',
          [{ text: 'OK' }]
        );
        setConnecting(false);
        return;
      }

      // ✅ ONLY mark as connected AFTER successful tunnel activation
      setIsConnected(true);
      
      // 5. REAL-TIME NETWORK AUDIT (Proof-of-Life)
      console.log('[DASHBOARD] Waiting 1 second for tunnel to stabilize...');
      await new Promise(r => setTimeout(r, 1000));
      
      console.log('[DASHBOARD] Fetching current public IP...');
      const myIP = await getPublicIP();
      
      if (!myIP) {
        console.warn('[NETWORK] ⚠️ Could not fetch public IP (network unreachable?)');
        setDebugInfo('Network unreachable - tunnel may not be active');
        setPublicIP('Unknown');
        setIsVerified(false);
      } else {
        setPublicIP(myIP);
        console.log('[NETWORK] Current IP:', myIP, 'Base IP:', baseIP, 'Server IP:', targetServer.ipAddress);

        if (myIP !== baseIP) {
          console.log('[NETWORK] ✅ IP changed from', baseIP, 'to', myIP, '- Tunnel verified!');
          setIsVerified(true);
          setDebugInfo('');
        } else {
          if (myIP === targetServer.ipAddress) {
            console.log('[NETWORK] ✅ IP matches server IP - Tunnel is active!');
            setIsVerified(true);
            setDebugInfo('');
          } else {
            console.warn('[NETWORK] ⚠️ IP unchanged:', myIP, '(started as', baseIP, ')');
            setDebugInfo(`IP not changed. Check server or restart.`);
            setIsVerified(false);
          }
        }
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Protocol Error', error.message || 'Connection failed.');
    } finally {
      setConnecting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" />
      
      <View style={styles.header}>
        <View style={styles.topBar}>
          <TouchableOpacity 
            style={styles.iconButton}
            onPress={() => navigation.navigate('Servers')}
          >
             <Globe size={20} color={theme.colors.onSurface} strokeWidth={2.5} />
          </TouchableOpacity>

          <View style={styles.headerInfo}>
             <Text style={styles.headerTitle}>VPN DASHBOARD</Text>
             <Text style={[styles.headerStatus, isConnected && { color: isVerified ? theme.colors.primary : '#ffb300' }]}>
                {isConnected ? (isVerified ? 'CONNECTION ACTIVE' : 'ESTABLISHING...') : 'NETWORK DISCONNECTED'}
             </Text>
          </View>

          <TouchableOpacity 
            style={styles.iconButton}
            onPress={() => navigation.navigate('Account')}
          >
             <Settings size={20} color={theme.colors.onSurface} strokeWidth={2.5} />
          </TouchableOpacity>
        </View>

        <View style={styles.statusContainer}>
          <View style={[
            styles.statusChip, 
            { backgroundColor: isConnected ? (isVerified ? theme.colors.primary : 'rgba(255, 179, 0, 0.15)') : 'rgba(255, 113, 108, 0.1)' }
          ]}>
             {isConnected ? (
                isVerified ? <ShieldCheck size={12} color={theme.colors.background} /> : <ShieldAlert size={12} color="#ffb300" />
             ) : <ShieldAlert size={12} color={theme.colors.error} />}
            <Text style={[
                styles.statusChipText, 
                isConnected ? (isVerified ? {color: theme.colors.background} : {color: '#ffb300'}) : {color: theme.colors.error}
            ]}>
                {isConnected ? (isVerified ? 'SECURED' : 'TUNNEL STATUS: PENDING') : 'NOT PROTECTED'}
            </Text>
          </View>
          <Text style={styles.displayStatus}>
            {isConnected ? 'Connected' : 'Disconnected'}
          </Text>
          {isConnected && !isVerified && (
             <Text style={styles.bridgeInfo}>Negotiating connection with secure gateway...</Text>
          )}
          {debugInfo && (
             <Text style={[styles.bridgeInfo, { color: '#ff6b6b', marginTop: 12 }]}>DEBUG: {debugInfo}</Text>
          )}
        </View>
      </View>

      <View style={styles.main}>
        <TouchableOpacity 
          activeOpacity={0.8} 
          style={[
            styles.connectOuter, 
            isConnected && { shadowColor: isVerified ? theme.colors.primary : '#ffb300', shadowOpacity: 0.3 }
          ]}
          onPress={handleToggleConnection}
          disabled={connecting}
        >
          <LinearGradient
            colors={isConnected ? (isVerified ? ['#81ecff', '#004c5a'] : ['#ffb300', '#4a3a00']) : theme.colors.linearGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.pulseContainer}
          >
            <View style={styles.buttonBody}>
               {connecting ? (
                 <ActivityIndicator size="large" color={theme.colors.background} />
               ) : (
                 <Power size={50} color={theme.colors.background} strokeWidth={2.5} />
               )}
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
              <Text style={[styles.ipValue, isVerified && { color: theme.colors.primary }]}>
                {isConnected ? (publicIP || 'Negotiating...') : '---.---.---.---'}
              </Text>
           </View>
        </View>
        <Text style={styles.footerBranding}>SECURE TUNNEL NETWORK ACCESS</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerInfo: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 10,
    fontFamily: theme.fonts.label,
    color: theme.colors.onSurfaceVariant,
    fontWeight: '900',
    letterSpacing: 2,
  },
  headerStatus: {
    fontSize: 10,
    fontFamily: theme.fonts.label,
    color: theme.colors.outline,
    fontWeight: '900',
    marginTop: 2,
    letterSpacing: 1,
  },
  iconButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: theme.colors.surfaceContainerHigh,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.outlineVariant,
  },
  statusContainer: {
    alignItems: 'center',
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 12,
    gap: 6,
  },
  statusChipText: {
    fontSize: 9,
    fontFamily: theme.fonts.label,
    fontWeight: '900',
    letterSpacing: 1,
  },
  displayStatus: {
    fontSize: 38,
    fontFamily: theme.fonts.display,
    color: theme.colors.onBackground,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: -1,
  },
  bridgeInfo: {
    fontSize: 11,
    color: '#ffb300',
    fontFamily: theme.fonts.body,
    marginTop: 8,
    textAlign: 'center',
    opacity: 0.8,
  },
  main: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  connectOuter: {
    width: width * 0.52,
    height: width * 0.52,
    borderRadius: width * 0.26,
    padding: 10,
    backgroundColor: theme.colors.surfaceContainerHigh,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 30,
    elevation: 20,
  },
  pulseContainer: {
    flex: 1,
    borderRadius: width * 0.26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonBody: {
    alignItems: 'center',
  },
  buttonLabel: {
    color: theme.colors.background,
    fontSize: 12,
    fontFamily: theme.fonts.label,
    fontWeight: '900',
    letterSpacing: 3,
    marginTop: 15,
  },
  footer: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: 100,
  },
  glassPanel: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 18,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    marginBottom: 14,
  },
  statItem: {
    flex: 1,
  },
  statLabel: {
    fontSize: 9,
    fontFamily: theme.fonts.label,
    color: theme.colors.onSurfaceVariant,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 5,
  },
  statValue: {
    fontSize: 14,
    fontFamily: theme.fonts.body,
    color: theme.colors.onSurface,
    fontWeight: '800',
  },
  statSubValue: {
    fontSize: 11,
    fontFamily: theme.fonts.body,
    color: theme.colors.onSurfaceVariant,
    marginTop: 2,
  },
  changeServerHint: {
    fontSize: 8,
    fontFamily: theme.fonts.label,
    color: theme.colors.primary,
    fontWeight: '900',
    letterSpacing: 1,
    opacity: 0.7,
  },
  ipContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 16,
    padding: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.03)',
  },
  ipSection: {
    flex: 1,
    alignItems: 'center',
  },
  ipLabel: {
    fontSize: 8,
    fontFamily: theme.fonts.label,
    color: theme.colors.onSurfaceVariant,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  ipValue: {
    fontSize: 11,
    fontFamily: theme.fonts.body,
    color: theme.colors.outline,
    fontWeight: '700',
  },
  ipDivider: {
    width: 1,
    height: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginHorizontal: 10,
  },
  footerBranding: {
    textAlign: 'center',
    marginTop: 15,
    fontSize: 8,
    fontFamily: theme.fonts.label,
    color: theme.colors.onSurfaceVariant,
    letterSpacing: 2,
    opacity: 0.5,
  }
});
