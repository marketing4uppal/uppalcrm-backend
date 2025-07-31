// routes/accounts.js
const express = require('express');
const router = express.Router();
const Account = require('../models/Account.js');
const auth = require('../middleware/auth.js');

// GET all accounts for the user's organization
router.get('/', auth, async (req, res) => {
  try {
    let query = { organizationId: req.user.organizationId };
    
    // Support query by contactId for related records
    if (req.query.contactId) {
      query.contactId = req.query.contactId;
    }
    
    const accounts = await Account.find(query)
      .populate('contactId', 'firstName lastName email')
      .populate('createdBy', 'firstName lastName email')
      .sort({ createdAt: -1 });
      
    res.status(200).json(accounts);
  } catch (error) {
    console.error('Error fetching accounts:', error);
    res.status(500).json({ message: error.message });
  }
});

// GET single account by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const account = await Account.findOne({ 
      _id: req.params.id, 
      organizationId: req.user.organizationId 
    })
    .populate('contactId', 'firstName lastName email phone')
    .populate('createdBy', 'firstName lastName email');
    
    if (!account) {
      return res.status(404).json({ message: 'Account not found' });
    }
    
    res.status(200).json(account);
  } catch (error) {
    console.error('Error fetching account:', error);
    res.status(500).json({ message: error.message });
  }
});

// POST create a new account
router.post('/', auth, async (req, res) => {
  const { 
    accountName,
    serviceType,
    status,
    accountHolderName,
    accountHolderEmail,
    relationship,
    currentMonthlyPrice,
    billingCycle,
    startDate,
    renewalDate,
    contactId,
    notes
  } = req.body;
  
  try {
    const newAccount = new Account({
      accountName,
      serviceType,
      status: status || 'pending',
      accountHolderName,
      accountHolderEmail,
      relationship: relationship || 'self',
      currentMonthlyPrice,
      billingCycle: billingCycle || 'monthly',
      startDate,
      renewalDate,
      contactId,
      organizationId: req.user.organizationId,
      createdBy: req.user.id,
      notes
    });
    
    const savedAccount = await newAccount.save();
    
    // Populate the response
    const populatedAccount = await Account.findById(savedAccount._id)
      .populate('contactId', 'firstName lastName email')
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
  const { 
    accountName,
    serviceType,
    status,
    accountHolderName,
    accountHolderEmail,
    relationship,
    currentMonthlyPrice,
    billingCycle,
    startDate,
    renewalDate,
    notes
  } = req.body;
  
  try {
    const updatedAccount = await Account.findOneAndUpdate(
      { _id: req.params.id, organizationId: req.user.organizationId },
      { 
        accountName,
        serviceType,
        status,
        accountHolderName,
        accountHolderEmail,
        relationship,
        currentMonthlyPrice,
        billingCycle,
        startDate,
        renewalDate,
        notes
      },
      { new: true }
    )
    .populate('contactId', 'firstName lastName email')
    .populate('createdBy', 'firstName lastName email');

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

// DELETE an account
router.delete('/:id', auth, async (req, res) => {
  try {
    const deletedAccount = await Account.findOneAndDelete({
      _id: req.params.id,
      organizationId: req.user.organizationId
    });

    if (!deletedAccount) {
      return res.status(404).json({ message: 'Account not found' });
    }

    res.status(200).json({ message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Error deleting account:', error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;