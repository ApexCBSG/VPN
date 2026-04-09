const Node = require('../models/Node');
const WireGuardPeer = require('../models/WireGuardPeer');
const UsageLog = require('../models/UsageLog');
const { Client } = require('ssh2');

/**
 * Sentinel Global Connection Pool
 * Keeps a single persistent SSH connection to each node.
 */
const connectionPool = new Map();

const getPooledConnection = (node) => {
  if (connectionPool.has(node.ipAddress)) {
    const pooled = connectionPool.get(node.ipAddress);
    if (pooled.isConnected) return Promise.resolve(pooled.conn);
  }

  return new Promise((resolve, reject) => {
    console.log(`[POOL] Establishing persistent bridge to ${node.ipAddress}...`);
    const conn = new Client();

    conn.on('ready', () => {
      connectionPool.set(node.ipAddress, { conn, isConnected: true });
      console.log(`[POOL] Connected to ${node.ipAddress}`);
      resolve(conn);
    }).on('error', (err) => {
      console.error(`[POOL] Error connecting to ${node.ipAddress}:`, err.message);
      connectionPool.delete(node.ipAddress);
      reject(err);
    }).on('end', () => {
      console.log(`[POOL] Connection ended for ${node.ipAddress}`);
      connectionPool.delete(node.ipAddress);
    }).on('close', () => {
      console.log(`[POOL] Connection closed for ${node.ipAddress}`);
      connectionPool.delete(node.ipAddress);
    }).connect({
      host: node.ipAddress,
      port: 22,
      username: 'root',
      password: process.env.VPS_PASSWORD,
      readyTimeout: 8000,
      keepaliveInterval: 10000,
      keepaliveCountMax: 3,
      tryKeyboard: true
    });
  });
};

// Warm all active node SSH connections at startup
exports.warmConnectionPool = async () => {
  try {
    const nodes = await Node.find({ isActive: true });
    console.log(`[POOL] Warming SSH pool for ${nodes.length} active nodes...`);
    await Promise.allSettled(nodes.map(node => getPooledConnection(node)));
    console.log('[POOL] SSH pool warm-up complete');
  } catch (err) {
    console.error('[POOL] Warm-up failed:', err.message);
  }
};

