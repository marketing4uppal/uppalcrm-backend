// models/Contact.js (Fix Email Uniqueness Issue)
const mongoose = require('mongoose');

const ContactSchema = new mongoose.Schema(
  {
    firstName: { 
      type: String, 
      required: false,  // ✅ Not required
      trim: true,
      min: 1,
      max: 50
    },
    lastName: { 
      type: String, 
      required: true,   // ✅ Still required
      trim: true,
      min: 1,
      max: 50
    },
    email: { 
  type: String, 
  required: false,  // Make it optional
  trim: true,
  lowercase: true,
  max: 100,
  default: null,    // Default to null
  validate: {
    validator: function(v) {
      // If email is provided, it must be valid
      if (v === null || v === undefined || v === '') return true;
      return /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(v);
    },
    message: 'Please enter a valid email'
  }
},
    phone: { 
      type: String,
      required: false,  // ✅ Not required
      trim: true
    },
    
    // Additional contact fields
    company: {
      type: String,
      required: false,
      trim: true
    },
    jobTitle: {
      type: String,
      required: false,
      trim: true
    },
    address: {
      street: { type: String, trim: true },
      city: { type: String, trim: true },
      state: { type: String, trim: true },
      zipCode: { type: String, trim: true },
      country: { type: String, trim: true }
    },
    
    // Social/Web presence
    linkedin: { type: String, trim: true },
    website: { type: String, trim: true },
    
    // Notes and tags
    notes: { type: String, trim: true },
    tags: [{ type: String, trim: true }],
    
    // Status
    isActive: { type: Boolean, default: true },
    
    // Organization relationship
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },
    
    // Tracking
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    lastContactedDate: {
      type: Date
    }
  },
  { timestamps: true }
);

// ✅ FIX: Pre-save middleware to handle empty emails
ContactSchema.pre('save', function(next) {
  // Convert empty email strings to undefined so they don't conflict with uniqueness
  if (this.email === '') {
    this.email = undefined;
  }
  next();
});

// Indexes for performance
ContactSchema.index({ organizationId: 1, email: 1 });
ContactSchema.index({ organizationId: 1, lastName: 1, firstName: 1 });
ContactSchema.index({ organizationId: 1, company: 1 });
ContactSchema.index({ createdBy: 1 });

// Virtual for full name
ContactSchema.virtual('fullName').get(function() {
  const firstName = this.firstName || '';
  const lastName = this.lastName || '';
  return `${firstName} ${lastName}`.trim();
});

// Virtual to get all leads for this contact
ContactSchema.virtual('leads', {
  ref: 'Lead',
  localField: '_id',
  foreignField: 'contactId'
});

// Virtual to get all accounts for this contact
ContactSchema.virtual('accounts', {
  ref: 'Account',
  localField: '_id',
  foreignField: 'contactId'
});

// Virtual to get all deals for this contact
ContactSchema.virtual('deals', {
  ref: 'Deal',
  localField: '_id',
  foreignField: 'contactId'
});

// Enable virtual fields in JSON output
ContactSchema.set('toJSON', { virtuals: true });
ContactSchema.set('toObject', { virtuals: true });

const Contact = mongoose.model('Contact', ContactSchema);
module.exports = Contact;