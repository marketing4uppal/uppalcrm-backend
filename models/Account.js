// models/Account.js (Updated with Soft Delete Support)
const mongoose = require('mongoose');

const accountSchema = new mongoose.Schema({
  accountName: {
    type: String,
    required: true,
    trim: true
  },
  
  // Service information
  serviceType: {
    type: String,
    enum: ['basic', 'premium', 'enterprise', 'custom'],
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'suspended', 'cancelled', 'trial'],
    default: 'active'
  },
  
  // Financial information
  currentMonthlyPrice: {
    type: Number,
    required: true,
    min: 0
  },
  billingCycle: {
    type: String,
    enum: ['monthly', 'quarterly', 'yearly'],
    default: 'monthly'
  },
  totalRevenue: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // Contact information
  accountHolderName: {
    type: String,
    required: true,
    trim: true
  },
  
  // Important dates
  startDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  renewalDate: {
    type: Date,
    required: true
  },
  lastPaymentDate: {
    type: Date
  },
  
  // Relationships
  contactId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Contact',
    required: true
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
  },
  
  // Additional fields
  notes: {
    type: String,
    trim: true
  },
  tags: [{
    type: String,
    trim: true
  }],
  
  // NEW: Soft Delete Fields
  isDeleted: {
    type: Boolean,
    default: false,
    index: true
  },
  deletedAt: {
    type: Date,
    default: null
  },
  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  deletionReason: {
    type: String,
    enum: ['Duplicate', 'Invalid', 'Test Data', 'Account Closed', 'Migrated', 'Cancelled', 'Other'],
    default: null
  },
  deletionNotes: {
    type: String,
    default: null,
    trim: true
  },
  
  // NEW: Audit fields
  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Indexes for performance
accountSchema.index({ organizationId: 1, status: 1 });
accountSchema.index({ contactId: 1 });
accountSchema.index({ createdBy: 1 });
accountSchema.index({ renewalDate: 1 });
accountSchema.index({ status: 1 });

// NEW: Soft delete indexes
accountSchema.index({ isDeleted: 1 });
accountSchema.index({ organizationId: 1, isDeleted: 1 });
accountSchema.index({ status: 1, isDeleted: 1 });

// Virtual to get all deals related to this account
accountSchema.virtual('deals', {
  ref: 'Deal',
  localField: '_id',
  foreignField: 'accountId'
});

// NEW: Soft Delete Methods
accountSchema.methods.softDelete = function(userId, reason, notes) {
  this.isDeleted = true;
  this.deletedAt = new Date();
  this.deletedBy = userId;
  this.deletionReason = reason;
  this.deletionNotes = notes;
  this.lastModifiedBy = userId;
  return this.save();
};

accountSchema.methods.restore = function(userId) {
  this.isDeleted = false;
  this.deletedAt = null;
  this.deletedBy = null;
  this.deletionReason = null;
  this.deletionNotes = null;
  this.lastModifiedBy = userId;
  return this.save();
};

accountSchema.methods.canBeDeleted = function() {
  const warnings = [];
  const blockers = [];
  
  // Check if account is active
  if (this.status === 'active') {
    blockers.push('Cannot delete active account - suspend or cancel first');
  }
  
  // Check if account has recent activity
  if (this.lastPaymentDate && this.lastPaymentDate > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)) {
    warnings.push('Account has recent payment activity');
  }
  
  // Check if account has high value
  if (this.totalRevenue > 5000) {
    warnings.push('Account has high lifetime value - ensure deletion is appropriate');
  }
  
  // Check renewal date
  if (this.renewalDate && this.renewalDate > new Date()) {
    warnings.push('Account has future renewal date - consider if deletion is appropriate');
  }
  
  return {
    canDelete: blockers.length === 0,
    warnings: warnings,
    blockers: blockers
  };
};

// NEW: Static methods for soft delete
accountSchema.statics.findActive = function(filter = {}) {
  return this.find({ ...filter, isDeleted: { $ne: true } });
};

accountSchema.statics.findDeleted = function(filter = {}) {
  return this.find({ ...filter, isDeleted: true });
};

accountSchema.statics.findWithDeleted = function(filter = {}) {
  return this.find(filter);
};

// Pre-save middleware for business logic
accountSchema.pre('save', function(next) {
  // Auto-calculate renewal date if not set
  if (!this.renewalDate && this.startDate) {
    const renewalDate = new Date(this.startDate);
    switch (this.billingCycle) {
      case 'monthly':
        renewalDate.setMonth(renewalDate.getMonth() + 1);
        break;
      case 'quarterly':
        renewalDate.setMonth(renewalDate.getMonth() + 3);
        break;
      case 'yearly':
        renewalDate.setFullYear(renewalDate.getFullYear() + 1);
        break;
    }
    this.renewalDate = renewalDate;
  }
  next();
});

// Enable virtual fields in JSON output
accountSchema.set('toJSON', { virtuals: true });
accountSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Account', accountSchema);