// models/Deal.js (Updated with Soft Delete Support)
const mongoose = require('mongoose');

const dealSchema = new mongoose.Schema({
  // Contact information - stored directly in deal for easy access
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
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  phone: {
    type: String,
    trim: true
  },
  
  // Deal-specific information
  dealName: {
    type: String,
    required: true,
    trim: true
  },
  stage: {
    type: String,
    enum: ['Prospecting', 'Discovery', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost'],
    default: 'Prospecting'
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  probability: {
    type: Number,
    min: 0,
    max: 100,
    default: 10
  },
  expectedRevenue: {
    type: Number,
    default: 0
  },
  closeDate: {
    type: Date,
    required: true
  },
  actualCloseDate: {
    type: Date
  },
  
  // NEW: Deal type classification
  dealType: {
    type: String,
    enum: ['account-setup', 'expansion', 'renewal', 'cross-sell', 'upsell'],
    default: 'account-setup'
  },
  
  // For recurring revenue tracking
  recurringAmount: {
    type: Number,
    min: 0
  },
  recurringPeriod: {
    type: String,
    enum: ['monthly', 'quarterly', 'yearly']
  },
  
  // Product/service information
  product: {
    type: String,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  
  // UPDATED: Enhanced relationship structure for account-centric model
  // Core relationships
  contactId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Contact',
    required: true  // Every deal must have a contact
  },
  leadId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lead'  // Optional - tracks which lead generated this deal
  },
  // NEW: Link to account (for non-setup deals)
  accountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Account'  // Not required for account-setup deals
  },
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },
  
  // Ownership and assignment
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Activity and engagement
  lastActivity: {
    type: Date,
    default: Date.now
  },
  
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
    enum: ['Duplicate', 'Invalid', 'Test Data', 'Spam', 'Lost Opportunity', 'Cancelled', 'Other'],
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

// Indexes for better performance
dealSchema.index({ organizationId: 1, stage: 1 });
dealSchema.index({ contactId: 1 });
dealSchema.index({ leadId: 1 });
dealSchema.index({ accountId: 1 });
dealSchema.index({ owner: 1 });
dealSchema.index({ closeDate: 1 });
dealSchema.index({ createdBy: 1 });

// NEW: Soft delete indexes
dealSchema.index({ isDeleted: 1 });
dealSchema.index({ organizationId: 1, isDeleted: 1 });
dealSchema.index({ stage: 1, isDeleted: 1 });

// Virtual for full name
dealSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// NEW: Soft Delete Methods
dealSchema.methods.softDelete = function(userId, reason, notes) {
  this.isDeleted = true;
  this.deletedAt = new Date();
  this.deletedBy = userId;
  this.deletionReason = reason;
  this.deletionNotes = notes;
  this.lastModifiedBy = userId;
  return this.save();
};

dealSchema.methods.restore = function(userId) {
  this.isDeleted = false;
  this.deletedAt = null;
  this.deletedBy = null;
  this.deletionReason = null;
  this.deletionNotes = null;
  this.lastModifiedBy = userId;
  return this.save();
};

dealSchema.methods.canBeDeleted = function() {
  const warnings = [];
  const blockers = [];
  
  // Check if deal is in advanced stages
  if (this.stage === 'Proposal' || this.stage === 'Negotiation') {
    warnings.push('Deal is in advanced stage - consider if deletion is appropriate');
  }
  
  if (this.stage === 'Closed Won') {
    blockers.push('Cannot delete won deals - they are needed for revenue reporting');
  }
  
  // Check if deal has high value
  if (this.amount > 10000) {
    warnings.push('Deal has high value - ensure deletion is intentional');
  }
  
  // Check if deal is close to closing
  if (this.closeDate && this.closeDate <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)) {
    warnings.push('Deal is close to closing date - consider if deletion is appropriate');
  }
  
  // Check if deal has created an account
  if (this.accountId) {
    blockers.push('Cannot delete deal - it has created an associated account');
  }
  
  return {
    canDelete: blockers.length === 0,
    warnings: warnings,
    blockers: blockers
  };
};

// NEW: Static methods for soft delete
dealSchema.statics.findActive = function(filter = {}) {
  return this.find({ ...filter, isDeleted: { $ne: true } });
};

dealSchema.statics.findDeleted = function(filter = {}) {
  return this.find({ ...filter, isDeleted: true });
};

dealSchema.statics.findWithDeleted = function(filter = {}) {
  return this.find(filter);
};

// Pre-save middleware to calculate expected revenue
dealSchema.pre('save', function(next) {
  if (this.amount && this.probability) {
    this.expectedRevenue = this.amount * (this.probability / 100);
  }
  next();
});

// Post-save middleware: When account-setup deal is won, create account
dealSchema.post('save', async function(doc) {
  if (doc.stage === 'Closed Won' && doc.dealType === 'account-setup' && !doc.accountId && !doc.isDeleted) {
    const Account = mongoose.model('Account');
    
    try {
      const account = new Account({
        accountName: `${doc.product || 'Service'} - ${doc.firstName} ${doc.lastName}`,
        serviceType: 'basic',
        status: 'active',
        accountHolderName: `${doc.firstName} ${doc.lastName}`,
        currentMonthlyPrice: doc.recurringAmount || doc.amount,
        billingCycle: 'monthly',
        startDate: doc.actualCloseDate || new Date(),
        renewalDate: (() => {
          const renewalDate = new Date(doc.actualCloseDate || new Date());
          renewalDate.setMonth(renewalDate.getMonth() + 1);
          return renewalDate;
        })(),
        contactId: doc.contactId,
        organizationId: doc.organizationId,
        createdBy: doc.createdBy,
        lastModifiedBy: doc.lastModifiedBy || doc.createdBy
      });
      
      await account.save();
      
      // Link back to deal
      doc.accountId = account._id;
      await doc.save();
    } catch (error) {
      console.error('Error auto-creating account:', error);
    }
  }
});

// Enable virtual fields in JSON output
dealSchema.set('toJSON', { virtuals: true });
dealSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Deal', dealSchema);