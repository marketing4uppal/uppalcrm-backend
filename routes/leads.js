// routes/leads.js

const express = require('express');
const router = express.Router();
const Lead = require('../models/Lead.js'); // Go up one directory and into models to find Lead.js

// @route   GET /api/leads
// @desc    Get all leads
router.get('/', async (req, res) => {
  try {
    const leads = await Lead.find().sort({ createdAt: -1 }); // Get all leads, sort by newest first
    res.status(200).json(leads);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   POST /api/leads
// @desc    Create a new lead
router.post('/', async (req, res) => {
  // Get the data from the request body
  const { firstName, lastName, email, phone, leadSource, leadStage } = req.body;

  try {
    const newLead = new Lead({
      firstName,
      lastName,
      email,
      phone,
      leadSource,
      leadStage,
    });

    const savedLead = await newLead.save();
    res.status(201).json(savedLead); // 201 status means "Created"
  } catch (error) {
    res.status(400).json({ message: error.message }); // 400 status means "Bad Request"
  }
});

module.exports = router;