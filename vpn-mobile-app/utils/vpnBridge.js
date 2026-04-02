import WireGuard from 'react-native-wireguard-vpn';
import * as SecureStore from 'expo-secure-store';
import { Alert } from 'react-native';

/**
 * Sentinel Native Bridge (Industrial Grade)
 * 
 * Logic Update: Synchronized with 'WireGuardVpnModule.kt'.
 * 1. Interface IP Extraction: Internal IP MUST be in allowedIPs for the library to bind correctly.
 * 2. Permission Lifecycle: Handles system-level intent challenges.
 */
export const connectVPN = async (handshakeData) => {
  try {
    const privateKey = await SecureStore.getItemAsync('wg_private_key');
    if (!privateKey) throw new Error('Private key missing. Log out/in.');

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
    const [serverAddress, portStr] = handshakeData.endpoint.split(':');
    const serverPort = parseInt(portStr, 10) || 51820;

    // 3. Construct Industrial Config
    // NOTE: In this library, the first /32 in allowedIPs becomes the Interface Address.
    const config = {
      privateKey: privateKey,
      publicKey: handshakeData.serverPublicKey,
      serverAddress: serverAddress,
      serverPort: serverPort,
      // Internal IP + Global Route (Required for successful bridge)
      allowedIPs: [handshakeData.address, '0.0.0.0/0'], 
      dns: ['1.1.1.1', '8.8.8.8'],
      mtu: 1450,
    };

    console.log('[VPN_BRIDGE] Schema-Strict Payload:', JSON.stringify(config));

    // 4. Establish Encrypted Tunnel
    await WireGuard.connect(config);
    
    return 'CONNECTED';
  } catch (error) {
    console.error('[VPN_BRIDGE] Handshake Failure:', error);
    throw error;
  }
};

export const disconnectVPN = async () => {
  try {
    await WireGuard.disconnect();
  } catch (error) {
    console.error('[VPN_BRIDGE] Disconnect Error:', error);
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
