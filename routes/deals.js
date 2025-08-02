// routes/deals.js (Updated with Soft Delete Support)
const express = require('express');
const router = express.Router();
const Deal = require('../models/Deal.js');
const Contact = require('../models/Contact.js');
const Account = require('../models/Account.js');
const auth = require('../middleware/auth.js');

// GET all deals for the user's organization (UPDATED to handle soft delete)
router.get('/', auth, async (req, res) => {
  try {
    const { includeDeleted = false, deletedOnly = false } = req.query;
    
    let query = { organizationId: req.user.organizationId };
    
    // Soft delete filtering
    if (deletedOnly === 'true') {
      query.isDeleted = true;
    } else if (includeDeleted !== 'true') {
      query.isDeleted = { $ne: true };
    }
    
    const deals = await Deal.find(query)
      .populate('contactId', 'firstName lastName email phone')
      .populate('leadId', 'firstName lastName email')
      .populate('accountId', 'accountName serviceType status')
      .populate('owner', 'firstName lastName email')
      .populate('createdBy', 'firstName lastName email')
      .populate('deletedBy', 'firstName lastName email')
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
    .populate('contactId', 'firstName lastName email phone')
    .populate('leadId', 'firstName lastName email')
    .populate('accountId', 'accountName serviceType status')
    .populate('owner', 'firstName lastName email')
    .populate('createdBy', 'firstName lastName email')
    .populate('deletedBy', 'firstName lastName email');
    
    if (!deal) {
      return res.status(404).json({ message: 'Deal not found' });
    }
    
    res.status(200).json(deal);
  } catch (error) {
    console.error('Error fetching deal:', error);
    res.status(500).json({ message: error.message });
  }
});

// NEW: GET delete info for a deal
router.get('/:id/delete-info', auth, async (req, res) => {
  try {
    const deal = await Deal.findOne({
      _id: req.params.id,
      organizationId: req.user.organizationId,
      isDeleted: { $ne: true }
    });
      
    if (!deal) {
      return res.status(404).json({ error: 'Deal not found' });
    }
    
    // Check dependencies
    const dependencies = [];
    
    // Check if deal has created an account
    if (deal.accountId) {
      const account = await Account.findById(deal.accountId);
      if (account && !account.isDeleted) {
        dependencies.push({
          type: 'account',
          count: 1,
          message: `Deal has created account: ${account.accountName}`
        });
      }
    }
    
    // Check deal validation rules
    const deletionCheck = deal.canBeDeleted();
    deletionCheck.dependencies = dependencies;
    deletionCheck.canDeleteSafely = dependencies.length === 0;
    
    res.json({
      deal: {
        id: deal._id,
        name: deal.dealName,
        stage: deal.stage,
        amount: deal.amount,
        closeDate: deal.closeDate,
        contactName: `${deal.firstName} ${deal.lastName}`
      },
      deletionCheck,
      options: {
        softDelete: true,
        hardDelete: false
      }
    });
  } catch (error) {
    console.error('Error fetching deal delete info:', error);
    res.status(500).json({ error: error.message });
  }
});

// NEW: POST soft delete a deal
router.post('/:id/soft-delete', auth, async (req, res) => {
  try {
    const { reason, notes } = req.body;
    
    if (!reason) {
      return res.status(400).json({ error: 'Reason is required' });
    }
    
    const deal = await Deal.findOne({
      _id: req.params.id,
      organizationId: req.user.organizationId,
      isDeleted: { $ne: true }
    });
      
    if (!deal) {
      return res.status(404).json({ error: 'Deal not found' });
    }
    
    // Check if deal can be deleted
    const deletionCheck = deal.canBeDeleted();
    if (!deletionCheck.canDelete) {
      return res.status(400).json({ 
        error: 'Deal cannot be deleted', 
        blockers: deletionCheck.blockers 
      });
    }
    
    // Soft delete the deal
    await Deal.findByIdAndUpdate(deal._id, {
      isDeleted: true,
      deletedAt: new Date(),
      deletedBy: req.user.id,
      deletionReason: reason,
      deletionNotes: notes,
      lastModifiedBy: req.user.id
    });
    
    console.log(`SOFT DELETE: Deal ${deal._id} (${deal.dealName}) deleted by user ${req.user.id}. Reason: ${reason}`);
    
    res.json({
      success: true,
      message: 'Deal deleted successfully',
      deal: {
        id: deal._id,
        name: deal.dealName,
        deletedAt: new Date(),
        reason: reason
      }
    });
    
  } catch (error) {
    console.error('Error deleting deal:', error);
    res.status(500).json({ error: error.message });
  }
});

