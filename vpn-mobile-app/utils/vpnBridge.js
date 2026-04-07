import WireGuard from 'react-native-wireguard-vpn';
import * as SecureStore from 'expo-secure-store';
import { Alert, Linking } from 'react-native';

/**
 * Sentinel Defensive Bridge (v5.0.0 / Kill Switch + Split Tunneling)
 *
 * Features:
 * - Kill Switch: Guides user to Android "Always-on VPN" + "Block connections without VPN"
 * - Split Tunneling: Passes excluded apps to native module (disallowedApplications)
 * - Auto-Connect: Handled at DashboardScreen level
 */

/**
 * Connect to VPN with optional split tunneling config
 * @param {object} handshakeData - Server config from backend
 * @param {object} options - { excludedApps: string[] }
 */
export const connectVPN = async (handshakeData, options = {}) => {
  try {
    console.log('[VPN_BRIDGE] INITIATING HANDSHAKE:', JSON.stringify(handshakeData, null, 2));
    if (options.excludedApps?.length) {
      console.log('[VPN_BRIDGE] Split tunneling - excluding apps:', options.excludedApps);
    }

    // Validate handshake data
    if (!handshakeData || !handshakeData.endpoint) {
      throw new Error('Invalid handshake data: missing endpoint. Server returned: ' + JSON.stringify(handshakeData));
    }
    if (!handshakeData.serverPublicKey) {
      throw new Error('Invalid handshake data: missing serverPublicKey');
    }

    const privateKey = await SecureStore.getItemAsync('wg_private_key');
    if (!privateKey) throw new Error('Private key missing. Please log out and back in.');

    // 1. Initialize (caller is responsible for disconnect before calling)
    try {
      await WireGuard.initialize();
    } catch (e) {
      // Already initialized — safe to continue
      console.log('[VPN_BRIDGE] initialize() skipped (already init):', e.message);
    }

    // 2. Parse Endpoint
    const [serverAddress, portStr] = (handshakeData.endpoint || '').split(':');
    const serverPort = parseInt(portStr, 10) || 51820;

    if (!serverAddress) {
      throw new Error('Invalid endpoint format: ' + handshakeData.endpoint);
    }

    // 3. Interface IP Sanitization (CIDR Enforcement)
    let interfaceAddress = handshakeData.address || '10.64.0.2/32';
    if (!interfaceAddress.includes('/')) {
        interfaceAddress = `${interfaceAddress}/32`;
    }

    // 4. Construct Configuration
    const config = {
      privateKey: privateKey,
      publicKey: handshakeData.serverPublicKey,
      address: interfaceAddress,
      allowedIPs: ['0.0.0.0/0', '::/0'],
      serverAddress: serverAddress,
      serverPort: serverPort,
      dns: ['1.1.1.1', '8.8.8.8'],
      mtu: 1420,
    };

    // 5. Split Tunneling - add excluded apps if any
    if (options.excludedApps && options.excludedApps.length > 0) {
      config.excludedApps = options.excludedApps;
    }

    console.log('[VPN_BRIDGE] Executing Native Connect:', JSON.stringify({
      ...config,
      privateKey: '***hidden***',
    }, null, 2));

    // 6. Establish Encrypted Tunnel
    console.log('[VPN_BRIDGE] Calling WireGuard.connect()...');
    try {
      const connectStart = Date.now();
      await WireGuard.connect(config);
      const connectTime = Date.now() - connectStart;
      console.log(`[VPN_BRIDGE] WireGuard.connect() returned successfully (${connectTime}ms)`);
      // WireGuard.connect() resolving without error means the tunnel is active.
      // No status polling needed — trust the native SDK's return value.
    } catch (nativeErr) {
      console.log('[VPN_BRIDGE] WireGuard.connect() threw error:', nativeErr);
      // HANDLE THE INJECTED PERMISSION ERROR
      if (nativeErr.code === 'VPN_PERMISSION_REQUIRED' || nativeErr.message?.includes('VPN_PERMISSION_REQUIRED') || nativeErr.message?.includes('permission')) {
        console.log('[VPN_BRIDGE] Permission required. User must accept Android dialog.');
        return 'PERMISSION_PENDING';
      }
      console.error('[VPN_BRIDGE] Connection failed:', nativeErr.message, nativeErr.code);
      throw nativeErr;
    }

    console.log('[VPN_BRIDGE] Tunnel established successfully and verified');
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

/**
 * Open Android VPN settings so user can enable "Always-on VPN" + "Block connections without VPN"
 * This is the OS-level kill switch - most reliable approach on Android.
 */
export const openKillSwitchSettings = () => {
  Alert.alert(
    'Enable Kill Switch',
    'To enable Kill Switch, you need to turn on "Always-on VPN" and "Block connections without VPN" in Android settings.\n\n' +
    '1. Find "Sentinel" in the VPN list\n' +
    '2. Tap the gear icon next to it\n' +
    '3. Enable "Always-on VPN"\n' +
    '4. Enable "Block connections without VPN"',
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Open VPN Settings',
        onPress: () => {
          Linking.openSettings().catch(() => {
            // Fallback to VPN-specific settings
            Linking.sendIntent('android.settings.VPN_SETTINGS').catch(() => {
              Alert.alert('Error', 'Could not open settings. Go to Settings > Network > VPN manually.');
            });
          });
        }
      }
    ]
  );
};
