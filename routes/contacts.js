// routes/contacts.js (Updated)
const express = require('express');
const router = express.Router();
const Contact = require('../models/Contact.js');
const auth = require('../middleware/auth.js'); // <<< NEW: Import the auth middleware

router.get('/', auth, async (req, res) => { // <<< UPDATED
  try {
    const contacts = await Contact.find().sort({ createdAt: -1 });
    res.status(200).json(contacts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/', auth, async (req, res) => { // <<< UPDATED
  const { firstName, lastName, email, phone, leadId } = req.body;
  try {
    const newContact = new Contact({ firstName, lastName, email, phone, leadId });
    const savedContact = await newContact.save();
    res.status(201).json(savedContact);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;