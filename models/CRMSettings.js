// models/CRMSettings.js
const mongoose = require('mongoose');

const CRMSettingsSchema = new mongoose.Schema({
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    unique: true
  },
  
  // Lead Fields Configuration
  leadFields: [{
    id: { type: Number, required: true },
    name: { type: String, required: true },
    label: { type: String, required: true },
    type: { 
      type: String, 
      enum: ['text', 'email', 'tel', 'select', 'textarea', 'number', 'date'],
      required: true 
    },
    required: { type: Boolean, default: false },
    active: { type: Boolean, default: true },
    options: [String], // For select type fields
    placeholder: String,
    validation: {
      minLength: Number,
      maxLength: Number,
      pattern: String
    }
  }],
  
  // Lead Sources Configuration
  leadSources: [{
    id: { type: Number, required: true },
    value: { type: String, required: true },
    label: { type: String, required: true },
    active: { type: Boolean, default: true },
    color: { type: String, default: '#3B82F6' },
    description: String
  }],
  
  // Lead Stages Configuration
  leadStages: [{
    id: { type: Number, required: true },
    value: { type: String, required: true },
    label: { type: String, required: true },
    active: { type: Boolean, default: true },
    color: { type: String, default: '#10B981' },
    order: { type: Number, required: true },
    description: String
  }],
  
  // Additional CRM Settings
  settings: {
    autoAssignLeads: { type: Boolean, default: false },
    leadScoring: { type: Boolean, default: false },
    emailNotifications: { type: Boolean, default: true },
    duplicateDetection: { type: Boolean, default: true },
    leadExpiration: { type: Number, default: 30 }, // days
    maxLeadsPerUser: { type: Number, default: 1000 }
  },
  
  // Audit fields
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Indexes
CRMSettingsSchema.index({ organizationId: 1 });

// Static method to get default settings
CRMSettingsSchema.statics.getDefaultSettings = function() {
  return {
    leadFields: [
      { id: 1, name: 'firstName', label: 'First Name', type: 'text', required: false, active: true }, // Changed to optional
      { id: 2, name: 'lastName', label: 'Last Name', type: 'text', required: true, active: true },
      { id: 3, name: 'email', label: 'Email', type: 'email', required: false, active: true },
      { id: 4, name: 'phone', label: 'Phone', type: 'tel', required: false, active: true },
      { id: 5, name: 'leadSource', label: 'Lead Source', type: 'select', required: false, active: true },
      { id: 6, name: 'company', label: 'Company', type: 'text', required: false, active: true },
      { id: 7, name: 'jobTitle', label: 'Job Title', type: 'text', required: false, active: true }
    ],
    leadSources: [
      { id: 1, value: 'website', label: 'Website', active: true, color: '#3B82F6' },
      { id: 2, value: 'social-media', label: 'Social Media', active: true, color: '#8B5CF6' },
      { id: 3, value: 'referral', label: 'Referral', active: true, color: '#10B981' },
      { id: 4, value: 'email-campaign', label: 'Email Campaign', active: true, color: '#F59E0B' },
      { id: 5, value: 'cold-call', label: 'Cold Call', active: true, color: '#EF4444' },
      { id: 6, value: 'trade-show', label: 'Trade Show', active: true, color: '#06B6D4' },
      { id: 7, value: 'google-ads', label: 'Google Ads', active: true, color: '#84CC16' },
      { id: 8, value: 'linkedin', label: 'LinkedIn', active: true, color: '#0EA5E9' },
      { id: 9, value: 'other', label: 'Other', active: true, color: '#6B7280' }
    ],
    leadStages: [
      { id: 1, value: 'New', label: 'New', active: true, color: '#3B82F6', order: 1 },
      { id: 2, value: 'Contacted', label: 'Contacted', active: true, color: '#8B5CF6', order: 2 },
      { id: 3, value: 'Qualified', label: 'Qualified', active: true, color: '#10B981', order: 3 },
      { id: 4, value: 'Proposal', label: 'Proposal', active: true, color: '#F59E0B', order: 4 },
      { id: 5, value: 'Won', label: 'Won', active: true, color: '#22C55E', order: 5 },
      { id: 6, value: 'Lost', label: 'Lost', active: true, color: '#EF4444', order: 6 }
    ],
    settings: {
      autoAssignLeads: false,
      leadScoring: false,
      emailNotifications: true,
      duplicateDetection: true,
      leadExpiration: 30,
      maxLeadsPerUser: 1000
    }
  };
};

// Method to create default settings for an organization
CRMSettingsSchema.statics.createDefaultForOrganization = async function(organizationId, createdBy) {
  const defaultSettings = this.getDefaultSettings();
  
  const crmSettings = new this({
    organizationId,
    ...defaultSettings,
    createdBy,
    lastModifiedBy: createdBy
  });
  
  return await crmSettings.save();
};

// Method to validate field configurations
CRMSettingsSchema.methods.validateFieldConfig = function() {
  const errors = [];
  
  // Ensure required fields are present and active
  const requiredFields = ['lastName']; // Only Last Name is required now
  const activeRequiredFields = this.leadFields.filter(field => 
    requiredFields.includes(field.name) && field.active
  );
  
  if (activeRequiredFields.length !== requiredFields.length) {
    errors.push('Last Name field must be active');
  }
  
  // Ensure at least email or phone is active for contact purposes
  const contactFields = this.leadFields.filter(field => 
    ['email', 'phone'].includes(field.name) && field.active
  );
  
  if (contactFields.length === 0) {
    errors.push('At least Email or Phone field must be active for contact purposes');
  }
  
  return errors;
};

const CRMSettings = mongoose.model('CRMSettings', CRMSettingsSchema);
module.exports = CRMSettings;