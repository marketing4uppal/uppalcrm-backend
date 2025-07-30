// routes/deals.js
const express = require('express');
const router = express.Router();
const Deal = require('../models/Deal.js');
const DealStage = require('../models/DealStage.js');
const auth = require('../middleware/auth.js');

// GET all deals for the user's organization
router.get('/', auth, async (req, res) => {
  try {
    let query = { organizationId: req.user.organizationId };
    
    // Support query by leadId for related records
    if (req.query.leadId) {
      query.leadId = req.query.leadId;
    }
    
    // Support query by contactId for related records
    if (req.query.contactId) {
      query.contactId = req.query.contactId;
    }
    
    const deals = await Deal.find(query)
      .populate('owner', 'name email')
      .populate('leadId', 'firstName lastName email')
      .populate('contactId', 'firstName lastName email')
      .sort({ createdAt: -1 });
      
    res.status(200).json(deals);
  } catch (error) {
    console.error('Error fetching deals:', error);
    res.status(500).json({ message: error.message });
  }
});

// GET single deal by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const deal = await Deal.findOne({ 
      _id: req.params.id, 
      organizationId: req.user.organizationId 
    })
    .populate('owner', 'name email')
    .populate('leadId', 'firstName lastName email leadSource leadStage')
    .populate('contactId', 'firstName lastName email phone');
    
    if (!deal) {
      return res.status(404).json({ message: 'Deal not found' });
    }
    
    res.status(200).json(deal);
  } catch (error) {
    console.error('Error fetching deal:', error);
    res.status(500).json({ message: error.message });
  }
});

// POST create a new deal
router.post('/', auth, async (req, res) => {
  const { 
    firstName, 
    lastName, 
    stage, 
    closeDate, 
    leadSource, 
    owner, 
    amount, 
    currency, 
    product, 
    leadId, 
    contactId,
    description,
    probability 
  } = req.body;
  
  try {
    const newDeal = new Deal({
      firstName,
      lastName,
      stage,
      closeDate,
      leadSource,
      owner: owner || req.user.id,
      amount: amount || 0,
      currency: currency || 'USD',
      product,
      leadId,
      contactId,
      organizationId: req.user.organizationId,
      description,
      probability: probability || 50,
      createdBy: req.user.id
    });
    
    const savedDeal = await newDeal.save();
    
    // Populate the response
    const populatedDeal = await Deal.findById(savedDeal._id)
      .populate('owner', 'name email')
      .populate('leadId', 'firstName lastName email')
      .populate('contactId', 'firstName lastName email');
    
    res.status(201).json({
      deal: populatedDeal,
      message: 'Deal created successfully'
    });
    
  } catch (error) {
    console.error('Error creating deal:', error);
    res.status(400).json({ message: error.message });
  }
});

// PUT update a deal
router.put('/:id', auth, async (req, res) => {
  const { 
    firstName, 
    lastName, 
    stage, 
    closeDate, 
    leadSource, 
    owner, 
    amount, 
    currency, 
    product,
    description,
    probability 
  } = req.body;
  
  try {
    const updatedDeal = await Deal.findOneAndUpdate(
      { _id: req.params.id, organizationId: req.user.organizationId },
      { 
        firstName, 
        lastName, 
        stage, 
        closeDate, 
        leadSource, 
        owner, 
        amount, 
        currency, 
        product,
        description,
        probability,
        lastActivity: new Date()
      },
      { new: true }
    )
    .populate('owner', 'name email')
    .populate('leadId', 'firstName lastName email')
    .populate('contactId', 'firstName lastName email');

    if (!updatedDeal) {
      return res.status(404).json({ message: 'Deal not found' });
    }

    res.status(200).json({
      deal: updatedDeal,
      message: 'Deal updated successfully'
    });

  } catch (error) {
    console.error('Error updating deal:', error);
    res.status(400).json({ message: error.message });
  }
});

// DELETE a deal
router.delete('/:id', auth, async (req, res) => {
  try {
    const deletedDeal = await Deal.findOneAndDelete({
      _id: req.params.id,
      organizationId: req.user.organizationId
    });

    if (!deletedDeal) {
      return res.status(404).json({ message: 'Deal not found' });
    }

    res.status(200).json({ message: 'Deal deleted successfully' });
  } catch (error) {
    console.error('Error deleting deal:', error);
    res.status(500).json({ message: error.message });
  }
});

// GET deal stages for organization
router.get('/stages/list', auth, async (req, res) => {
  try {
    const stages = await DealStage.find({ 
      organizationId: req.user.organizationId,
      isActive: true 
    }).sort({ order: 1 });
    
    res.status(200).json(stages);
  } catch (error) {
    console.error('Error fetching deal stages:', error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;