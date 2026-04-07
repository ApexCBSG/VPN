import React, { createContext, useContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';

const VPNSettingsContext = createContext({});

export const useVPNSettings = () => useContext(VPNSettingsContext);

const STORAGE_KEYS = {
  KILL_SWITCH: 'vpn_kill_switch',
  AUTO_CONNECT: 'vpn_auto_connect',
  SPLIT_TUNNEL_ENABLED: 'vpn_split_tunnel_enabled',
  SPLIT_TUNNEL_APPS: 'vpn_split_tunnel_apps',
  LAST_SERVER: 'vpn_last_server',
};

// Well-known Android package names users commonly want to exclude from VPN
const AVAILABLE_APPS = [
  { packageName: 'com.whatsapp', label: 'WhatsApp', category: 'Messaging' },
  { packageName: 'com.google.android.youtube', label: 'YouTube', category: 'Streaming' },
  { packageName: 'com.netflix.mediaclient', label: 'Netflix', category: 'Streaming' },
  { packageName: 'com.spotify.music', label: 'Spotify', category: 'Streaming' },
  { packageName: 'com.instagram.android', label: 'Instagram', category: 'Social' },
  { packageName: 'com.twitter.android', label: 'X (Twitter)', category: 'Social' },
  { packageName: 'com.facebook.katana', label: 'Facebook', category: 'Social' },
  { packageName: 'com.snapchat.android', label: 'Snapchat', category: 'Social' },
  { packageName: 'com.zhiliaoapp.musically', label: 'TikTok', category: 'Social' },
  { packageName: 'com.google.android.apps.maps', label: 'Google Maps', category: 'Utility' },
  { packageName: 'com.google.android.gm', label: 'Gmail', category: 'Utility' },
  { packageName: 'com.android.chrome', label: 'Chrome', category: 'Browser' },
  { packageName: 'org.mozilla.firefox', label: 'Firefox', category: 'Browser' },
  { packageName: 'com.brave.browser', label: 'Brave', category: 'Browser' },
  { packageName: 'com.amazon.mShop.android.shopping', label: 'Amazon', category: 'Shopping' },
  { packageName: 'com.skype.raider', label: 'Skype', category: 'Messaging' },
  { packageName: 'org.telegram.messenger', label: 'Telegram', category: 'Messaging' },
  { packageName: 'com.discord', label: 'Discord', category: 'Messaging' },
  { packageName: 'com.Slack', label: 'Slack', category: 'Messaging' },
  { packageName: 'us.zoom.videomeetings', label: 'Zoom', category: 'Utility' },
];

export const VPNSettingsProvider = ({ children }) => {
  const [killSwitch, setKillSwitchState] = useState(false);
  const [autoConnect, setAutoConnectState] = useState(false);
  const [splitTunnelEnabled, setSplitTunnelEnabledState] = useState(false);
  const [splitTunnelApps, setSplitTunnelAppsState] = useState([]); // excluded package names
  const [lastServer, setLastServerState] = useState(null);
  const [loaded, setLoaded] = useState(false);

  // Load settings from secure storage on mount
  useEffect(() => {
    (async () => {
      try {
        const [ks, ac, ste, sta, ls] = await Promise.all([
          SecureStore.getItemAsync(STORAGE_KEYS.KILL_SWITCH),
          SecureStore.getItemAsync(STORAGE_KEYS.AUTO_CONNECT),
          SecureStore.getItemAsync(STORAGE_KEYS.SPLIT_TUNNEL_ENABLED),
          SecureStore.getItemAsync(STORAGE_KEYS.SPLIT_TUNNEL_APPS),
          SecureStore.getItemAsync(STORAGE_KEYS.LAST_SERVER),
        ]);
        if (ks !== null) setKillSwitchState(ks === 'true');
        if (ac !== null) setAutoConnectState(ac === 'true');
        if (ste !== null) setSplitTunnelEnabledState(ste === 'true');
        if (sta !== null) {
          try { setSplitTunnelAppsState(JSON.parse(sta)); } catch (e) {}
        }
        if (ls !== null) {
          try { setLastServerState(JSON.parse(ls)); } catch (e) {}
        }
      } catch (e) {
        console.error('[VPNSettings] Failed to load settings:', e);
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  const setKillSwitch = async (val) => {
    setKillSwitchState(val);
    await SecureStore.setItemAsync(STORAGE_KEYS.KILL_SWITCH, String(val));
  };

  const setAutoConnect = async (val) => {
    setAutoConnectState(val);
    await SecureStore.setItemAsync(STORAGE_KEYS.AUTO_CONNECT, String(val));
  };

  const setSplitTunnelEnabled = async (val) => {
    setSplitTunnelEnabledState(val);
    await SecureStore.setItemAsync(STORAGE_KEYS.SPLIT_TUNNEL_ENABLED, String(val));
  };

  const toggleSplitTunnelApp = async (packageName) => {
    const updated = splitTunnelApps.includes(packageName)
      ? splitTunnelApps.filter(p => p !== packageName)
      : [...splitTunnelApps, packageName];
    setSplitTunnelAppsState(updated);
    await SecureStore.setItemAsync(STORAGE_KEYS.SPLIT_TUNNEL_APPS, JSON.stringify(updated));
  };

  const setLastServer = async (server) => {
    setLastServerState(server);
    if (server) {
      await SecureStore.setItemAsync(STORAGE_KEYS.LAST_SERVER, JSON.stringify(server));
    }
  };

  return (
    <VPNSettingsContext.Provider value={{
      killSwitch,
      setKillSwitch,
      autoConnect,
      setAutoConnect,
      splitTunnelEnabled,
      setSplitTunnelEnabled,
      splitTunnelApps,
      toggleSplitTunnelApp,
      lastServer,
      setLastServer,
      loaded,
      AVAILABLE_APPS,
    }}>
      {children}
    </VPNSettingsContext.Provider>
  );
};
