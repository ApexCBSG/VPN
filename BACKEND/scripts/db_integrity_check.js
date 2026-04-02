const mongoose = require('mongoose');
const path = require('path');
const WireGuardPeer = require('../models/WireGuardPeer');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function checkDb() {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('--- DATABASE INTEGRITY CHECK ---');

    const peers = await WireGuardPeer.find().limit(5);
    if (peers.length === 0) {
        console.log('NO PEERS FOUND. Testing empty environment.');
    } else {
        peers.forEach(p => {
            console.log(`User: ${p.userId} | Node: ${p.nodeId}`);
            console.log(`IP: ${p.internalIp} | PubKey: ${p.publicKey}`);
            console.log(`Valid Length (44): ${p.publicKey.length === 44}`);
            console.log('---');
        });
    }

    process.exit(0);
}

checkDb();