// NEW: POST restore a deleted deal
router.post('/:id/restore', auth, async (req, res) => {
  try {
    const deal = await Deal.findOne({
      _id: req.params.id,
      organizationId: req.user.organizationId,
      isDeleted: true
    });
    
    if (!deal) {
      return res.status(404).json({ error: 'Deal not found or not deleted' });
    }
    
    await deal.restore(req.user.id);
    
    console.log(`RESTORE: Deal ${deal._id} (${deal.dealName}) restored by user ${req.user.id}`);
    
    res.json({
      success: true,
      message: 'Deal restored successfully',
      deal: {
        id: deal._id,
        name: deal.dealName,
        restoredAt: new Date()
      }
    });
    
  } catch (error) {
    console.error('Error restoring deal:', error);
    res.status(500).json({ error: error.message });
  }
});

// NEW: GET deleted deals
router.get('/deleted', auth, async (req, res) => {
  try {
    const deletedDeals = await Deal.find({
      organizationId: req.user.organizationId,
      isDeleted: true
    })
    .populate('deletedBy', 'firstName lastName email')
    .sort({ deletedAt: -1 });
    
    res.status(200).json(deletedDeals);
  } catch (error) {
    console.error('Error fetching deleted deals:', error);
    res.status(500).json({ message: error.message });
  }
});

// POST create a new deal
router.post('/', auth, async (req, res) => {
  try {
    const newDeal = new Deal({
      ...req.body,
      organizationId: req.user.organizationId,
      createdBy: req.user.id,
      owner: req.body.owner || req.user.id,
      lastModifiedBy: req.user.id
    });
    
    const savedDeal = await newDeal.save();
    
    const populatedDeal = await Deal.findById(savedDeal._id)
      .populate('contactId', 'firstName lastName email phone')
      .populate('leadId', 'firstName lastName email')
      .populate('owner', 'firstName lastName email')
      .populate('createdBy', 'firstName lastName email');
    
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
  try {
    const updatedDeal = await Deal.findOneAndUpdate(
      { 
        _id: req.params.id, 
        organizationId: req.user.organizationId,
        isDeleted: { $ne: true }
      },
      { 
        ...req.body,
        lastModifiedBy: req.user.id,
        lastActivity: new Date()
      },
      { new: true }
    )
    .populate('contactId', 'firstName lastName email phone')
    .populate('leadId', 'firstName lastName email')
    .populate('accountId', 'accountName serviceType status')
    .populate('owner', 'firstName lastName email')
    .populate('createdBy', 'firstName lastName email');

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

// DELETE a deal (legacy - now redirects to soft delete)
router.delete('/:id', auth, async (req, res) => {
  try {
    const deal = await Deal.findOne({
      _id: req.params.id,
      organizationId: req.user.organizationId,
      isDeleted: { $ne: true }
    });

    if (!deal) {
      return res.status(404).json({ message: 'Deal not found' });
    }

    // Soft delete instead of hard delete
    await Deal.findByIdAndUpdate(deal._id, {
      isDeleted: true,
      deletedAt: new Date(),
      deletedBy: req.user.id,
      deletionReason: 'Legacy Delete',
      deletionNotes: 'Deleted via legacy DELETE endpoint',
      lastModifiedBy: req.user.id
    });

    res.status(200).json({ message: 'Deal deleted successfully' });
  } catch (error) {
    console.error('Error deleting deal:', error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;