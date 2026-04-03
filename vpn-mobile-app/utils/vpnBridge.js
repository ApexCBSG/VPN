import WireGuard from 'react-native-wireguard-vpn';
import * as SecureStore from 'expo-secure-store';
import { Alert } from 'react-native';

/**
 * Sentinel Defensive Bridge (v4.0.0-PRO / Native Patched)
 * 
 * Logic Update: 
 * 1. Native Patch Recovery: Now handles 'VPN_PERMISSION_REQUIRED' (Injected via patch-package).
 * 2. Source-Verified Schema: Matches the exactly audited 'WireGuardVpnModule.kt' (v1.0.22).
 */
export const connectVPN = async (handshakeData) => {
  try {
    console.log('[VPN_BRIDGE] INITIATING PATCHED HANDSHAKE:', JSON.stringify(handshakeData, null, 2));

    const privateKey = await SecureStore.getItemAsync('wg_private_key');
    if (!privateKey) throw new Error('Private key missing. Please log out and back in.');

    // 1. Initial State Cleanup (Prevents "Ghost Session" hang)
    try {
      await WireGuard.disconnect();
    } catch (e) {
      // Ignore if not connected
    }
    await WireGuard.initialize();

    // 2. Parse Endpoint
    const [serverAddress, portStr] = (handshakeData.endpoint || '').split(':');
    const serverPort = parseInt(portStr, 10) || 51820;

    // 3. Interface IP Sanitization (CIDR Enforcement)
    let interfaceAddress = handshakeData.address || '10.64.0.2/32';
    if (!interfaceAddress.includes('/')) {
        interfaceAddress = `${interfaceAddress}/32`;
    }

    // 4. Construct Verified Configuration (v1.0.22 Native Spec)
    const config = {
      privateKey: privateKey,
      publicKey: handshakeData.serverPublicKey,
      
      // Native Property: 'address' (Singular, String)
      address: interfaceAddress, 
      
      // Native Property: 'allowedIPs' (Plural, Array)
      allowedIPs: ['0.0.0.0/0'], 
      
      // Native Properties: Explicit Split
      serverAddress: serverAddress,
      serverPort: serverPort,

      dns: ['1.1.1.1', '8.8.8.8'],
      mtu: 1280
    };

    console.log('[VPN_BRIDGE] Executing Native Sync (PRO):', JSON.stringify(config, null, 2));

    // 5. Establish Encrypted Tunnel
    try {
      await WireGuard.connect(config);
    } catch (nativeErr) {
      // HANDLE THE INJECTED PERMISSION ERROR
      if (nativeErr.code === 'VPN_PERMISSION_REQUIRED' || nativeErr.message?.includes('permission')) {
        Alert.alert(
          'Sentinel Authorization',
          'Standard Android VPN setup is required. Please tap "OK" on the next system dialog to authorize the secure tunnel.',
          [{ text: 'OK' }]
        );
        return 'PERMISSION_PENDING';
      }
      throw nativeErr;
    }
    
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
