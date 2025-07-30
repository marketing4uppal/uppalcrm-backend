// models/Deal.js
const mongoose = require('mongoose');

const dealSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  stage: {
    type: String,
    enum: ['Qualified', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost'],
    default: 'Qualified',
    required: true
  },
  closeDate: {
    type: Date,
    required: true
  },
  leadSource: {
    type: String,
    enum: ['website', 'social-media', 'referral', 'email-campaign', 'cold-call', 'trade-show', 'other'],
    required: true
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amount: {
    type: Number,
    default: 0,
    min: 0
  },
  currency: {
    type: String,
    enum: ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'INR'],
    default: 'USD'
  },
  product: {
    type: String,
    trim: true
  },
  // Relationships
  leadId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lead',
    required: true
  },
  contactId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Contact'
  },
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },
  // Additional fields
  description: {
    type: String,
    trim: true
  },
  probability: {
    type: Number,
    min: 0,
    max: 100,
    default: 50
  },
  expectedRevenue: {
    type: Number,
    default: function() {
      return this.amount * (this.probability / 100);
    }
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  lastActivity: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for better performance
dealSchema.index({ organizationId: 1, stage: 1 });
dealSchema.index({ leadId: 1 });
dealSchema.index({ contactId: 1 });
dealSchema.index({ owner: 1 });
dealSchema.index({ closeDate: 1 });

// Virtual for full name
dealSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Pre-save middleware to calculate expected revenue
dealSchema.pre('save', function(next) {
  if (this.amount && this.probability) {
    this.expectedRevenue = this.amount * (this.probability / 100);
  }
  next();
});

module.exports = mongoose.model('Deal', dealSchema);