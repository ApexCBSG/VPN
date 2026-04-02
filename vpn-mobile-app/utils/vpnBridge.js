import WireGuard from 'react-native-wireguard-vpn';
import * as SecureStore from 'expo-secure-store';
import { Alert } from 'react-native';

/**
 * Sentinel Native Bridge (v1.0.15 Final Specification)
 * 
 * Logic Update: 
 * Reverting to the 'Combined allowedIPs' array as required by the Kotlin source.
 * The 'interfaceAddress' MUST contain a /32 suffix to be detected by the native engine.
 */
export const connectVPN = async (handshakeData) => {
  try {
    console.log('[VPN_BRIDGE] INITIATING FINAL SYNC:', JSON.stringify(handshakeData, null, 2));

    const privateKey = await SecureStore.getItemAsync('wg_private_key');
    if (!privateKey) throw new Error('Private key missing.');

    // 1. Initialize
    await WireGuard.initialize();

    // 2. Parse Endpoint
    const [serverAddress, portStr] = (handshakeData.endpoint || '').split(':');
    const serverPort = parseInt(portStr, 10) || 51820;

    // 3. Interface IP Sanitization (THE MAGIC KEY)
    // The native Kotlin code specifically looks for "/32" in the list.
    let interfaceAddress = handshakeData.address || '10.64.0.2';
    if (interfaceAddress === '0.0.0.0/0') interfaceAddress = '10.64.0.2';
    
    if (!interfaceAddress.includes('/')) {
        interfaceAddress = `${interfaceAddress}/32`;
    }

    // 4. Construct Combined Configuration
    // Field Name must be exactly 'allowedIPs' (Capital IP)
    const config = {
      privateKey: privateKey,
      publicKey: handshakeData.serverPublicKey,
      serverAddress: serverAddress,
      serverPort: serverPort,
      
      // LOGIC: First entry is extracted as the Tunnel Interface (/32)
      // Second entry is the Global Route
      allowedIPs: [interfaceAddress, '0.0.0.0/0'], 
      
      dns: ['1.1.1.1', '8.8.8.8'],
      mtu: 1450,
    };

    console.log('[VPN_BRIDGE] Native Sync Payload (Combined):', JSON.stringify(config, null, 2));

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
