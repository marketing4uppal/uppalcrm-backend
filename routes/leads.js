// routes/leads.js (Updated)
const express = require('express');
const router = express.Router();
const Lead = require('../models/Lead.js');
const auth = require('../middleware/auth.js'); // <<< NEW: Import the auth middleware

// We add 'auth' as a second argument.
// Now, only authenticated users can access this route.
router.get('/', auth, async (req, res) => { // <<< UPDATED
  try {
    const leads = await Lead.find().sort({ createdAt: -1 });
    res.status(200).json(leads);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/', auth, async (req, res) => { // <<< UPDATED
  const { firstName, lastName, email, phone, leadSource, leadStage } = req.body;
  try {
    const newLead = new Lead({ firstName, lastName, email, phone, leadSource, leadStage });
    const savedLead = await newLead.save();
    res.status(201).json(savedLead);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;