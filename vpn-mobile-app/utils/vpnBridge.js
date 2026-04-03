import WireGuard from 'react-native-wireguard-vpn';
import * as SecureStore from 'expo-secure-store';
import { Alert } from 'react-native';

/**
 * Sentinel Native Bridge (v1.0.15 Polyfill Specification)
 * 
 * Logic Update: 
 * Following the phone's EXACT "Tip" from the error popup.
 * We are separating the Interface from the Route to stop the '0.0.0.0/0' collision.
 */
export const connectVPN = async (handshakeData) => {
  try {
    console.log('[VPN_BRIDGE] INITIATING POLYFILL HANDSHAKE:', JSON.stringify(handshakeData, null, 2));

    const privateKey = await SecureStore.getItemAsync('wg_private_key');
    if (!privateKey) throw new Error('Private key missing.');

    // 1. Initialize
    await WireGuard.initialize();

    // 2. Parse Endpoint
    const [serverAddress, portStr] = (handshakeData.endpoint || '').split(':');
    const serverPort = parseInt(portStr, 10) || 51820;

    // 3. Interface IP Sanitization
    let interfaceAddress = handshakeData.address || '10.64.0.2/32';
    if (!interfaceAddress.includes('/')) {
        interfaceAddress = `${interfaceAddress}/32`;
    }

    // 4. Construct Polyfill Configuration
    // We provide EVERY possible key name to ensure one of them sticks.
    const config = {
      privateKey: privateKey,
      publicKey: handshakeData.serverPublicKey,
      
      // OPTION A: Singular (The Tip specifically asked for this)
      address: interfaceAddress, 
      
      // OPTION B: Plural (Defensive fallback)
      addresses: [interfaceAddress], 
      
      // OPTION C: Routing Only (As requested by the engine tip)
      allowedIPs: ['0.0.0.0/0'], 
      
      // OPTION D: Networking (Some versions require these names)
      serverAddress: serverAddress,
      serverPort: serverPort,
      endpoint: `${serverAddress}:${serverPort}`,

      dns: ['1.1.1.1', '8.8.8.8'],
      mtu: 1420 // Dropped to 1420 for better packet hygiene
    };

    console.log('[VPN_BRIDGE] Native Sync Payload (Polyfill):', JSON.stringify(config, null, 2));

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
