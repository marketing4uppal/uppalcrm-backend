// models/Deal.js (Updated for Account-Centric Architecture)
const mongoose = require('mongoose');

const dealSchema = new mongoose.Schema({
  // Deal identification
  dealName: {
    type: String,
    required: true,
    trim: true
  },
  dealType: {
    type: String,
    enum: ['account-setup', 'renewal', 'upgrade', 'downgrade', 'add-on', 'one-time-service', 'cancellation'],
    default: 'account-setup'
  },
  
  // Contact information (from lead/contact)
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
  
  // Deal progression
  stage: {
    type: String,
    enum: ['Qualified', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost'],
    default: 'Qualified',
    required: true
  },
  
  // Financial information
  amount: {
    type: Number,
    default: 0,
    min: 0
  },
  recurringAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  currency: {
    type: String,
    enum: ['USD', 'EUR', 'GBP', 'CAD', 'AUD'],
    default: 'USD'
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
  
  // Timeline
  closeDate: {
    type: Date,
    required: true
  },
  actualCloseDate: {
    type: Date
  },
  
  // Deal details
  leadSource: {
    type: String,
    enum: ['website', 'social-media', 'referral', 'email-campaign', 'cold-call', 'trade-show', 'google-ads', 'linkedin', 'other'],
    required: true
  },
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

// Post-save middleware: When account-setup deal is won, create account
dealSchema.post('save', async function(doc) {
  if (doc.stage === 'Closed Won' && doc.dealType === 'account-setup' && !doc.accountId) {
    const Account = mongoose.model('Account');
    
    try {
      const account = new Account({
        accountName: `${doc.product || 'Service'} - ${doc.firstName} ${doc.lastName}`,
        serviceType: 'basic', // Default, can be customized
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
        createdBy: doc.createdBy
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