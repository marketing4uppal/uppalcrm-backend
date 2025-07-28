// routes/leads.js (Updated for Multi-Tenancy)
const express = require('express');
const router = express.Router();
const Lead = require('../models/Lead.js');
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

// POST a new lead for the user's organization
router.post('/', auth, async (req, res) => {
  const { firstName, lastName, email, phone, leadSource, leadStage } = req.body;
  try {
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
    res.status(201).json(savedLead);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;