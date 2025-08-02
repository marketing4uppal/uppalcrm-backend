// models/Contact.js (Updated with Soft Delete Support)
const mongoose = require('mongoose');

const ContactSchema = new mongoose.Schema(
  {
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
    company: {
      type: String,
      trim: true
    },
    jobTitle: {
      type: String,
      trim: true
    },
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String
    },
    linkedin: {
      type: String,
      trim: true
    },
    website: {
      type: String,
      trim: true
    },
    notes: {
      type: String,
      trim: true
    },
    tags: [{
      type: String,
      trim: true
    }],
    isActive: {
      type: Boolean,
      default: true
    },
    lastContactedDate: {
      type: Date
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
    
    // NEW: Soft Delete Fields
    isDeleted: {
      type: Boolean,
      default: false,
      index: true // Index for better query performance
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
      enum: ['Duplicate', 'Invalid', 'Test Data', 'Spam', 'Request Removal', 'Associated Lead Deleted', 'Other'],
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
  },
  { timestamps: true }
);

// Existing indexes
ContactSchema.index({ organizationId: 1, email: 1 }, { unique: true });
ContactSchema.index({ organizationId: 1, company: 1 });
ContactSchema.index({ organizationId: 1, lastName: 1, firstName: 1 });

// NEW: Soft delete indexes
ContactSchema.index({ isDeleted: 1 });
ContactSchema.index({ organizationId: 1, isDeleted: 1 });
ContactSchema.index({ email: 1, isDeleted: 1 });

// Virtual for full name
ContactSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Virtual to get related leads
ContactSchema.virtual('leads', {
  ref: 'Lead',
  localField: '_id',
  foreignField: 'contactId'
});

// Virtual to get related accounts
ContactSchema.virtual('accounts', {
  ref: 'Account',
  localField: '_id',
  foreignField: 'contactId'
});

// Virtual to get related deals
ContactSchema.virtual('deals', {
  ref: 'Deal',
  localField: '_id',
  foreignField: 'contactId'
});

// NEW: Soft Delete Methods
ContactSchema.methods.softDelete = function(userId, reason, notes) {
  this.isDeleted = true;
  this.deletedAt = new Date();
  this.deletedBy = userId;
  this.deletionReason = reason;
  this.deletionNotes = notes;
  this.lastModifiedBy = userId;
  return this.save();
};

ContactSchema.methods.restore = function(userId) {
  this.isDeleted = false;
  this.deletedAt = null;
  this.deletedBy = null;
  this.deletionReason = null;
  this.deletionNotes = null;
  this.lastModifiedBy = userId;
  return this.save();
};

ContactSchema.methods.canBeDeleted = function() {
  const warnings = [];
  const blockers = [];
  
  // Check if contact has active relationships
  // Note: You would need to check actual related records here
  // This is a placeholder for the logic
  
  return {
    canDelete: blockers.length === 0,
    warnings: warnings,
    blockers: blockers
  };
};

// NEW: Static methods for soft delete
ContactSchema.statics.findActive = function(filter = {}) {
  return this.find({ ...filter, isDeleted: { $ne: true } });
};

ContactSchema.statics.findDeleted = function(filter = {}) {
  return this.find({ ...filter, isDeleted: true });
};

ContactSchema.statics.findWithDeleted = function(filter = {}) {
  return this.find(filter);
};

// Pre-save middleware to set lastModifiedBy
ContactSchema.pre('save', function(next) {
  if (this.isModified() && !this.isNew) {
    // lastModifiedBy should be set manually in the route handlers
  }
  next();
});

// Export the model
module.exports = mongoose.model('Contact', ContactSchema);