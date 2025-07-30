// routes/leads.js (Updated with Auto Deal Creation)
const express = require('express');
const router = express.Router();
const Lead = require('../models/Lead.js');
const Contact = require('../models/Contact.js');
const Deal = require('../models/Deal.js');
const LeadHistory = require('../models/LeadHistory.js');
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

// GET single lead by ID (needed for sync)
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

    // Step 4: If lead is Qualified, create a Deal
    let createdDeal = null;
    if (leadStage === 'Qualified') {
      try {
        const newDeal = new Deal({
          firstName,
          lastName,
          stage: 'Qualified',
          closeDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
          leadSource,
          owner: req.user.id,
          amount: 0, // Default amount, can be updated later
          currency: 'USD',
          leadId: savedLead._id,
          contactId: savedContact._id,
          organizationId: req.user.organizationId,
          createdBy: req.user.id
        });

        createdDeal = await newDeal.save();
        console.log('Deal created successfully:', createdDeal._id);
      } catch (dealError) {
        console.error('Error creating deal:', dealError);
        // Don't fail the whole operation if deal creation fails
      }
    }

    // Step 5: Return response
    const response = {
      lead: savedLead,
      contact: savedContact,
      message: 'Lead and Contact created successfully'
    };

    if (createdDeal) {
      response.deal = createdDeal;
      response.message = 'Lead, Contact, and Deal created successfully';
    }

    res.status(201).json(response);

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

// PUT update a lead (with history tracking and deal creation)
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

    // Step 5: Check if lead was just marked as Qualified and create deal
    let createdDeal = null;
    if (currentLead.leadStage !== 'Qualified' && leadStage === 'Qualified') {
      try {
        // Find associated contact
        const associatedContact = await Contact.findOne({ leadId: updatedLead._id });
        
        // Check if deal already exists for this lead
        const existingDeal = await Deal.findOne({ leadId: updatedLead._id });
        
        if (!existingDeal) {
          const newDeal = new Deal({
            firstName,
            lastName,
            stage: 'Qualified',
            closeDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
            leadSource,
            owner: req.user.id,
            amount: 0, // Default amount
            currency: 'USD',
            leadId: updatedLead._id,
            contactId: associatedContact ? associatedContact._id : null,
            organizationId: req.user.organizationId,
            createdBy: req.user.id
          });

          createdDeal = await newDeal.save();
          console.log('Deal created for qualified lead:', createdDeal._id);
        }
      } catch (dealError) {
        console.error('Error creating deal for qualified lead:', dealError);
        // Don't fail the whole operation
      }
    }

    const response = {
      lead: updatedLead,
      message: 'Lead updated successfully'
    };

    if (createdDeal) {
      response.deal = createdDeal;
      response.message = 'Lead updated and Deal created successfully';
    }

    res.status(200).json(response);

  } catch (error) {
    console.error('Error updating lead:', error);
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;