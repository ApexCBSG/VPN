const mongoose = require('mongoose');

const NodeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  countryCode: {
    type: String,
    required: true,
    uppercase: true
  },
  city: String,
  ipAddress: {
    type: String,
    required: true,
    unique: true
  },
  publicKey: {
    type: String,
    required: true
  },
  port: {
    type: Number,
    default: 51820
  },
  isActive: {
    type: Boolean,
    default: true
  },
  load: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  allowedTiers: {
    type: [String],
    default: ['free', 'premium']
  }
}, { timestamps: true });

module.exports = mongoose.model('Node', NodeSchema);
