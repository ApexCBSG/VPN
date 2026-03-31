const mongoose = require('mongoose');

const PlanSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  price: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'USD'
  },
  duration: {
    type: String,
    enum: ['monthly', 'yearly', 'lifetime'],
    required: true
  },
  revenueCatPackageId: {
    type: String,
    required: true,
    unique: true
  },
  features: [{
    type: String
  }],
  isFeatured: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  sortOrder: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

module.exports = mongoose.model('Plan', PlanSchema);
