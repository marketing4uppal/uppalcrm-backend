// routes/accounts.js (Updated with Soft Delete Support)
const express = require('express');
const router = express.Router();
const Account = require('../models/Account.js');
const Contact = require('../models/Contact.js');
const Deal = require('../models/Deal.js');
const auth = require('../middleware/auth.js');

// GET all accounts for the user's organization (UPDATED to handle soft delete)
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
    
    const accounts = await Account.find(query)
      .populate('contactId', 'firstName lastName email phone')
      .populate('createdBy', 'firstName lastName email')
      .populate('deletedBy', 'firstName lastName email')
      .sort({ createdAt: -1 });
      
    res.status(200).json(accounts);
  } catch (error) {
    console.error('Error fetching accounts:', error);
    res.status(500).json({ message: error.message });
  }
});

// GET single account by ID with all related data
router.get('/:id', auth, async (req, res) => {
  try {
    const account = await Account.findOne({ 
      _id: req.params.id, 
      organizationId: req.user.organizationId 
    })
    .populate('contactId', 'firstName lastName email phone')
    .populate('createdBy', 'firstName lastName email')
    .populate('deletedBy', 'firstName lastName email')
    .populate({
      path: 'deals',
      match: { organizationId: req.user.organizationId, isDeleted: { $ne: true } },
      options: { sort: { createdAt: -1 } }
    });
    
    if (!account) {
      return res.status(404).json({ message: 'Account not found' });
    }
    
    res.status(200).json(account);
  } catch (error) {
    console.error('Error fetching account:', error);
    res.status(500).json({ message: error.message });
  }
});

// NEW: GET delete info for an account
router.get('/:id/delete-info', auth, async (req, res) => {
  try {
    const account = await Account.findOne({
      _id: req.params.id,
      organizationId: req.user.organizationId,
      isDeleted: { $ne: true }
    });
      
    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }
    
    // Check dependencies
    const dependencies = [];
    
    // Check for related deals
    const relatedDeals = await Deal.find({ 
      accountId: account._id,
      isDeleted: { $ne: true },
      organizationId: req.user.organizationId 
    });
    
    if (relatedDeals.length > 0) {
      dependencies.push({
        type: 'deals',
        count: relatedDeals.length,
        message: `Account has ${relatedDeals.length} active deal(s)`
      });
    }
    
    // Check account validation rules
    const deletionCheck = account.canBeDeleted();
    deletionCheck.dependencies = dependencies;
    deletionCheck.canDeleteSafely = dependencies.length === 0 && deletionCheck.canDelete;
    
    res.json({
      account: {
        id: account._id,
        name: account.accountName,
        status: account.status,
        serviceType: account.serviceType,
        holderName: account.accountHolderName,
        monthlyPrice: account.currentMonthlyPrice
      },
      deletionCheck,
      options: {
        softDelete: true,
        hardDelete: false
      }
    });
  } catch (error) {
    console.error('Error fetching account delete info:', error);
    res.status(500).json({ error: error.message });
  }
});

// NEW: POST soft delete an account
router.post('/:id/soft-delete', auth, async (req, res) => {
  try {
    const { reason, notes } = req.body;
    
    if (!reason) {
      return res.status(400).json({ error: 'Reason is required' });
    }
    
    const account = await Account.findOne({
      _id: req.params.id,
      organizationId: req.user.organizationId,
      isDeleted: { $ne: true }
    });
      
    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }
    
    // Check if account can be deleted
    const deletionCheck = account.canBeDeleted();
    if (!deletionCheck.canDelete) {
      return res.status(400).json({ 
        error: 'Account cannot be deleted', 
        blockers: deletionCheck.blockers 
      });
    }
    
    // Check for dependencies
    const relatedDeals = await Deal.find({ 
      accountId: account._id,
      isDeleted: { $ne: true },
      organizationId: req.user.organizationId 
    });
    
    if (relatedDeals.length > 0) {
      return res.status(400).json({ 
        error: 'Account cannot be deleted', 
        blockers: [`Account has ${relatedDeals.length} active deal(s) - close or delete them first`]
      });
    }
    
    // Soft delete the account
    await Account.findByIdAndUpdate(account._id, {
      isDeleted: true,
      deletedAt: new Date(),
      deletedBy: req.user.id,
      deletionReason: reason,
      deletionNotes: notes,
      lastModifiedBy: req.user.id
    });
    
    console.log(`SOFT DELETE: Account ${account._id} (${account.accountName}) deleted by user ${req.user.id}. Reason: ${reason}`);
    
    res.json({
      success: true,
      message: 'Account deleted successfully',
      account: {
        id: account._id,
        name: account.accountName,
        deletedAt: new Date(),
        reason: reason
      }
    });
    
  } catch (error) {
    console.error('Error deleting account:', error);
    res.status(500).json({ error: error.message });
  }
});

