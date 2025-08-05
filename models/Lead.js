// models/Lead.js (Proper Fix - Only lastName required)
const mongoose = require('mongoose');

const LeadSchema = new mongoose.Schema(
  {
    // Lead inquiry details
    firstName: { 
      type: String, 
      required: false,  // ✅ CHANGED: No longer required
      min: 1,           // Changed from 2 to 1 to be more flexible
      max: 50,
      trim: true
    },
    lastName: { 
      type: String, 
      required: true,   // ✅ KEPT: Still required
      min: 1,           // Changed from 2 to 1 to be more flexible
      max: 50,
      trim: true
    },
    email: { 
      type: String, 
      required: false,  // ✅ CHANGED: No longer required
      max: 100,
      trim: true,
      lowercase: true
    },
    phone: { 
      type: String, 
      required: false,  // ✅ CONFIRMED: Not required
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
      required: false,  // ✅ CONFIRMED: Not required
      trim: true
    },
    jobTitle: {
      type: String,
      required: false,  // ✅ CONFIRMED: Not required
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
      required: true
    },
    
    // Assignment and ownership
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    lastModifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    
    // Soft delete support
    isDeleted: {
      type: Boolean,
      default: false
    },
    deletedAt: {
      type: Date
    },
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    deletionReason: {
      type: String,
      trim: true
    },
    deletionNotes: {
      type: String,
      trim: true
    }
  },
  { timestamps: true }
);

// Indexes for performance
LeadSchema.index({ organizationId: 1, leadStage: 1 });
LeadSchema.index({ organizationId: 1, leadSource: 1 });
LeadSchema.index({ organizationId: 1, email: 1 });
LeadSchema.index({ organizationId: 1, isDeleted: 1 });
LeadSchema.index({ contactId: 1 });
LeadSchema.index({ assignedTo: 1 });
LeadSchema.index({ createdBy: 1 });

// Virtual for full name
LeadSchema.virtual('fullName').get(function() {
  const firstName = this.firstName || '';
  const lastName = this.lastName || '';
  return `${firstName} ${lastName}`.trim();
});

// Method to check if lead can be deleted
LeadSchema.methods.canBeDeleted = function() {
  // Add your business logic here
  return {
    canDelete: true,
    blockers: []
  };
};

// Method to restore a soft-deleted lead
LeadSchema.methods.restore = function(userId) {
  this.isDeleted = false;
  this.deletedAt = undefined;
  this.deletedBy = undefined;
  this.deletionReason = undefined;
  this.deletionNotes = undefined;
  this.lastModifiedBy = userId;
  return this.save();
};

// Enable virtual fields in JSON output
LeadSchema.set('toJSON', { virtuals: true });
LeadSchema.set('toObject', { virtuals: true });

const Lead = mongoose.model('Lead', LeadSchema);
module.exports = Lead;