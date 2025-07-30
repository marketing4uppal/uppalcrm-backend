// routes/contacts.js (Updated for Multi-Tenancy with Sync Support)
const express = require('express');
const router = express.Router();
const Contact = require('../models/Contact.js');
const auth = require('../middleware/auth.js');

// GET all contacts for the user's organization (with optional leadId query)
router.get('/', auth, async (req, res) => {
  try {
    let query = { organizationId: req.user.organizationId };
    
    // Support query by leadId for sync functionality
    if (req.query.leadId) {
      query.leadId = req.query.leadId;
    }
    
    const contacts = await Contact.find(query).sort({ createdAt: -1 });
    res.status(200).json(contacts);
  } catch (error) {
    console.error('Error fetching contacts:', error);
    res.status(500).json({ message: error.message });
  }
});

// GET single contact by ID (NEW - needed for sync)
router.get('/:id', auth, async (req, res) => {
  try {
    const contact = await Contact.findOne({ 
      _id: req.params.id, 
      organizationId: req.user.organizationId 
    });
    
    if (!contact) {
      return res.status(404).json({ message: 'Contact not found' });
    }
    
    res.status(200).json(contact);
  } catch (error) {
    console.error('Error fetching contact:', error);
    res.status(500).json({ message: error.message });
  }
});

// POST a new contact for the user's organization
router.post('/', auth, async (req, res) => {
  const { firstName, lastName, email, phone, leadId } = req.body;
  try {
    const newContact = new Contact({
      firstName,
      lastName,
      email,
      phone,
      leadId,
      organizationId: req.user.organizationId, // Automatically assign the organizationId
    });
    const savedContact = await newContact.save();
    res.status(201).json(savedContact);
  } catch (error) {
    console.error('Error creating contact:', error);
    res.status(400).json({ message: error.message });
  }
});

// PUT update a contact (with enhanced response for sync)
router.put('/:id', auth, async (req, res) => {
  const { firstName, lastName, email, phone, leadId } = req.body;
  
  try {
    const updatedContact = await Contact.findOneAndUpdate(
      { _id: req.params.id, organizationId: req.user.organizationId },
      { firstName, lastName, email, phone, leadId },
      { new: true }
    );

    if (!updatedContact) {
      return res.status(404).json({ message: 'Contact not found' });
    }

    res.status(200).json({
      contact: updatedContact,
      message: 'Contact updated successfully'
    });

  } catch (error) {
    console.error('Error updating contact:', error);
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;