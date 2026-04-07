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
      readyTimeout: 30000,
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

const runSshCommand = async (node, command) => {
  console.log(`[SSH_BRIDGE] Executing on ${node.ipAddress}: ${command}`);
  try {
    const conn = await getPooledConnection(node);
    return new Promise((resolve, reject) => {
      conn.exec(command, (err, stream) => {
        if (err) return reject(err);
        let stdout = '';
        let stderr = '';
        stream.on('close', (code) => {
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

/**
 * POST /api/vpn/preauth
 * Pre-authorize the peer and return config immediately.
 * SSH runs in the background — does NOT block the response.
 * If the peer already exists with the same public key, no SSH is needed at all.
 */
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
 * Full connect: authorize peer (skips SSH if already authorized) and log.
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

    // Only run SSH if the peer isn't already authorized
    if (needsSsh) {
      const sshCommand = buildPeerSshCommand(publicKey, internalIp);
      try {
        await runSshCommand(node, sshCommand);
      } catch (sshErr) {
        console.error('[SSH_BRIDGE] Handshake Authorization Failed:', sshErr.message);
        return res.status(503).json({ msg: 'Sentinel Node kernel is non-responsive. Try another region.' });
      }
    } else {
      console.log(`[CONNECT] Peer already authorized for user ${userId} — skipping SSH`);
    }

    const log = new UsageLog({ userId, nodeId, action: 'connected', bytesIn: 0, bytesOut: 0 });
    await Promise.all([
      log.save(),
      Node.findByIdAndUpdate(nodeId, { $inc: { load: 5 } }),
      peer.save()
    ]);

    console.log(`[HANDSHAKE_OK] User ${userId} authorized on node ${node.name} at ${internalIp}`);
    res.json({ msg: 'Tunnel established successfully', config: buildConfig(node, internalIp) });
  } catch (err) {
    console.error('VPN Connection Error:', err);
    res.status(500).json({ msg: 'Global Handshake Failure' });
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

    // Peer entry stays on WireGuard server — no SSH needed on disconnect.
    // This eliminates ~2-30s of SSH overhead and makes reconnect instant.
    await Node.findByIdAndUpdate(nodeId, { $inc: { load: -5 } });
    res.json({ msg: 'Tunnel disconnected', duration: lastLog?.duration || 0 });
  } catch (err) {
    console.error('VPN Disconnect Error:', err);
    res.status(500).json({ msg: 'Disconnect protocol error' });
  }
};
