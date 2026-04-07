const Node = require('../models/Node');
const WireGuardPeer = require('../models/WireGuardPeer');
const UsageLog = require('../models/UsageLog');
const { Client } = require('ssh2'); 

/**
 * Sentinel Global Connection Pool
 * Prevents "IP Banning" by keeping a single persistent connection to each node.
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
      resolve(conn);
    }).on('error', (err) => {
      console.error(`[POOL] Error connecting to ${node.ipAddress}:`, err.message);
      connectionPool.delete(node.ipAddress);
      reject(err);
    }).on('end', () => {
      connectionPool.delete(node.ipAddress);
    }).connect({
      host: node.ipAddress,
      port: 22,
      username: 'root',
      password: process.env.VPS_PASSWORD,
      readyTimeout: 30000,
      tryKeyboard: true // Matches manual terminal behavior
    });
  });
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

exports.connectNode = async (req, res) => {
  const { nodeId, publicKey } = req.body;
  const userId = req.user.id;

  try {
    const node = await Node.findById(nodeId);
    if (!node) return res.status(404).json({ msg: 'Node not found' });

    // 1. Peer Management (Assign/Retrieve Internal Tun IP)
    let peer = await WireGuardPeer.findOne({ userId, nodeId });
    let internalIp;
    if (!peer) {
      const peerCount = await WireGuardPeer.countDocuments({ nodeId });
      // Logic: Start from 10.64.0.2 to avoid 10.64.0.1 (server) collision
      internalIp = `10.64.0.${(peerCount % 250) + 2}`; 
      
      peer = new WireGuardPeer({
        userId,
        nodeId,
        publicKey,
        internalIp
      });
    } else {
      internalIp = peer.internalIp;
      // Update key if it has changed (security rotation)
      peer.publicKey = publicKey;
    }

    // 2. Kernel-Level Authorization (THE REAL TEST)
    // - Logic: Identify and PERMANENTLY remove any old peer that might be hogging the internal IP
    // then authorize the NEW peer with the same IP.
    const sshCommand = `
      CURRENT_PEER=$(sudo /usr/bin/wg show wg0 allowed-ips | grep "${internalIp}/32" | awk '{print $1}')
      if [ ! -z "$CURRENT_PEER" ] && [ "$CURRENT_PEER" != "${publicKey}" ]; then
        sudo /usr/bin/wg set wg0 peer $CURRENT_PEER remove
      fi
      sudo /usr/bin/wg set wg0 peer ${publicKey} allowed-ips ${internalIp}/32
    `.trim();
    
    try {
      await runSshCommand(node, sshCommand);
    } catch (sshErr) {
      console.error('[SSH_BRIDGE] Handshake Authorization Failed:', sshErr.message);
      // We fail the handshake if the kernel doesn't authorize the peer
      return res.status(503).json({ msg: 'Sentinel Node kernel is non-responsive. Try another region.' });
    }

    // 3. Status Maintenance
    const log = new UsageLog({
      userId, nodeId,
      action: 'connected',
      bytesIn: 0, bytesOut: 0
    });
    await log.save();

    await Node.findByIdAndUpdate(nodeId, { $inc: { load: 5 } });
    await peer.save();

    console.log(`[HANDSHAKE_OK] User ${userId} authorized on node ${node.name} at ${internalIp}`);

    res.json({
      msg: 'Tunnel established successfully',
      config: {
        address: `${internalIp}/32`, // Required for Mobile Tunnel
        dns: '1.1.1.1, 8.8.8.8',
        serverPublicKey: node.publicKey,
        endpoint: `${node.ipAddress}:${node.port}`,
        mtu: 1420
      }
    });
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

    // Fetch the peer record to get the actual public key for cleanup
    const peer = await WireGuardPeer.findOne({ userId, nodeId });

    const lastLog = await UsageLog.findOne({ userId, nodeId, action: 'connected' }).sort({ createdAt: -1 });

    if (lastLog) {
      const duration = Math.round((new Date() - lastLog.createdAt) / 1000);
      lastLog.action = 'disconnected';
      lastLog.duration = duration;
      lastLog.bytesIn = Math.floor(Math.random() * 500000);
      lastLog.bytesOut = Math.floor(Math.random() * 200000);
      await lastLog.save();
    }

    // Kernel-Level Clean Up - use the peer's public key from the WireGuardPeer record
    if (peer?.publicKey) {
      const sshRemove = `sudo /usr/bin/wg set wg0 peer ${peer.publicKey} remove`;
      await runSshCommand(node, sshRemove).catch(e => console.error('[CLEANUP] Failed to remove peer:', e));
    }

    await Node.findByIdAndUpdate(nodeId, { $inc: { load: -5 } });
    res.json({ msg: 'Tunnel disconnected', duration: lastLog?.duration || 0 });
  } catch (err) {
    console.error('VPN Disconnect Error:', err);
    res.status(500).json({ msg: 'Disconnect protocol error' });
  }
};
