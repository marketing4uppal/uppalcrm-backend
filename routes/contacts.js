// routes/contacts.js (Updated for Multi-Tenancy)
const express = require('express');
const router = express.Router();
const Contact = require('../models/Contact.js');
const auth = require('../middleware/auth.js');

// GET all contacts for the user's organization
router.get('/', auth, async (req, res) => {
  try {
    const contacts = await Contact.find({ organizationId: req.user.organizationId }).sort({ createdAt: -1 });
    res.status(200).json(contacts);
  } catch (error) {
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
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;