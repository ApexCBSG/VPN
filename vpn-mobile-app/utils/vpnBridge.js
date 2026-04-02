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

    // 1. Prepare standard WireGuard configuration
    const wgConfig = {
      address: config.address,
      dns: config.dns || '1.1.1.1',
      privateKey: privateKey,
      publicKey: config.serverPublicKey,
      endpoint: config.endpoint,
      allowedIps: '0.0.0.0/0', // Full Tunnel (Industry Standard)
      mtu: config.mtu || 1420,
    };

    // 2. Invoke Native OS Tunnel Service
    // This will trigger the system-level VPN permission dialog
    const status = await WireGuard.activate(wgConfig);
    console.log('[VPN_BRIDGE] Activation Status:', status);
    return status;
  } catch (error) {
    console.error('[VPN_BRIDGE] Connection Error:', error);
    throw error;
  }
};

export const disconnectVPN = async () => {
  try {
    await WireGuard.deactivate();
    console.log('[VPN_BRIDGE] Deactivated.');
  } catch (error) {
    console.error('[VPN_BRIDGE] Deactivation Error:', error);
  }
};

export const getVPNStatus = async () => {
  try {
    return await WireGuard.getStatus();
  } catch (error) {
    return 'DISCONNECTED';
  }
};
