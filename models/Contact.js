// models/Contact.js (Proper Fix - Only lastName required)
const mongoose = require('mongoose');

const ContactSchema = new mongoose.Schema(
  {
    firstName: { 
      type: String, 
      required: false,  // ✅ CHANGED: No longer required
      trim: true,
      min: 1,  // Changed from 2 to 1 to allow single characters
      max: 50
    },
    lastName: { 
      type: String, 
      required: true,   // ✅ KEPT: Still required
      trim: true,
      min: 1,  // Changed from 2 to 1 to allow single characters
      max: 50
    },
    email: { 
      type: String, 
      required: false,  // ✅ CHANGED: No longer required
      trim: true,
      lowercase: true,
      max: 100
    },
    phone: { 
      type: String,
      required: false,  // ✅ CONFIRMED: Not required
      trim: true
    },
    
    // Additional contact fields
    company: {
      type: String,
      required: false,  // ✅ CONFIRMED: Not required
      trim: true
    },
    jobTitle: {
      type: String,
      required: false,  // ✅ CONFIRMED: Not required
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