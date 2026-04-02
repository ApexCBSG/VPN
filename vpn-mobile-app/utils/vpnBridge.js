import WireGuard from 'react-native-wireguard-vpn';
import * as SecureStore from 'expo-secure-store';
import { Alert } from 'react-native';

/**
 * Sentinel Defensive Bridge (v1.0.15 Production)
 * 
 * Logic Update: 
 * 1. Fixed parseInt base (10).
 * 2. Implemented strict Interface CIDR validation.
 * 3. Handles '0.0.0.0/0' as a collision with the local address.
 */
export const connectVPN = async (handshakeData) => {
  try {
    console.log('[VPN_BRIDGE] INITIATING HANDSHAKE WITH DATA:', JSON.stringify(handshakeData, null, 2));

    const privateKey = await SecureStore.getItemAsync('wg_private_key');
    if (!privateKey) throw new Error('Private key missing. Please log out and back in.');

    // 1. Initialize VPN service (Triggers System VpnService Intent)
    try {
      await WireGuard.initialize();
    } catch (e) {
      if (e.code === 'VPN_PERMISSION_REQUIRED' || e.message?.includes('permission')) {
        Alert.alert(
          'Security Setup', 
          'Standard Android VPN setup required. Please tap "OK" on the system dialog to authorize the Sentinel Tunnel.'
        );
        return 'PERMISSION_PENDING';
      }
      throw e;
    }

    // 2. Parse Endpoint for Native Module
    const [serverAddress, portStr] = (handshakeData.endpoint || '').split(':');
    const serverPort = parseInt(portStr, 10) || 51820; // FIXED: Base 10

    // 3. Strict Interface IP Validation
    // This prevents the 'BackendException' by ensuring we never use 0.0.0.0/0 as a local IP.
    let localAddress = handshakeData.address;

    if (!localAddress || localAddress === '0.0.0.0/0') {
      console.warn('[VPN_BRIDGE] Invalid address from backend, using fallback.');
      localAddress = '10.64.0.2/32'; // Standard WireGuard fallback
    } else if (!localAddress.includes('/')) {
      localAddress = `${localAddress}/32`;
    }

    // 4. Construct Industrial Config (v1.0.15 Spec)
    const config = {
      privateKey: privateKey,
      publicKey: handshakeData.serverPublicKey,
      serverAddress: serverAddress,
      serverPort: serverPort,
      // SOLUTION: Local CIDR (Door) + Global Multi-Route (Road)
      allowedIPs: [localAddress, '0.0.0.0/0'], 
      dns: ['1.1.1.1', '8.8.8.8'],
      mtu: 1450,
    };

    console.log('[VPN_BRIDGE] Native Sync Payload:', JSON.stringify(config, null, 2));

    // 5. Establish Encrypted Tunnel
    await WireGuard.connect(config);
    
    return 'CONNECTED';
  } catch (error) {
    console.error('[VPN_BRIDGE] Connection failed:', error);
    throw error;
  }
};

export const disconnectVPN = async () => {
  try {
    await WireGuard.disconnect();
  } catch (error) {
    console.error('[VPN_BRIDGE] Disconnect failed:', error);
  }
};

export const getVPNStatus = async () => {
  try {
    const status = await WireGuard.getStatus();
    return status.isConnected ? 'CONNECTED' : 'DISCONNECTED';
  } catch (error) {
    return 'DISCONNECTED';
  }
};
