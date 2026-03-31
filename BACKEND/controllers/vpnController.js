const Node = require('../models/Node');
const WireGuardPeer = require('../models/WireGuardPeer');
const UsageLog = require('../models/UsageLog');
const { Client } = require('ssh2'); 

const runSshCommand = (node, command) => {
  console.log(`SSH: Connecting to ${node.ipAddress} as root...`);
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
      password: process.env.VPS_PASSWORD
    });
  });
};

exports.connectNode = async (req, res) => {
  const { nodeId, publicKey } = req.body;
  const userId = req.user.id;

  try {
    const node = await Node.findById(nodeId);
    if (!node) return res.status(404).json({ msg: 'Node not found' });

    
    let peer = await WireGuardPeer.findOne({ userId, nodeId });
    let internalIp;
    if (!peer) {
      const peerCount = await WireGuardPeer.countDocuments({ nodeId });
      internalIp = `10.0.0.${peerCount + 2}`; 
      
      peer = new WireGuardPeer({
        userId,
        nodeId,
        publicKey,
        internalIp
      });
    } else {
      internalIp = peer.internalIp;
    }

    
    const sshCommand = `wg set wg0 peer ${publicKey} allowed-ips ${internalIp}/32`;
    await runSshCommand(node, sshCommand);

    
    const log = new UsageLog({
      userId,
      nodeId,
      action: 'connected',
      bytesIn: 0,
      bytesOut: 0
    });
    await log.save();

    
    await Node.findByIdAndUpdate(nodeId, { $inc: { load: 5 } });

    await peer.save();

    res.json({
      msg: 'Tunnel established successfully',
      config: {
        address: `${internalIp}/32`,
        dns: '1.1.1.1, 8.8.8.8',
        serverPublicKey: node.publicKey,
        endpoint: `${node.ipAddress}:${node.port}`,
        mtu: 1420
      }
    });
  } catch (err) {
    console.error('VPN Connection Error:', err);
    res.status(500).json({ msg: 'Handshake protocol failure' });
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
      lastLog.bytesIn = Math.floor(Math.random() * 500000); // Simulated download
      lastLog.bytesOut = Math.floor(Math.random() * 200000); 
      await lastLog.save();
    }

    
    await Node.findByIdAndUpdate(nodeId, { $inc: { load: -5 } });

    res.json({ msg: 'Tunnel disconnected', duration: lastLog?.duration || 0 });
  } catch (err) {
    console.error('VPN Disconnect Error:', err);
    res.status(500).json({ msg: 'Disconnect protocol error' });
  }
};
