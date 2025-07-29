// routes/leadHistory.js
const express = require('express');
const router = express.Router();
const LeadHistory = require('../models/LeadHistory.js');
const auth = require('../middleware/auth.js');

// GET lead history for a specific lead
router.get('/:leadId', auth, async (req, res) => {
  try {
    const { leadId } = req.params;
    
    const history = await LeadHistory.find({ 
      leadId: leadId,
      organizationId: req.user.organizationId 
    })
    .populate('userId', 'firstName lastName')
    .sort({ createdAt: -1 });
    
    res.status(200).json(history);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;