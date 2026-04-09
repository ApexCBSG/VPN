// In-memory cache for the real (pre-VPN) IP so we don't re-fetch on every call
let _cachedRealIP = null;

/**
 * Fetch public IP by racing 3 providers. Returns the first one that responds.
 * Timeout per request: 5 seconds. Racing means effective latency = fastest provider.
 */
export const getPublicIP = async () => {
  const providers = [
    { url: 'https://api.ipify.org?format=json', extract: (d) => d.ip },
    { url: 'https://api4.my-ip.io/ip.json',     extract: (d) => d.ip },
    { url: 'https://ipinfo.io/json',             extract: (d) => d.ip },
  ];

  const fetchFromProvider = async ({ url, extract }) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    try {
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      const ip = extract(data);
      if (!ip) throw new Error('No IP in response');
      return ip;
    } catch (err) {
      clearTimeout(timeout);
      throw err;
    }
  };

  try {
    // Promise.any resolves as soon as the FIRST provider succeeds
    const ip = await Promise.any(providers.map(fetchFromProvider));
    return ip;
  } catch (error) {
    // All providers failed
    console.error('[Network] All IP providers failed:', error.message);
    return null;
  }
};

/**
 * Fetch and cache the real (pre-VPN) IP. Subsequent calls return cached value instantly.
 * Call invalidateRealIPCache() after disconnect so next connect gets a fresh baseline.
 */
export const getRealIP = async () => {
  if (_cachedRealIP) return _cachedRealIP;
  const ip = await getPublicIP();
  if (ip) _cachedRealIP = ip;
  return ip;
};

export const invalidateRealIPCache = () => {
  _cachedRealIP = null;
};

export const verifyConnection = async (targetIp) => {
  const currentIp = await getPublicIP();
  return currentIp === targetIp;
};
