// routes/contacts.js
const express = require('express');
const router = express.Router();
const Contact = require('../models/Contact.js');

// @route   GET /api/contacts
// @desc    Get all contacts
router.get('/', async (req, res) => {
  try {
    const contacts = await Contact.find().sort({ createdAt: -1 });
    res.status(200).json(contacts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   POST /api/contacts
// @desc    Create a new contact
router.post('/', async (req, res) => {
  const { firstName, lastName, email, phone, leadId } = req.body;
  try {
    const newContact = new Contact({
      firstName,
      lastName,
      email,
      phone,
      leadId,
    });
    const savedContact = await newContact.save();
    res.status(201).json(savedContact);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;