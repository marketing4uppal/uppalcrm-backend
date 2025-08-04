// models/Contact.js (Updated - firstName Optional)
const mongoose = require('mongoose');

const ContactSchema = new mongoose.Schema(
  {
    firstName: { 
      type: String, 
      required: false,  // CHANGED: Made optional
      trim: true,
      min: 2,
      max: 50,
      default: ""  // ADDED: Default empty string
    },
    lastName: { 
      type: String, 
      required: true,  // Keep required for identification
      trim: true,
      min: 2,
      max: 50
    },
    email: { 
      type: String, 
      required: false,  // Already optional from previous changes
      trim: true,
      lowercase: true,
      max: 100,
      default: ""  // ADDED: Default empty string
    },
    phone: { 
      type: String,
      trim: true,
      default: ""
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
    },
    
    // Soft delete fields (if needed)
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
      default: null
    },
    deletionNotes: {
      type: String,
      default: null,
      trim: true
    },
    lastModifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  { timestamps: true }
);

// Indexes for performance
ContactSchema.index({ organizationId: 1, email: 1 });
ContactSchema.index({ organizationId: 1, lastName: 1, firstName: 1 });
ContactSchema.index({ organizationId: 1, company: 1 });
ContactSchema.index({ createdBy: 1 });
ContactSchema.index({ isDeleted: 1 });
ContactSchema.index({ organizationId: 1, isDeleted: 1 });

// UPDATED: Virtual for full name - handles optional firstName
ContactSchema.virtual('fullName').get(function() {
  const firstName = this.firstName || '';
  const lastName = this.lastName || '';
  return `${firstName} ${lastName}`.trim() || 'Unknown';
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

// UPDATED: Pre-validation middleware to handle optional firstName
ContactSchema.pre('validate', function(next) {
  // Ensure we have lastName for identification
  if (!this.lastName || this.lastName.trim() === '') {
    const error = new Error('Last Name is required for contact identification');
    error.path = 'lastName';
    return next(error);
  }
  
 // COMMENTED OUT - allowing leads/contacts with no email or phone
// if ((!this.email || this.email.trim() === '') && (!this.phone || this.phone.trim() === '')) {
//   const error = new Error('Either email or phone is required for contact purposes');
//   error.path = 'contact';
//   return next(error);
// }
  
  next();
});

// Enable virtual fields in JSON output
ContactSchema.set('toJSON', { virtuals: true });
ContactSchema.set('toObject', { virtuals: true });

const Contact = mongoose.model('Contact', ContactSchema);
module.exports = Contact;