// models/DealStage.js
const mongoose = require('mongoose');

const dealStageSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  order: {
    type: Number,
    required: true
  },
  probability: {
    type: Number,
    min: 0,
    max: 100,
    default: 50
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isDefault: {
    type: Boolean,
    default: false
  },
  color: {
    type: String,
    default: '#3B82F6' // Blue color
  },
  description: {
    type: String,
    trim: true
  },
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Indexes
dealStageSchema.index({ organizationId: 1, order: 1 });
dealStageSchema.index({ organizationId: 1, isActive: 1 });

// Ensure only one default stage per organization
dealStageSchema.pre('save', async function(next) {
  if (this.isDefault && this.isModified('isDefault')) {
    await this.constructor.updateMany(
      { 
        organizationId: this.organizationId, 
        _id: { $ne: this._id } 
      },
      { isDefault: false }
    );
  }
  next();
});

module.exports = mongoose.model('DealStage', dealStageSchema);