const mongoose = require('mongoose');
const axios = require('axios');
require('dotenv').config();

const API_URL = 'http://localhost:5000/api';

async function runTest() {
  console.log('--- STARTING VPN CORE VALIDATION ---');
  
  try {
    // 1. Authenticate
    console.log('Step 1: Authenticating as Admin...');
    const authRes = await axios.post(`${API_URL}/auth/login`, {
      email: 'admin@gmail.com',
      password: 'admin123'
    });
    const token = authRes.data.token;
    const userId = authRes.data.user._id;
    console.log('✓ Auth Success.');

    // 2. Fetch Nodes
    console.log('Step 2: Fetching available nodes...');
    const nodeRes = await axios.get(`${API_URL}/nodes`);
    const nodes = nodeRes.data;
    if (nodes.length === 0) throw new Error('No nodes found in registry');
    const node = nodes[0];
    console.log(`✓ Targeting Node: ${node.name} (${node.ipAddress})`);

    // 3. Trigger Handshake
    console.log('Step 3: Triggering tunnel handshake...');
    const connectRes = await axios.post(`${API_URL}/vpn/connect`, {
      nodeId: node._id,
      publicKey: 'TEST_PUB_KEY_1234567890_VALID_B64='
    }, {
      headers: { 'x-auth-token': token }
    });
    console.log('✓ Handshake Response:', connectRes.data.msg);
    console.log('  Assigned IP:', connectRes.data.config.address);

    // 4. Verify Telemetry (UsageLog)
    console.log('Step 4: Verifying telemetry propagation...');
    await mongoose.connect(process.env.MONGODB_URI);
    const UsageLog = require('../models/UsageLog');
    const log = await UsageLog.findOne({ userId, nodeId: node._id, action: 'connected' }).sort({ createdAt: -1 });
    
    if (log) {
      console.log('✓ Telemetry match found in MongoDB.');
    } else {
      console.log('✗ TELEMETRY FAILURE: No active log found.');
    }

    // 5. Cleanup (Disconnect)
    console.log('Step 5: Testing disconnect protocol...');
    const disconnectRes = await axios.post(`${API_URL}/vpn/disconnect`, {
      nodeId: node._id
    }, {
      headers: { 'x-auth-token': token }
    });
    console.log('✓ Disconnect Success. Duration:', disconnectRes.data.duration, 'seconds');

    process.exit(0);
  } catch (err) {
    console.error('✗ VALIDATION FAILED');
    console.error(err.response?.data || err.message);
    process.exit(1);
  }
}

runTest();
