// models/Contact.js (Updated for Account-Centric Architecture)
const mongoose = require('mongoose');

const ContactSchema = new mongoose.Schema(
  {
    firstName: { 
      type: String, 
      required: false,  // ← CHANGED: Made optional
      trim: true,
      max: 50
    },
    lastName: { 
      type: String, 
      required: true,
      trim: true,
      min: 2,
      max: 50
    },
    email: { 
      type: String, 
      required: false,  // ← CHANGED: Made optional
      trim: true,
      lowercase: true,
      max: 100,
      default: null,    // ← ADDED: Default to null
      validate: {
        validator: function(v) {
          // If email is provided, it must be valid
          if (v === null || v === undefined || v === '') return true;
          return /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(v);
        },
        message: 'Please enter a valid email'
      }
      // Removed unique constraint to allow same contact for multiple leads
    },
    phone: { 
      type: String,
      trim: true
    },
    
    // Additional contact fields
    company: {
      type: String,
      trim: true
    },
    jobTitle: {
      type: String,
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

// Indexes for performance - UPDATED to handle null emails
ContactSchema.index(
  { organizationId: 1, email: 1 }, 
  { 
    partialFilterExpression: { email: { $ne: null } },  // Only index non-null emails
    sparse: true 
  }
);
ContactSchema.index({ organizationId: 1, lastName: 1, firstName: 1 });
ContactSchema.index({ organizationId: 1, company: 1 });
ContactSchema.index({ createdBy: 1 });

// Virtual for full name
ContactSchema.virtual('fullName').get(function() {
  return `${this.firstName || ''} ${this.lastName}`.trim();
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