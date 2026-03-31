const mongoose = require('mongoose');

const UsageLogSchema = new mongoose.Schema({
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
  action: {
    type: String,
    enum: ['connected', 'disconnected', 'heartbeat'],
    default: 'heartbeat'
  },
  bytesIn: {
    type: Number,
    default: 0
  },
  bytesOut: {
    type: Number,
    default: 0
  },
  duration: {
    type: Number, // In seconds
    default: 0
  }
}, { timestamps: true });

module.exports = mongoose.model('UsageLog', UsageLogSchema);
