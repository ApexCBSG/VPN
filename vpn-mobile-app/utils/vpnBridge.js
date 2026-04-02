import WireGuard from 'react-native-wireguard-vpn';
import * as SecureStore from 'expo-secure-store';

/**
 * Enterprise-grade VPN Bridge for Sentinel
 * Manages the transition from JS-Handshake to OS-Tunnel
 */
export const connectVPN = async (config) => {
  try {
    const privateKey = await SecureStore.getItemAsync('wg_private_key');
    if (!privateKey) throw new Error('Private key not found on device.');

    // 1. Initialize the native WireGuard runtime
    // This library requires initialization before connection
    await WireGuard.initialize();

    // 2. Prepare standard WireGuard configuration with Peer Array
    const wgConfig = {
      address: config.address,
      dns: config.dns || '1.1.1.1',
      privateKey: privateKey,
      peers: [{
        publicKey: config.serverPublicKey,
        endpoint: config.endpoint,
        allowedIps: '0.0.0.0/0', // Full Tunnel (Industry Standard)
      }],
      mtu: config.mtu || 1420,
    };

    // 3. Invoke Native OS Tunnel Service (Triggers VPN Permission Dialog)
    await WireGuard.connect(wgConfig);
    
    console.log('[VPN_BRIDGE] Connection Successful.');
    return 'CONNECTED';
  } catch (error) {
    console.error('[VPN_BRIDGE] Connection Error:', error);
    throw error;
  }
};

export const disconnectVPN = async () => {
  try {
    await WireGuard.disconnect();
    console.log('[VPN_BRIDGE] Disconnected.');
  } catch (error) {
    console.error('[VPN_BRIDGE] Disconnect Error:', error);
  }
};

export const getVPNStatus = async () => {
  try {
    const status = await WireGuard.getStatus();
    return status; // Returns CONNECTED, DISCONNECTED, etc.
  } catch (error) {
    return 'DISCONNECTED';
  }
};
