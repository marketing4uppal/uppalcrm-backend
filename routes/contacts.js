// routes/contacts.js (Updated for Account-Centric Architecture)
const express = require('express');
const router = express.Router();
const Contact = require('../models/Contact.js');
const auth = require('../middleware/auth.js');

// GET all contacts for the user's organization
router.get('/', auth, async (req, res) => {
  try {
    let query = { organizationId: req.user.organizationId };
    
    const contacts = await Contact.find(query)
      .populate({
        path: 'leads',
        match: { organizationId: req.user.organizationId }
      })
      .populate({
        path: 'accounts',
        match: { organizationId: req.user.organizationId }
      })
      .populate({
        path: 'deals',
        match: { organizationId: req.user.organizationId }
      })
      .sort({ createdAt: -1 });
    
    res.status(200).json(contacts);
  } catch (error) {
    console.error('Error fetching contacts:', error);
    res.status(500).json({ message: error.message });
  }
});

// GET single contact by ID with all related data
router.get('/:id', auth, async (req, res) => {
  try {
    const contact = await Contact.findOne({ 
      _id: req.params.id, 
      organizationId: req.user.organizationId 
    })
    .populate({
      path: 'leads',
      match: { organizationId: req.user.organizationId },
      options: { sort: { createdAt: -1 } }
    })
    .populate({
      path: 'accounts',
      match: { organizationId: req.user.organizationId },
      options: { sort: { createdAt: -1 } }
    })
    .populate({
      path: 'deals',
      match: { organizationId: req.user.organizationId },
      options: { sort: { createdAt: -1 } }
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
  const { 
    firstName, 
    lastName, 
    email, 
    phone, 
    company, 
    jobTitle, 
    address, 
    linkedin, 
    website, 
    notes, 
    tags 
  } = req.body;
  
  try {
    const newContact = new Contact({
      firstName,
      lastName,
      email,
      phone,
      company,
      jobTitle,
      address,
      linkedin,
      website,
      notes,
      tags,
      organizationId: req.user.organizationId,
      createdBy: req.user.id
    });
    
    const savedContact = await newContact.save();
    res.status(201).json({
      contact: savedContact,
      message: 'Contact created successfully'
    });
  } catch (error) {
    console.error('Error creating contact:', error);
    res.status(400).json({ message: error.message });
  }
});

// PUT update a contact
router.put('/:id', auth, async (req, res) => {
  const { 
    firstName, 
    lastName, 
    email, 
    phone, 
    company, 
    jobTitle, 
    address, 
    linkedin, 
    website, 
    notes, 
    tags,
    isActive 
  } = req.body;
  
  try {
    const updatedContact = await Contact.findOneAndUpdate(
      { _id: req.params.id, organizationId: req.user.organizationId },
      { 
        firstName, 
        lastName, 
        email, 
        phone, 
        company, 
        jobTitle, 
        address, 
        linkedin, 
        website, 
        notes, 
        tags,
        isActive,
        lastContactedDate: new Date()
      },
      { new: true }
    )
    .populate({
      path: 'leads',
      match: { organizationId: req.user.organizationId }
    })
    .populate({
      path: 'accounts',
      match: { organizationId: req.user.organizationId }
    })
    .populate({
      path: 'deals',
      match: { organizationId: req.user.organizationId }
    });

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

// DELETE a contact
router.delete('/:id', auth, async (req, res) => {
  try {
    const deletedContact = await Contact.findOneAndDelete({
      _id: req.params.id,
      organizationId: req.user.organizationId
    });

    if (!deletedContact) {
      return res.status(404).json({ message: 'Contact not found' });
    }

    res.status(200).json({ message: 'Contact deleted successfully' });
  } catch (error) {
    console.error('Error deleting contact:', error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;