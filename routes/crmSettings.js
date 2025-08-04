// routes/crmSettings.js
const express = require('express');
const router = express.Router();
const CRMSettings = require('../models/CRMSettings.js');
const auth = require('../middleware/auth.js');

// @route   GET /api/crm-settings
// @desc    Get CRM settings for the user's organization
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    let crmSettings = await CRMSettings.findOne({ 
      organizationId: req.user.organizationId 
    })
    .populate('createdBy', 'firstName lastName email')
    .populate('lastModifiedBy', 'firstName lastName email');
    
    // If no settings exist, create default settings
    if (!crmSettings) {
      crmSettings = await CRMSettings.createDefaultForOrganization(
        req.user.organizationId, 
        req.user.id
      );
      
      // Populate the newly created settings
      crmSettings = await CRMSettings.findById(crmSettings._id)
        .populate('createdBy', 'firstName lastName email')
        .populate('lastModifiedBy', 'firstName lastName email');
    }
    
    res.json({
      success: true,
      data: crmSettings
    });
    
  } catch (error) {
    console.error('Error fetching CRM settings:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error fetching CRM settings' 
    });
  }
});

// @route   PUT /api/crm-settings
// @desc    Update CRM settings for the user's organization
// @access  Private (Admin only)
router.put('/', auth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false,
        message: 'Access denied. Admin privileges required.' 
      });
    }
    
    const { leadFields, leadSources, leadStages, settings } = req.body;
    
    // Find existing settings or create new ones
    let crmSettings = await CRMSettings.findOne({ 
      organizationId: req.user.organizationId 
    });
    
    if (!crmSettings) {
      // Create new settings
      crmSettings = new CRMSettings({
        organizationId: req.user.organizationId,
        leadFields: leadFields || CRMSettings.getDefaultSettings().leadFields,
        leadSources: leadSources || CRMSettings.getDefaultSettings().leadSources,
        leadStages: leadStages || CRMSettings.getDefaultSettings().leadStages,
        settings: settings || CRMSettings.getDefaultSettings().settings,
        createdBy: req.user.id,
        lastModifiedBy: req.user.id
      });
    } else {
      // Update existing settings
      if (leadFields) crmSettings.leadFields = leadFields;
      if (leadSources) crmSettings.leadSources = leadSources;
      if (leadStages) crmSettings.leadStages = leadStages;
      if (settings) crmSettings.settings = { ...crmSettings.settings, ...settings };
      crmSettings.lastModifiedBy = req.user.id;
    }
    
    // Validate field configuration
    const validationErrors = crmSettings.validateFieldConfig();
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validationErrors
      });
    }
    
    // Ensure lead stages have proper order
    if (crmSettings.leadStages && crmSettings.leadStages.length > 0) {
      crmSettings.leadStages.forEach((stage, index) => {
        if (!stage.order) {
          stage.order = index + 1;
        }
      });
      
      // Sort by order
      crmSettings.leadStages.sort((a, b) => a.order - b.order);
    }
    
    // Save settings
    const savedSettings = await crmSettings.save();
    
    // Populate response
    const populatedSettings = await CRMSettings.findById(savedSettings._id)
      .populate('createdBy', 'firstName lastName email')
      .populate('lastModifiedBy', 'firstName lastName email');
    
    console.log(`CRM Settings updated for organization ${req.user.organizationId} by user ${req.user.id}`);
    
    res.json({
      success: true,
      message: 'CRM settings updated successfully',
      data: populatedSettings
    });
    
  } catch (error) {
    console.error('Error updating CRM settings:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error updating CRM settings',
      error: error.message 
    });
  }
});

// @route   POST /api/crm-settings/reset
// @desc    Reset CRM settings to defaults
// @access  Private (Admin only)
router.post('/reset', auth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false,
        message: 'Access denied. Admin privileges required.' 
      });
    }
    
    // Delete existing settings and create default ones
    await CRMSettings.findOneAndDelete({ 
      organizationId: req.user.organizationId 
    });
    
    const defaultSettings = await CRMSettings.createDefaultForOrganization(
      req.user.organizationId, 
      req.user.id
    );
    
    // Populate response
    const populatedSettings = await CRMSettings.findById(defaultSettings._id)
      .populate('createdBy', 'firstName lastName email')
      .populate('lastModifiedBy', 'firstName lastName email');
    
    console.log(`CRM Settings reset to defaults for organization ${req.user.organizationId} by user ${req.user.id}`);
    
    res.json({
      success: true,
      message: 'CRM settings reset to defaults successfully',
      data: populatedSettings
    });
    
  } catch (error) {
    console.error('Error resetting CRM settings:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error resetting CRM settings' 
    });
  }
});

// @route   GET /api/crm-settings/active-sources
// @desc    Get only active lead sources for forms
// @access  Private
router.get('/active-sources', auth, async (req, res) => {
  try {
    const crmSettings = await CRMSettings.findOne({ 
      organizationId: req.user.organizationId 
    });
    
    if (!crmSettings) {
      // Return default active sources if no settings exist
      const defaultSources = CRMSettings.getDefaultSettings().leadSources
        .filter(source => source.active);
      
      return res.json({
        success: true,
        data: defaultSources
      });
    }
    
    const activeSources = crmSettings.leadSources.filter(source => source.active);
    
    res.json({
      success: true,
      data: activeSources
    });
    
  } catch (error) {
    console.error('Error fetching active sources:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error fetching active sources' 
    });
  }
});

// @route   GET /api/crm-settings/active-stages
// @desc    Get only active lead stages for forms
// @access  Private
router.get('/active-stages', auth, async (req, res) => {
  try {
    const crmSettings = await CRMSettings.findOne({ 
      organizationId: req.user.organizationId 
    });
    
    if (!crmSettings) {
      // Return default active stages if no settings exist
      const defaultStages = CRMSettings.getDefaultSettings().leadStages
        .filter(stage => stage.active)
        .sort((a, b) => a.order - b.order);
      
      return res.json({
        success: true,
        data: defaultStages
      });
    }
    
    const activeStages = crmSettings.leadStages
      .filter(stage => stage.active)
      .sort((a, b) => a.order - b.order);
    
    res.json({
      success: true,
      data: activeStages
    });
    
  } catch (error) {
    console.error('Error fetching active stages:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error fetching active stages' 
    });
  }
});

// @route   GET /api/crm-settings/field-config
// @desc    Get field configuration for forms
// @access  Private
router.get('/field-config', auth, async (req, res) => {
  try {
    const crmSettings = await CRMSettings.findOne({ 
      organizationId: req.user.organizationId 
    });
    
    if (!crmSettings) {
      // Return default field config if no settings exist
      const defaultFields = CRMSettings.getDefaultSettings().leadFields
        .filter(field => field.active);
      
      return res.json({
        success: true,
        data: defaultFields
      });
    }
    
    const activeFields = crmSettings.leadFields.filter(field => field.active);
    
    res.json({
      success: true,
      data: activeFields
    });
    
  } catch (error) {
    console.error('Error fetching field config:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error fetching field config' 
    });
  }
});

module.exports = router;