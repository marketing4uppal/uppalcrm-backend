// models/Account.js (Fixed - Complete File)
const mongoose = require('mongoose');

const AccountSchema = new mongoose.Schema({
  // Account identification
  accountNumber: {
    type: String,
    required: false,  // Changed to false so pre-save can run first
    unique: true
  },
  accountName: {
    type: String,
    required: true,
    trim: true
  },
  
  // Account details
  serviceType: {
    type: String,
    required: true,
    enum: ['basic', 'premium', 'enterprise', 'family', 'student'],
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended', 'cancelled', 'expired', 'pending'],
    default: 'pending'
  },
  
  // Account holder (who uses the service)
  accountHolderName: {
    type: String,
    required: true,
    trim: true
  },
  accountHolderEmail: {
    type: String,
    trim: true,
    lowercase: true
  },
  relationship: {
    type: String,
    enum: ['self', 'spouse', 'child', 'parent', 'sibling', 'friend', 'employee', 'other'],
    default: 'self'
  },
  
  // Billing
  currentMonthlyPrice: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    enum: ['USD', 'EUR', 'GBP', 'CAD', 'AUD'],
    default: 'USD'
  },
  billingCycle: {
    type: String,
    enum: ['monthly', 'quarterly', 'annually'],
    default: 'monthly'
  },
  
  // Dates
  startDate: {
    type: Date,
    required: true
  },
  renewalDate: {
    type: Date,
    required: true
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
  
  // Notes
  notes: {
    type: String,
    trim: true
  }
}, { 
  timestamps: true 
});

// Auto-generate account number
AccountSchema.pre('save', async function(next) {
  try {
    if (this.isNew && !this.accountNumber) {
      console.log('Generating account number for organizationId:', this.organizationId);
      const count = await this.constructor.countDocuments({ organizationId: this.organizationId });
      this.accountNumber = `ACC-${this.organizationId.toString().slice(-6).toUpperCase()}-${(count + 1).toString().padStart(4, '0')}`;
      console.log('Generated account number:', this.accountNumber);
    }
    
    // Now ensure accountNumber exists (making it effectively required)
    if (!this.accountNumber) {
      return next(new Error('Account number is required'));
    }
    
    next();
  } catch (error) {
    console.error('Error generating account number:', error);
    next(error);
  }
});

module.exports = mongoose.model('Account', AccountSchema);