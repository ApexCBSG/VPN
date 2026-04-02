import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  StatusBar, 
  Dimensions, 
  ActivityIndicator, 
  Alert 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../styles/theme';
import { Settings, Globe, Power, ShieldCheck, ShieldAlert } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as SecureStore from 'expo-secure-store';
import { generateKeyPair } from '../utils/wireguard';
import { API_URL } from '../config';
import { getPublicIP } from '../utils/network';

const { width } = Dimensions.get('window');

export default function DashboardScreen({ navigation, route }) {
  const [isConnected, setIsConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [initialIP, setInitialIP] = useState(null);
  const [publicIP, setPublicIP] = useState(null);

  useEffect(() => {
    const fetchInitial = async () => {
        const ip = await getPublicIP();
        setInitialIP(ip || 'VPN Gateway');
    };
    fetchInitial();
  }, []);

  const selectedServer = route.params?.selectedServer || { 
    name: 'Auto Selection', 
    city: 'Optimal Node', 
    countryCode: 'US' 
  };

  const handleToggleConnection = async () => {
    if (isConnected) {
      setIsConnected(false);
      setIsVerified(false);
      setPublicIP(null);
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

      // 1. Auto-select server if none is selected
      let targetServer = selectedServer;
      if (!targetServer._id) {
        try {
          const nodeRes = await fetch(`${API_URL}/nodes`);
          const nodes = await nodeRes.json();
          if (nodeRes.ok && nodes.length > 0) {
            targetServer = nodes[0];
          } else {
            Alert.alert('Network Error', 'No active VPN servers found.');
            return;
          }
        } catch (nodeErr) {
          Alert.alert('Network Error', 'Could not reach server registry.');
          return;
        }
      }

      // 2. Generate/Get WireGuard Keys
      let clientPubKey = await SecureStore.getItemAsync('wg_public_key');
      if (!clientPubKey) {
        const { publicKey, privateKey } = generateKeyPair();
        await SecureStore.setItemAsync('wg_public_key', publicKey);
        await SecureStore.setItemAsync('wg_private_key', privateKey);
        clientPubKey = publicKey;
      }

      // 3. Handshake with Sentinel Node
      const response = await fetch(`${API_URL}/vpn/connect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token
        },
        body: JSON.stringify({
          nodeId: targetServer._id,
          publicKey: clientPubKey
        })
      });

      const data = await response.json();
      if (response.ok) {
        setIsConnected(true);
        
        // 4. REAL-TIME NETWORK AUDIT (Proof-of-Life)
        const myIP = await getPublicIP();
        setPublicIP(myIP);
        
        if (myIP === targetServer.ipAddress) {
           setIsVerified(true);
        } else {
           console.log('[NETWORK] Handshake verified. Current IP:', myIP);
           setIsVerified(false); 
        }
      } else {
        Alert.alert('Handshake Error', data.msg || 'Server busy.');
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Network Error', 'Handshake failed.');
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
             <Text style={styles.headerTitle}>SENTINEL NODE</Text>
             <Text style={[styles.headerStatus, isConnected && { color: isVerified ? theme.colors.primary : '#ffb300' }]}>
                {isConnected ? (isVerified ? 'VERIFIED TUNNEL' : 'HANDSHAKE OK') : 'PROTECTION OFF'}
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
                {isConnected ? (isVerified ? 'ENCRYPTED' : 'OS BRIDGE REQUIRED') : 'UNSECURED'}
            </Text>
          </View>
          <Text style={styles.displayStatus}>
            {isConnected ? 'Active' : 'Standby'}
          </Text>
          {isConnected && !isVerified && (
             <Text style={styles.bridgeInfo}>Protocol handshake successful. Local tunnel pending.</Text>
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
               <Text style={styles.buttonLabel}>{isConnected ? 'DISCONNECT' : 'INITIALIZE'}</Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <BlurView intensity={30} tint="dark" style={styles.glassPanel}>
          <TouchableOpacity 
            style={styles.statItem}
            onPress={() => navigation.navigate('Servers')}
          >
            <Text style={styles.statLabel}>NODE ARCHITECTURE</Text>
            <View style={styles.statValueContainer}>
              <Text style={styles.statValue}>{selectedServer.name || 'Optimal Route'}</Text>
              <Text style={styles.statSubValue}>{selectedServer.city || 'Searching...'}, {selectedServer.countryCode || 'Global'}</Text>
            </View>
          </TouchableOpacity>
          
          <View style={styles.divider} />

          <View style={styles.statItem}>
            <Text style={styles.statLabel}>CORE PROTOCOL</Text>
            <View style={styles.statValueContainer}>
              <Text style={styles.statValue}>WireGuard®</Text>
              <Text style={styles.statSubValue}>{isConnected ? 'UDP Encrypted' : 'Standby Mode'}</Text>
            </View>
          </View>
        </BlurView>
        
        <View style={styles.ipContainer}>
           <View style={styles.ipSection}>
              <Text style={styles.ipLabel}>ORIGINAL IP</Text>
              <Text style={styles.ipValue}>{initialIP || 'Checking...'}</Text>
           </View>
           <View style={styles.ipDivider} />
           <View style={styles.ipSection}>
              <Text style={styles.ipLabel}>SENTINEL IP</Text>
              <Text style={[styles.ipValue, isVerified && { color: theme.colors.primary }]}>
                {isConnected ? (publicIP || 'Handshaking...') : '---.---.---.---'}
              </Text>
           </View>
        </View>
        <Text style={styles.footerBranding}>TUNNEL ARCHITECTURE v4.2.0-STABLE</Text>
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
    marginBottom: 40,
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
    fontSize: 52, 
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
    width: width * 0.65,
    height: width * 0.65,
    borderRadius: width * 0.325,
    padding: 12,
    backgroundColor: theme.colors.surfaceContainerHigh,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 40,
    elevation: 25,
  },
  pulseContainer: {
    flex: 1,
    borderRadius: width * 0.325,
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
    paddingBottom: 40,
  },
  glassPanel: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 24,
    padding: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    marginBottom: 20,
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
    marginBottom: 10,
  },
  statValue: {
    fontSize: 15,
    fontFamily: theme.fonts.body,
    color: theme.colors.onSurface,
    fontWeight: '800',
  },
  statSubValue: {
    fontSize: 11,
    fontFamily: theme.fonts.body,
    color: theme.colors.onSurfaceVariant,
    marginTop: 3,
  },
  divider: {
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginHorizontal: 20,
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
