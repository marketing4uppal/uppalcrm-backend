// routes/contacts.js (Updated with Soft Delete Support)
const express = require('express');
const router = express.Router();
const Contact = require('../models/Contact.js');
const auth = require('../middleware/auth.js');

// GET all contacts for the user's organization (UPDATED to handle soft delete)
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
    
    const contacts = await Contact.find(query)
      .populate('createdBy', 'firstName lastName email')
      .populate('deletedBy', 'firstName lastName email')
      .sort({ createdAt: -1 });
    
    res.status(200).json(contacts);
  } catch (error) {
    console.error('Error fetching contacts:', error);
    res.status(500).json({ message: error.message });
  }
});

// GET single contact by ID with all related data (UPDATED to handle soft delete)
router.get('/:id', auth, async (req, res) => {
  try {
    const contact = await Contact.findOne({ 
      _id: req.params.id, 
      organizationId: req.user.organizationId 
    })
    .populate('createdBy', 'firstName lastName email')
    .populate('deletedBy', 'firstName lastName email')
    .populate({
      path: 'leads',
      match: { organizationId: req.user.organizationId, isDeleted: { $ne: true } },
      options: { sort: { createdAt: -1 } }
    })
    .populate({
      path: 'accounts',
      match: { organizationId: req.user.organizationId },
      options: { sort: { createdAt: -1 } }
    })
    .populate({
      path: 'deals',
      match: { organizationId: req.user.organizationId },
      options: { sort: { createdAt: -1 } }
    });
    
    if (!contact) {
      return res.status(404).json({ message: 'Contact not found' });
    }
    
    res.status(200).json(contact);
  } catch (error) {
    console.error('Error fetching contact:', error);
    res.status(500).json({ message: error.message });
  }
});

// POST a new contact for the user's organization
router.post('/', auth, async (req, res) => {
  const { 
    firstName, 
    lastName, 
    email, 
    phone, 
    company, 
    jobTitle, 
    address, 
    linkedin, 
    website, 
    notes, 
    tags 
  } = req.body;
  
  try {
    const newContact = new Contact({
      firstName,
      lastName,
      email,
      phone,
      company,
      jobTitle,
      address,
      linkedin,
      website,
      notes,
      tags,
      organizationId: req.user.organizationId,
      createdBy: req.user.id,
      lastModifiedBy: req.user.id
    });
    
    const savedContact = await newContact.save();
    res.status(201).json({
      contact: savedContact,
      message: 'Contact created successfully'
    });
  } catch (error) {
    console.error('Error creating contact:', error);
    res.status(400).json({ message: error.message });
  }
});

// PUT update a contact (UPDATED to set lastModifiedBy)
router.put('/:id', auth, async (req, res) => {
  const { 
    firstName, 
    lastName, 
    email, 
    phone, 
    company, 
    jobTitle, 
    address, 
    linkedin, 
    website, 
    notes, 
    tags,
    isActive 
  } = req.body;
  
  try {
    const updatedContact = await Contact.findOneAndUpdate(
      { 
        _id: req.params.id, 
        organizationId: req.user.organizationId,
        isDeleted: { $ne: true } // Don't allow updating deleted contacts
      },
      { 
        firstName, 
        lastName, 
        email, 
        phone, 
        company, 
        jobTitle, 
        address, 
        linkedin, 
        website, 
        notes, 
        tags,
        isActive,
        lastContactedDate: new Date(),
        lastModifiedBy: req.user.id
      },
      { new: true }
    )
    .populate({
      path: 'leads',
      match: { organizationId: req.user.organizationId, isDeleted: { $ne: true } }
    })
    .populate({
      path: 'accounts',
      match: { organizationId: req.user.organizationId }
    })
    .populate({
      path: 'deals',
      match: { organizationId: req.user.organizationId }
    });

    if (!updatedContact) {
      return res.status(404).json({ message: 'Contact not found' });
    }

    res.status(200).json({
      contact: updatedContact,
      message: 'Contact updated successfully'
    });

  } catch (error) {
    console.error('Error updating contact:', error);
    res.status(400).json({ message: error.message });
  }
});

