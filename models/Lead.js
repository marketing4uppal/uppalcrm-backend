// models/Lead.js (Updated for Account-Centric Architecture + Soft Delete)
const mongoose = require('mongoose');

const LeadSchema = new mongoose.Schema(
  {
    // Lead inquiry details
    firstName: { 
      type: String, 
      required: false,  // ← CHANGED: Made optional
      max: 50,
      trim: true
    },
    lastName: { 
      type: String, 
      required: true, 
      min: 2, 
      max: 50,
      trim: true
    },
    email: { 
      type: String, 
      required: false,  // ← CHANGED: Made optional
      max: 100,
      trim: true,
      lowercase: true,
      default: null,    // ← ADDED: Default to null
      validate: {
        validator: function(v) {
          // If email is provided, it must be valid
          if (v === null || v === undefined || v === '') return true;
          return /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(v);
        },
        message: 'Please enter a valid email'
      }
      // Removed unique constraint - same person can have multiple leads
    },
    phone: { 
      type: String, 
      default: "",
      trim: true
    },
    
    // Lead-specific information
    leadSource: { 
      type: String, 
      enum: ['website', 'social-media', 'referral', 'email-campaign', 'cold-call', 'trade-show', 'google-ads', 'linkedin', 'other'],
      default: "other"
    },
    leadStage: { 
      type: String, 
      enum: ["New", "Contacted", "Qualified", "Lost", "Won"], 
      default: "New"
    },
    
    // Lead details
    company: {
      type: String,
      trim: true
    },
    jobTitle: {
      type: String,
      trim: true
    },
    inquiryType: {
      type: String,
      enum: ['new-account', 'renewal', 'upgrade', 'support', 'general', 'other'],
      default: 'new-account'
    },
    productInterest: {
      type: String,
      trim: true
    },
    budget: {
      type: String,
      enum: ['under-100', '100-500', '500-1000', '1000-5000', '5000+', 'not-specified'],
      default: 'not-specified'
    },
    timeline: {
      type: String,
      enum: ['immediate', '1-month', '1-3-months', '3-6-months', '6-12-months', 'not-specified'],
      default: 'not-specified'
    },
    
    // Lead scoring
    score: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    
    // Notes and description
    description: {
      type: String,
      trim: true
    },
    notes: {
      type: String,
      trim: true
    },
    
    // References
    contactId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Contact',
      required: true
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },
    
    // Assignment and tracking
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    
    // Activity tracking
    lastContactedDate: {
      type: Date
    },
    nextFollowUpDate: {
      type: Date
    },
    
    // Lead conversion
    convertedDate: {
      type: Date
    },
    conversionNotes: {
      type: String,
      trim: true
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
      enum: ['Duplicate', 'Invalid', 'Test Data', 'Spam', 'Request Removal', 'Converted', 'Lost', 'Other'],
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
LeadSchema.index({ organizationId: 1, leadStage: 1 });
LeadSchema.index({ contactId: 1 });
LeadSchema.index({ assignedTo: 1 });
LeadSchema.index({ createdBy: 1 });
LeadSchema.index({ leadSource: 1 });
LeadSchema.index({ score: -1 });
LeadSchema.index({ nextFollowUpDate: 1 });

// NEW: Soft delete indexes
LeadSchema.index({ isDeleted: 1 });
LeadSchema.index({ organizationId: 1, isDeleted: 1 });
LeadSchema.index({ leadStage: 1, isDeleted: 1 });
LeadSchema.index({ createdAt: -1, isDeleted: 1 });

// Email index - UPDATED to handle null emails
LeadSchema.index(
  { email: 1, isDeleted: 1 }, 
  { 
    partialFilterExpression: { email: { $ne: null } },  // Only index non-null emails
    sparse: true 
  }
);

// Virtual for full name
LeadSchema.virtual('fullName').get(function() {
  return `${this.firstName || ''} ${this.lastName}`.trim();
});

// NEW: Soft delete methods
LeadSchema.methods.softDelete = function(userId, reason, notes) {
  this.isDeleted = true;
  this.deletedAt = new Date();
  this.deletedBy = userId;
  this.deletionReason = reason;
  this.deletionNotes = notes;
  this.lastModifiedBy = userId;
  return this.save();
};

LeadSchema.methods.restore = function(userId) {
  this.isDeleted = false;
  this.deletedAt = null;
  this.deletedBy = null;
  this.deletionReason = null;
  this.deletionNotes = null;
  this.lastModifiedBy = userId;
  return this.save();
};

// Query helpers for soft delete
LeadSchema.query.notDeleted = function() {
  return this.where({ isDeleted: { $ne: true } });
};

LeadSchema.query.onlyDeleted = function() {
  return this.where({ isDeleted: true });
};

const Lead = mongoose.model('Lead', LeadSchema);
module.exports = Lead;