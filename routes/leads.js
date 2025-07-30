// routes/leads.js (Updated for Multi-Tenancy with Auto Contact Creation and History Tracking)
const express = require('express');
const router = express.Router();
const Lead = require('../models/Lead.js');
const Contact = require('../models/Contact.js');
const LeadHistory = require('../models/LeadHistory.js'); // Add this import
const auth = require('../middleware/auth.js');

// GET all leads for the user's organization
router.get('/', auth, async (req, res) => {
  try {
    // Find only leads that match the user's organizationId
    const leads = await Lead.find({ organizationId: req.user.organizationId }).sort({ createdAt: -1 });
    res.status(200).json(leads);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET single lead by ID (NEW - needed for sync)
router.get('/:id', auth, async (req, res) => {
  try {
    const lead = await Lead.findOne({ 
      _id: req.params.id, 
      organizationId: req.user.organizationId 
    });
    
    if (!lead) {
      return res.status(404).json({ message: 'Lead not found' });
    }
    
    res.status(200).json(lead);
  } catch (error) {
    console.error('Error fetching lead:', error);
    res.status(500).json({ message: error.message });
  }
});

// POST a new lead for the user's organization (with automatic contact creation and history tracking)
router.post('/', auth, async (req, res) => {
  const { firstName, lastName, email, phone, leadSource, leadStage } = req.body;
  
  console.log('Creating lead with data:', { firstName, lastName, email }); // Debug log
  
  try {
    // Step 1: Create the Lead first
    const newLead = new Lead({
      firstName,
      lastName,
      email,
      phone,
      leadSource,
      leadStage,
      organizationId: req.user.organizationId, // Automatically assign the organizationId
    });
    
    const savedLead = await newLead.save();
    console.log('Lead created successfully:', savedLead._id); // Debug log

    // Step 2: Create history entry for lead creation
    const historyEntry = new LeadHistory({
      leadId: savedLead._id,
      action: 'created',
      changes: {
        firstName: 'created',
        lastName: 'created',
        email: 'created',
        phone: phone ? 'created' : undefined,
        leadSource: leadSource ? 'created' : undefined,
        leadStage: leadStage || 'New'
      },
      oldValues: {}, // No old values for creation
      newValues: {
        firstName,
        lastName,
        email,
        phone: phone || null,
        leadSource: leadSource || null,
        leadStage: leadStage || 'New'
      },
      userId: req.user.id,
      organizationId: req.user.organizationId
    });
    
    await historyEntry.save();
    console.log('Lead history entry created'); // Debug log

    // Step 3: Create associated Contact
    const newContact = new Contact({
      firstName,
      lastName,
      email,
      phone,
      leadId: savedLead._id, // Link to the lead we just created
      organizationId: req.user.organizationId, // Same organization
    });

    const savedContact = await newContact.save();
    console.log('Contact created successfully:', savedContact._id); // Debug log

    // Step 4: Return both lead and contact info
    res.status(201).json({
      lead: savedLead,
      contact: savedContact,
      message: 'Lead, Contact, and History created successfully'
    });

  } catch (error) {
    console.error('Error in lead creation:', error); // Debug log
    
    // Handle duplicate email errors nicely
    if (error.code === 11000) {
      if (error.keyPattern?.email) {
        return res.status(400).json({ 
          message: 'A lead or contact with this email already exists' 
        });
      }
    }
    
    res.status(400).json({ message: error.message });
  }
});

// PUT update a lead (with history tracking)
router.put('/:id', auth, async (req, res) => {
  const { firstName, lastName, email, phone, leadSource, leadStage } = req.body;
  
  try {
    // Step 1: Get the current lead to compare changes
    const currentLead = await Lead.findOne({ 
      _id: req.params.id, 
      organizationId: req.user.organizationId 
    });
    
    if (!currentLead) {
      return res.status(404).json({ message: 'Lead not found' });
    }

    // Step 2: Update the lead
    const updatedLead = await Lead.findByIdAndUpdate(
      req.params.id,
      { firstName, lastName, email, phone, leadSource, leadStage },
      { new: true }
    );

    // Step 3: Track what changed
    const changes = {};
    const oldValues = {};
    const newValues = {};

    if (currentLead.firstName !== firstName) {
      changes.firstName = 'updated';
      oldValues.firstName = currentLead.firstName;
      newValues.firstName = firstName;
    }
    if (currentLead.lastName !== lastName) {
      changes.lastName = 'updated';
      oldValues.lastName = currentLead.lastName;
      newValues.lastName = lastName;
    }
    if (currentLead.email !== email) {
      changes.email = 'updated';
      oldValues.email = currentLead.email;
      newValues.email = email;
    }
    if (currentLead.phone !== phone) {
      changes.phone = 'updated';
      oldValues.phone = currentLead.phone;
      newValues.phone = phone;
    }
    if (currentLead.leadSource !== leadSource) {
      changes.leadSource = 'updated';
      oldValues.leadSource = currentLead.leadSource;
      newValues.leadSource = leadSource;
    }
    if (currentLead.leadStage !== leadStage) {
      changes.leadStage = 'updated';
      oldValues.leadStage = currentLead.leadStage;
      newValues.leadStage = leadStage;
    }

    // Step 4: Create history entry if there were changes
    if (Object.keys(changes).length > 0) {
      const historyEntry = new LeadHistory({
        leadId: updatedLead._id,
        action: changes.leadStage ? 'status_changed' : 'updated',
        changes,
        oldValues,
        newValues,
        userId: req.user.id,
        organizationId: req.user.organizationId
      });
      
      await historyEntry.save();
    }

    res.status(200).json({
      lead: updatedLead,
      message: 'Lead updated successfully'
    });

  } catch (error) {
    console.error('Error updating lead:', error);
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;