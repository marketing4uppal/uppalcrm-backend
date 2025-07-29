// routes/leads.js (Updated for Multi-Tenancy with Auto Contact Creation)
const express = require('express');
const router = express.Router();
const Lead = require('../models/Lead.js');
const Contact = require('../models/Contact.js'); // Add this import
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

// POST a new lead for the user's organization (with automatic contact creation)
router.post('/', auth, async (req, res) => {
  const { firstName, lastName, email, phone, leadSource, leadStage } = req.body;
  
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

    // Step 2: Create associated Contact
    const newContact = new Contact({
      firstName,
      lastName,
      email,
      phone,
      leadId: savedLead._id, // Link to the lead we just created
      organizationId: req.user.organizationId, // Same organization
    });

    const savedContact = await newContact.save();

    // Step 3: Return both lead and contact info
    res.status(201).json({
      lead: savedLead,
      contact: savedContact,
      message: 'Lead and Contact created successfully'
    });

  } catch (error) {
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

module.exports = router;