import { API_URL } from '../config';

const CONFIG_TTL_MS = 5 * 60 * 1000; // 5 minutes

// In-memory cache — keyed by nodeId
const cache = new Map();

/**
 * Pre-authorize and cache the VPN config for a server.
 * Returns config immediately from backend (SSH runs async server-side).
 * If peer is already authorized, backend returns instantly with no SSH at all.
 */
export const prewarmVPN = async (token, server, publicKey) => {
  if (!token || !server?._id || !publicKey) return;

  const nodeId = server._id;
  const cached = cache.get(nodeId);
  if (cached && Date.now() - cached.cachedAt < CONFIG_TTL_MS) {
    console.log('[PREWARM] Cache hit for node', nodeId);
    return cached.config;
  }

  try {
    console.log('[PREWARM] Pre-authorizing peer for node', server.name || nodeId);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(`${API_URL}/vpn/preauth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
      body: JSON.stringify({ nodeId, publicKey }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) throw new Error(`Preauth HTTP ${res.status}`);
    const { config } = await res.json();

    cache.set(nodeId, { config, cachedAt: Date.now() });
    console.log('[PREWARM] Config cached for node', nodeId);
    return config;
  } catch (err) {
    console.warn('[PREWARM] Failed:', err.message);
    return null;
  }
};

/**
 * Return cached config if still fresh, otherwise null.
 */
export const getCachedConfig = (nodeId) => {
  const cached = cache.get(nodeId);
  if (!cached) return null;
  if (Date.now() - cached.cachedAt > CONFIG_TTL_MS) {
    cache.delete(nodeId);
    return null;
  }
  return cached.config;
};

export const invalidateCache = (nodeId) => {
  if (nodeId) cache.delete(nodeId);
  else cache.clear();
};