// NEW: POST restore a deleted account
router.post('/:id/restore', auth, async (req, res) => {
  try {
    const account = await Account.findOne({
      _id: req.params.id,
      organizationId: req.user.organizationId,
      isDeleted: true
    });
    
    if (!account) {
      return res.status(404).json({ error: 'Account not found or not deleted' });
    }
    
    await account.restore(req.user.id);
    
    console.log(`RESTORE: Account ${account._id} (${account.accountName}) restored by user ${req.user.id}`);
    
    res.json({
      success: true,
      message: 'Account restored successfully',
      account: {
        id: account._id,
        name: account.accountName,
        restoredAt: new Date()
      }
    });
    
  } catch (error) {
    console.error('Error restoring account:', error);
    res.status(500).json({ error: error.message });
  }
});

// NEW: GET deleted accounts
router.get('/deleted', auth, async (req, res) => {
  try {
    const deletedAccounts = await Account.find({
      organizationId: req.user.organizationId,
      isDeleted: true
    })
    .populate('deletedBy', 'firstName lastName email')
    .sort({ deletedAt: -1 });
    
    res.status(200).json(deletedAccounts);
  } catch (error) {
    console.error('Error fetching deleted accounts:', error);
    res.status(500).json({ message: error.message });
  }
});

// POST create a new account
router.post('/', auth, async (req, res) => {
  try {
    const newAccount = new Account({
      ...req.body,
      organizationId: req.user.organizationId,
      createdBy: req.user.id,
      lastModifiedBy: req.user.id
    });
    
    const savedAccount = await newAccount.save();
    
    const populatedAccount = await Account.findById(savedAccount._id)
      .populate('contactId', 'firstName lastName email phone')
      .populate('createdBy', 'firstName lastName email');
    
    res.status(201).json({
      account: populatedAccount,
      message: 'Account created successfully'
    });
  } catch (error) {
    console.error('Error creating account:', error);
    res.status(400).json({ message: error.message });
  }
});

// PUT update an account
router.put('/:id', auth, async (req, res) => {
  try {
    const updatedAccount = await Account.findOneAndUpdate(
      { 
        _id: req.params.id, 
        organizationId: req.user.organizationId,
        isDeleted: { $ne: true }
      },
      { 
        ...req.body,
        lastModifiedBy: req.user.id
      },
      { new: true }
    )
    .populate('contactId', 'firstName lastName email phone')
    .populate('createdBy', 'firstName lastName email')
    .populate({
      path: 'deals',
      match: { organizationId: req.user.organizationId, isDeleted: { $ne: true } }
    });

    if (!updatedAccount) {
      return res.status(404).json({ message: 'Account not found' });
    }

    res.status(200).json({
      account: updatedAccount,
      message: 'Account updated successfully'
    });

  } catch (error) {
    console.error('Error updating account:', error);
    res.status(400).json({ message: error.message });
  }
});

// DELETE an account (legacy - now redirects to soft delete)
router.delete('/:id', auth, async (req, res) => {
  try {
    const account = await Account.findOne({
      _id: req.params.id,
      organizationId: req.user.organizationId,
      isDeleted: { $ne: true }
    });

    if (!account) {
      return res.status(404).json({ message: 'Account not found' });
    }

    // Soft delete instead of hard delete
    await Account.findByIdAndUpdate(account._id, {
      isDeleted: true,
      deletedAt: new Date(),
      deletedBy: req.user.id,
      deletionReason: 'Legacy Delete',
      deletionNotes: 'Deleted via legacy DELETE endpoint',
      lastModifiedBy: req.user.id
    });

    res.status(200).json({ message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Error deleting account:', error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;