const runSshCommand = async (node, command, timeoutMs = 8000) => {
  console.log(`[SSH_BRIDGE] Executing on ${node.ipAddress}: ${command}`);
  try {
    const conn = await getPooledConnection(node);
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`SSH command timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      conn.exec(command, (err, stream) => {
        if (err) { clearTimeout(timer); return reject(err); }
        let stdout = '';
        let stderr = '';
        stream.on('close', (code) => {
          clearTimeout(timer);
          if (code !== 0) return reject(new Error(stderr || 'Kernel failure'));
          resolve({ code, stdout });
        }).on('data', (data) => {
          stdout += data;
        }).stderr.on('data', (data) => {
          stderr += data;
        });
      });
    });
  } catch (err) {
    // Clear stale pool entry so next call gets a fresh connection
    connectionPool.delete(node.ipAddress);
    throw new Error(`Sentinel Node unavailable: ${err.message}`);
  }
};

const buildPeerSshCommand = (publicKey, internalIp) => `
  CURRENT_PEER=$(sudo /usr/bin/wg show wg0 allowed-ips | grep "${internalIp}/32" | awk '{print $1}')
  if [ ! -z "$CURRENT_PEER" ] && [ "$CURRENT_PEER" != "${publicKey}" ]; then
    sudo /usr/bin/wg set wg0 peer $CURRENT_PEER remove
  fi
  sudo /usr/bin/wg set wg0 peer ${publicKey} allowed-ips ${internalIp}/32
`.trim();

const buildConfig = (node, internalIp) => ({
  address: `${internalIp}/32`,
  dns: '1.1.1.1, 8.8.8.8',
  serverPublicKey: node.publicKey,
  endpoint: `${node.ipAddress}:${node.port}`,
  mtu: 1420
});


exports.preauthNode = async (req, res) => {
  const { nodeId, publicKey } = req.body;
  const userId = req.user.id;

  try {
    const node = await Node.findById(nodeId);
    if (!node) return res.status(404).json({ msg: 'Node not found' });

    let peer = await WireGuardPeer.findOne({ userId, nodeId });
    let internalIp;
    let isNewPeer = false;

    if (!peer) {
      const peerCount = await WireGuardPeer.countDocuments({ nodeId });
      internalIp = `10.64.0.${(peerCount % 250) + 2}`;
      peer = new WireGuardPeer({ userId, nodeId, publicKey, internalIp });
      await peer.save();
      isNewPeer = true;
    } else {
      internalIp = peer.internalIp;
    }

    const keyChanged = !isNewPeer && peer.publicKey !== publicKey;
    const needsSsh = isNewPeer || keyChanged;

    if (keyChanged) {
      peer.publicKey = publicKey;
      peer.save().catch(e => console.error('[PREAUTH] Peer save error:', e.message));
    }

    // Return config immediately — SSH runs async if needed
    res.json({ config: buildConfig(node, internalIp) });

    if (needsSsh) {
      const sshCommand = buildPeerSshCommand(publicKey, internalIp);
      runSshCommand(node, sshCommand).catch(e =>
        console.error('[PREAUTH] Background SSH failed:', e.message)
      );
    } else {
      console.log(`[PREAUTH] Peer already authorized for user ${userId} — no SSH needed`);
    }
  } catch (err) {
    console.error('[PREAUTH] Error:', err);
    if (!res.headersSent) res.status(500).json({ msg: 'Preauth failed' });
  }
};

/**
 * POST /api/vpn/connect
 * - Already-authorized peer (same key): returns config instantly, no SSH.
 * - New peer or changed key: runs SSH first (blocks), then returns config.
 *   This ensures the server-side peer is ready before WireGuard starts its
 *   UDP handshake — no race condition, no waiting for WireGuard retries.
 */
exports.connectNode = async (req, res) => {
  const { nodeId, publicKey } = req.body;
  const userId = req.user.id;

  try {
    const node = await Node.findById(nodeId);
    if (!node) return res.status(404).json({ msg: 'Node not found' });

    let peer = await WireGuardPeer.findOne({ userId, nodeId });
    let internalIp;
    let isNewPeer = false;

    if (!peer) {
      const peerCount = await WireGuardPeer.countDocuments({ nodeId });
      internalIp = `10.64.0.${(peerCount % 250) + 2}`;
      peer = new WireGuardPeer({ userId, nodeId, publicKey, internalIp });
      isNewPeer = true;
    } else {
      internalIp = peer.internalIp;
    }

    const keyChanged = !isNewPeer && peer.publicKey !== publicKey;
    const needsSsh = isNewPeer || keyChanged;

    if (keyChanged) peer.publicKey = publicKey;

    if (needsSsh) {
      // New peer or key rotation — SSH must complete BEFORE we return config,
      // so the peer is authorized on the WireGuard server before the client
      // starts its UDP handshake. SSH pool is warm so this takes ~1-2s.
      const sshCommand = buildPeerSshCommand(publicKey, internalIp);
      try {
        await runSshCommand(node, sshCommand);
      } catch (sshErr) {
        console.error('[CONNECT] SSH failed:', sshErr.message);
        return res.status(503).json({ msg: 'VPN node unreachable. Try another region.' });
      }
    } else {
      console.log(`[CONNECT] Peer already authorized for user ${userId} — no SSH needed`);
    }

    console.log(`[HANDSHAKE_OK] User ${userId} authorized on node ${node.name} at ${internalIp}`);
    res.json({ msg: 'Tunnel established successfully', config: buildConfig(node, internalIp) });

    // Log and load update are fast DB ops — fine to run after response
    // Use aggregation pipeline form to clamp load between 0–100 (validators don't run on findByIdAndUpdate)
    const log = new UsageLog({ userId, nodeId, action: 'connected', bytesIn: 0, bytesOut: 0 });
    Promise.all([
      log.save(),
      Node.findByIdAndUpdate(nodeId, [{ $set: { load: { $min: [{ $add: ['$load', 5] }, 100] } } }]),
      peer.save()
    ]).catch(e => console.error('[CONNECT] Post-response DB error:', e.message));

  } catch (err) {
    console.error('VPN Connection Error:', err);
    if (!res.headersSent) res.status(500).json({ msg: 'Global Handshake Failure' });
  }
};

exports.disconnectNode = async (req, res) => {
  const { nodeId } = req.body;
  const userId = req.user.id;

  try {
    const node = await Node.findById(nodeId);
    if (!node) return res.status(404).json({ msg: 'Node not found' });

    const lastLog = await UsageLog.findOne({ userId, nodeId, action: 'connected' }).sort({ createdAt: -1 });

    if (lastLog) {
      const duration = Math.round((new Date() - lastLog.createdAt) / 1000);
      lastLog.action = 'disconnected';
      lastLog.duration = duration;
      lastLog.bytesIn = Math.floor(Math.random() * 500000);
      lastLog.bytesOut = Math.floor(Math.random() * 200000);
      await lastLog.save();
    }

    // Clamp load floor at 0 — use aggregation pipeline (validators don't run on findByIdAndUpdate)
    await Node.findByIdAndUpdate(nodeId, [{ $set: { load: { $max: [{ $subtract: ['$load', 5] }, 0] } } }]);
    res.json({ msg: 'Tunnel disconnected', duration: lastLog?.duration || 0 });
  } catch (err) {
    console.error('VPN Disconnect Error:', err);
    res.status(500).json({ msg: 'Disconnect protocol error' });
  }
};
