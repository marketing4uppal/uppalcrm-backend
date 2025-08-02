// models/Lead.js (Updated for Account-Centric Architecture + Soft Delete)
const mongoose = require('mongoose');

const LeadSchema = new mongoose.Schema(
  {
    // Lead inquiry details
    firstName: { 
      type: String, 
      required: true, 
      min: 2, 
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
      required: true, 
      max: 100,
      trim: true,
      lowercase: true
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
    
    // NEW: Audit fields (you might want to add lastModifiedBy to your existing schema)
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
LeadSchema.index({ email: 1, isDeleted: 1 });
LeadSchema.index({ leadStage: 1, isDeleted: 1 });
LeadSchema.index({ createdAt: -1, isDeleted: 1 });

// Virtual for full name
LeadSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Virtual to get deals created from this lead
LeadSchema.virtual('deals', {
  ref: 'Deal',
  localField: '_id',
  foreignField: 'leadId'
});

// NEW: Soft Delete Methods
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

LeadSchema.methods.canBeDeleted = function() {
  const warnings = [];
  const blockers = [];
  
  // Check if lead is in advanced stage
  if (this.leadStage === 'Qualified') {
    warnings.push('Lead is qualified - consider converting to deal instead');
  }
  
  if (this.leadStage === 'Won') {
    blockers.push('Cannot delete won leads - they should remain for reporting');
  }
  
  // Check if lead has high score
  if (this.score > 70) {
    warnings.push('Lead has high score - may be valuable');
  }
  
  // Check if lead has been converted
  if (this.convertedDate) {
    blockers.push('Cannot delete converted leads - they are linked to accounts/deals');
  }
  
  // Check if lead has upcoming follow-up
  if (this.nextFollowUpDate && this.nextFollowUpDate > new Date()) {
    warnings.push('Lead has scheduled follow-up - consider rescheduling');
  }
  
  // Check budget value
  if (['1000-5000', '5000+'].includes(this.budget)) {
    warnings.push('Lead has high budget potential');
  }
  
  // Check timeline urgency
  if (['immediate', '1-month'].includes(this.timeline)) {
    warnings.push('Lead has urgent timeline');
  }
  
  return {
    canDelete: blockers.length === 0,
    warnings: warnings,
    blockers: blockers
  };
};

// NEW: Static methods for soft delete
LeadSchema.statics.findActive = function(filter = {}) {
  return this.find({ ...filter, isDeleted: false });
};

LeadSchema.statics.findDeleted = function(filter = {}) {
  return this.find({ ...filter, isDeleted: true });
};

LeadSchema.statics.findAll = function(filter = {}) {
  return this.find(filter);
};

// NEW: Pre-find middleware to exclude deleted items by default
LeadSchema.pre(/^find/, function() {
  // Only apply filter if isDeleted is not explicitly set in the query
  if (!this.getQuery().hasOwnProperty('isDeleted')) {
    this.where({ isDeleted: { $ne: true } });
  }
});

// Pre-save middleware for lead scoring (your existing logic)
LeadSchema.pre('save', function(next) {
  // Skip scoring if lead is being deleted
  if (this.isDeleted) {
    return next();
  }
  
  let score = 0;
  
  // Score based on lead source
  const sourceScores = {
    'referral': 20,
    'website': 15,
    'linkedin': 15,
    'google-ads': 10,
    'social-media': 10,
    'email-campaign': 8,
    'trade-show': 12,
    'cold-call': 5,
    'other': 3
  };
  score += sourceScores[this.leadSource] || 0;
  
  // Score based on budget
  const budgetScores = {
    '5000+': 30,
    '1000-5000': 25,
    '500-1000': 20,
    '100-500': 15,
    'under-100': 5,
    'not-specified': 0
  };
  score += budgetScores[this.budget] || 0;
  
  // Score based on timeline
  const timelineScores = {
    'immediate': 25,
    '1-month': 20,
    '1-3-months': 15,
    '3-6-months': 10,
    '6-12-months': 5,
    'not-specified': 0
  };
  score += timelineScores[this.timeline] || 0;
  
  // Additional scoring factors
  if (this.company) score += 10;
  if (this.jobTitle && (this.jobTitle.includes('director') || this.jobTitle.includes('manager') || this.jobTitle.includes('ceo') || this.jobTitle.includes('owner'))) {
    score += 15;
  }
  if (this.productInterest) score += 5;
  
  this.score = Math.min(score, 100);
  next();
});

// Enable virtual fields in JSON output
LeadSchema.set('toJSON', { virtuals: true });
LeadSchema.set('toObject', { virtuals: true });

const Lead = mongoose.model("Lead", LeadSchema);
module.exports = Lead;