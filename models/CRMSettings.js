// models/CRMSettings.js
const mongoose = require('mongoose');

const CRMSettingsSchema = new mongoose.Schema({
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    unique: true
  },
  
  leadFields: [{
    id: { type: Number, required: true },
    name: { type: String, required: true },
    label: { type: String, required: true },
    type: { type: String, required: true },
    required: { type: Boolean, default: false },
    active: { type: Boolean, default: true },
    placeholder: { type: String }
  }],
  
  leadSources: [{
    id: { type: Number, required: true },
    value: { type: String, required: true },
    label: { type: String, required: true },
    active: { type: Boolean, default: true }
  }],
  
  leadStages: [{
    id: { type: Number, required: true },
    value: { type: String, required: true },
    label: { type: String, required: true },
    active: { type: Boolean, default: true },
    order: { type: Number, default: 1 }
  }],
  
  settings: {
    type: Object,
    default: {}
  },
  
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { timestamps: true });

// Static method to get default settings
CRMSettingsSchema.statics.getDefaultSettings = function() {
  return {
    leadFields: [
      { id: 1, name: 'firstName', label: 'First Name', type: 'text', required: false, active: true }, // FALSE
      { id: 2, name: 'lastName', label: 'Last Name', type: 'text', required: true, active: true },   // TRUE
      { id: 3, name: 'email', label: 'Email', type: 'email', required: false, active: true },        // FALSE
      { id: 4, name: 'phone', label: 'Phone', type: 'tel', required: false, active: true },
      { id: 5, name: 'leadSource', label: 'Lead Source', type: 'select', required: false, active: true }
    ],
    
    leadSources: [
      { id: 1, value: 'website', label: 'Website', active: true },
      { id: 2, value: 'social-media', label: 'Social Media', active: true },
      { id: 3, value: 'referral', label: 'Referral', active: true },
      { id: 4, value: 'email-campaign', label: 'Email Campaign', active: true },
      { id: 5, value: 'cold-call', label: 'Cold Call', active: true },
      { id: 6, value: 'trade-show', label: 'Trade Show', active: true },
      { id: 7, value: 'other', label: 'Other', active: true }
    ],
    
    leadStages: [
      { id: 1, value: 'New', label: 'New', active: true, order: 1 },
      { id: 2, value: 'Contacted', label: 'Contacted', active: true, order: 2 },
      { id: 3, value: 'Qualified', label: 'Qualified', active: true, order: 3 },
      { id: 4, value: 'Won', label: 'Won', active: true, order: 4 },
      { id: 5, value: 'Lost', label: 'Lost', active: true, order: 5 }
    ],
    
    settings: {}
  };
};

// Static method to create default settings for organization
CRMSettingsSchema.statics.createDefaultForOrganization = async function(organizationId, userId) {
  const defaultSettings = this.getDefaultSettings();
  
  const crmSettings = new this({
    organizationId: organizationId,
    leadFields: defaultSettings.leadFields,
    leadSources: defaultSettings.leadSources,
    leadStages: defaultSettings.leadStages,
    settings: defaultSettings.settings,
    createdBy: userId,
    lastModifiedBy: userId
  });
  
  return await crmSettings.save();
};

// Instance method to validate field configuration
CRMSettingsSchema.methods.validateFieldConfig = function() {
  const errors = [];
  
  // Ensure at least lastName is required
  const hasRequiredField = this.leadFields.some(field => field.required);
  if (!hasRequiredField) {
    errors.push('At least one field must be required');
  }
  
  return errors;
};

module.exports = mongoose.model('CRMSettings', CRMSettingsSchema);