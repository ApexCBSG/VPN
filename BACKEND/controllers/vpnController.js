const Node = require('../models/Node');
const WireGuardPeer = require('../models/WireGuardPeer');
const { Client } = require('ssh2'); // Need to install ssh2

// Helper function to run SSH command
const runSshCommand = (node, command) => {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    conn.on('ready', () => {
      conn.exec(command, (err, stream) => {
        if (err) return reject(err);
        let stdout = '';
        stream.on('close', (code, signal) => {
          conn.end();
          resolve({ code, stdout });
        }).on('data', (data) => {
          stdout += data;
        }).stderr.on('data', (data) => {
          console.error('STDERR: ' + data);
        });
      });
    }).on('error', (err) => {
      reject(err);
    }).connect({
      host: node.ipAddress,
      port: 22,
      username: 'root',
      password: process.env.VPS_PASSWORD || 'MadMan12321@##**s' // Use env or default for now
    });
  });
};

exports.connectNode = async (req, res) => {
  const { nodeId, publicKey } = req.body;
  const userId = req.user.id;

  try {
    const node = await Node.findById(nodeId);
    if (!node) return res.status(404).json({ msg: 'Node not found' });

    // 1. Check for existing peer for this user/node
    let peer = await WireGuardPeer.findOne({ userId, nodeId });
    
    // 2. If no peer, assign new Internal IP
    let internalIp;
    if (!peer) {
      const peerCount = await WireGuardPeer.countDocuments({ nodeId });
      internalIp = `10.0.0.${peerCount + 2}`; // Start from .2
      
      peer = new WireGuardPeer({
        userId,
        nodeId,
        publicKey,
        internalIp
      });
    } else {
      internalIp = peer.internalIp;
    }

    // 3. Register Peer on VPS via SSH
    // Command: wg set wg0 peer <pubkey> allowed-ips <ip>/32
    const sshCommand = `wg set wg0 peer ${publicKey} allowed-ips ${internalIp}/32`;
    await runSshCommand(node, sshCommand);

    await peer.save();

    res.json({
      msg: 'Connection registry update successful',
      config: {
        address: `${internalIp}/32`,
        dns: '1.1.1.1, 8.8.8.8',
        serverPublicKey: node.publicKey,
        endpoint: `${node.ipAddress}:${node.port}`,
        mtu: 1420
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error during handshake');
  }
};

exports.disconnectNode = async (req, res) => {
  // Logic to remove peer from wg0
  res.json({ msg: 'Disconnect logic pending' });
};