// NEW: GET delete info for a contact
router.get('/:id/delete-info', auth, async (req, res) => {
  try {
    const contact = await Contact.findOne({
      _id: req.params.id,
      organizationId: req.user.organizationId,
      isDeleted: { $ne: true }
    });
      
    if (!contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }
    
    // Check dependencies
    const Lead = require('../models/Lead.js');
    const Deal = require('../models/Deal.js');
    
    const relatedLeads = await Lead.find({ 
      contactId: contact._id, 
      isDeleted: { $ne: true },
      organizationId: req.user.organizationId 
    });
    
    const relatedDeals = await Deal.find({ 
      contactId: contact._id,
      isDeleted: { $ne: true },
      organizationId: req.user.organizationId 
    });
    
    const dependencies = [];
    if (relatedLeads.length > 0) {
      dependencies.push({
        type: 'leads',
        count: relatedLeads.length,
        message: `Contact has ${relatedLeads.length} active lead(s)`
      });
    }
    if (relatedDeals.length > 0) {
      dependencies.push({
        type: 'deals',
        count: relatedDeals.length,
        message: `Contact has ${relatedDeals.length} deal(s)`
      });
    }
    
    const deletionCheck = {
      canDelete: true,
      warnings: dependencies.length > 0 ? ['Contact has related records'] : [],
      blockers: [],
      dependencies: dependencies,
      canDeleteSafely: dependencies.length === 0
    };
    
    res.json({
      contact: {
        id: contact._id,
        name: contact.fullName,
        email: contact.email,
        company: contact.company
      },
      deletionCheck,
      options: {
        softDelete: true,
        hardDelete: false
      }
    });
  } catch (error) {
    console.error('Error fetching contact delete info:', error);
    res.status(500).json({ error: error.message });
  }
});

// NEW: POST soft delete a contact
router.post('/:id/soft-delete', auth, async (req, res) => {
  try {
    const { reason, notes } = req.body;
    
    if (!reason) {
      return res.status(400).json({ error: 'Reason is required' });
    }
    
    const contact = await Contact.findOne({
      _id: req.params.id,
      organizationId: req.user.organizationId,
      isDeleted: { $ne: true }
    });
      
    if (!contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }
    
    // Soft delete the contact
    await Contact.findByIdAndUpdate(contact._id, {
      isDeleted: true,
      deletedAt: new Date(),
      deletedBy: req.user.id,
      deletionReason: reason,
      deletionNotes: notes,
      lastModifiedBy: req.user.id
    });
    
    console.log(`SOFT DELETE: Contact ${contact._id} (${contact.fullName}) deleted by user ${req.user.id}. Reason: ${reason}`);
    
    res.json({
      success: true,
      message: 'Contact deleted successfully',
      contact: {
        id: contact._id,
        name: contact.fullName,
        deletedAt: new Date(),
        reason: reason
      }
    });
    
  } catch (error) {
    console.error('Error deleting contact:', error);
    res.status(500).json({ error: error.message });
  }
});

// NEW: POST restore a deleted contact
router.post('/:id/restore', auth, async (req, res) => {
  try {
    const contact = await Contact.findOne({
      _id: req.params.id,
      organizationId: req.user.organizationId,
      isDeleted: true
    });
    
    if (!contact) {
      return res.status(404).json({ error: 'Contact not found or not deleted' });
    }
    
    await contact.restore(req.user.id);
    
    console.log(`RESTORE: Contact ${contact._id} (${contact.fullName}) restored by user ${req.user.id}`);
    
    res.json({
      success: true,
      message: 'Contact restored successfully',
      contact: {
        id: contact._id,
        name: contact.fullName,
        restoredAt: new Date()
      }
    });
    
  } catch (error) {
    console.error('Error restoring contact:', error);
    res.status(500).json({ error: error.message });
  }
});

// NEW: GET deleted contacts
router.get('/deleted', auth, async (req, res) => {
  try {
    const deletedContacts = await Contact.find({
      organizationId: req.user.organizationId,
      isDeleted: true
    })
    .populate('deletedBy', 'firstName lastName email')
    .sort({ deletedAt: -1 });
    
    res.status(200).json(deletedContacts);
  } catch (error) {
    console.error('Error fetching deleted contacts:', error);
    res.status(500).json({ message: error.message });
  }
});

// DELETE a contact (legacy hard delete - deprecated)
router.delete('/:id', auth, async (req, res) => {
  try {
    // For backward compatibility, we'll soft delete instead of hard delete
    const contact = await Contact.findOne({
      _id: req.params.id,
      organizationId: req.user.organizationId,
      isDeleted: { $ne: true }
    });

    if (!contact) {
      return res.status(404).json({ message: 'Contact not found' });
    }

    // Soft delete instead of hard delete
    await Contact.findByIdAndUpdate(contact._id, {
      isDeleted: true,
      deletedAt: new Date(),
      deletedBy: req.user.id,
      deletionReason: 'Legacy Delete',
      deletionNotes: 'Deleted via legacy DELETE endpoint',
      lastModifiedBy: req.user.id
    });

    res.status(200).json({ message: 'Contact deleted successfully' });
  } catch (error) {
    console.error('Error deleting contact:', error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;