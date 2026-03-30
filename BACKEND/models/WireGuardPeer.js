const mongoose = require('mongoose');

const WireGuardPeerSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  nodeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Node',
    required: true
  },
  publicKey: {
    type: String,
    required: true
  },
  psk: String,
  internalIp: {
    type: String,
    required: true
  }
}, { timestamps: true });

module.exports = mongoose.model('WireGuardPeer', WireGuardPeerSchema);
