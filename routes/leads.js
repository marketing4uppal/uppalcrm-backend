// routes/leads.js (Updated with Auto Deal Creation + Soft Delete)
const express = require('express');
const router = express.Router();
const Lead = require('../models/Lead.js');
const Contact = require('../models/Contact.js');
const Deal = require('../models/Deal.js');
const LeadHistory = require('../models/LeadHistory.js');
const auth = require('../middleware/auth.js');

// GET all leads for the user's organization (UPDATED to handle soft delete)
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
    
    const leads = await Lead.find(query)
      .populate('contactId', 'firstName lastName email phone')
      .populate('assignedTo', 'firstName lastName email')
      .populate('createdBy', 'firstName lastName email')
      .populate('deletedBy', 'firstName lastName email')
      .sort({ createdAt: -1 });
      
    res.status(200).json(leads);
  } catch (error) {
    console.error('Error fetching leads:', error);
    res.status(500).json({ message: error.message });
  }
});

// GET single lead by ID (needed for sync)
router.get('/:id', auth, async (req, res) => {
  try {
    const lead = await Lead.findOne({ 
      _id: req.params.id, 
      organizationId: req.user.organizationId 
    })
    .populate('contactId', 'firstName lastName email phone')
    .populate('assignedTo', 'firstName lastName email')
    .populate('createdBy', 'firstName lastName email')
    .populate('deletedBy', 'firstName lastName email');
    
    if (!lead) {
      return res.status(404).json({ message: 'Lead not found' });
    }
    
    res.status(200).json(lead);
  } catch (error) {
    console.error('Error fetching lead:', error);
    res.status(500).json({ message: error.message });
  }
});

// NEW: GET delete info for a lead
router.get('/:id/delete-info', auth, async (req, res) => {
  try {
    const lead = await Lead.findOne({
      _id: req.params.id,
      organizationId: req.user.organizationId
    }).populate('contactId', 'firstName lastName email phone');
      
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }
    
    if (lead.isDeleted) {
      return res.status(400).json({ error: 'Lead is already deleted' });
    }
    
    // Check if lead can be deleted
    const deletionCheck = lead.canBeDeleted();
    
    // Check contact dependencies
    let contactInfo = null;
    if (lead.contactId) {
      // Check if contact has other active leads
      const otherLeads = await Lead.find({ 
        contactId: lead.contactId._id, 
        isDeleted: false,
        organizationId: req.user.organizationId,
        _id: { $ne: lead._id }
      });
      
      // Check for related deals
      const relatedDeals = await Deal.find({ 
        contactId: lead.contactId._id,
        organizationId: req.user.organizationId
      });
      
      const dependencies = [];
      if (otherLeads.length > 0) {
        dependencies.push({
          type: 'leads',
          count: otherLeads.length,
          message: `Contact has ${otherLeads.length} other active lead(s)`
        });
      }
      if (relatedDeals.length > 0) {
        dependencies.push({
          type: 'deals',
          count: relatedDeals.length,
          message: `Contact has ${relatedDeals.length} related deal(s)`
        });
      }
      
      contactInfo = {
        contact: lead.contactId,
        dependencies: dependencies,
        canDeleteSafely: dependencies.length === 0
      };
    }
    
    res.json({
      lead: {
        id: lead._id,
        name: lead.fullName,
        stage: lead.leadStage,
        score: lead.score,
        budget: lead.budget,
        timeline: lead.timeline,
        company: lead.company
      },
      deletionCheck,
      contactInfo,
      options: {
        softDelete: true,
        hardDelete: false
      }
    });
  } catch (error) {
    console.error('Error fetching delete info:', error);
    res.status(500).json({ error: error.message });
  }
});

// NEW: POST soft delete a lead
router.post('/:id/soft-delete', auth, async (req, res) => {
  try {
    const { reason, notes, contactAction } = req.body;
    
    if (!reason) {
      return res.status(400).json({ error: 'Reason is required' });
    }
    
    const lead = await Lead.findOne({
      _id: req.params.id,
      organizationId: req.user.organizationId
    }).populate('contactId');
      
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }
    
    if (lead.isDeleted) {
      return res.status(400).json({ error: 'Lead is already deleted' });
    }
    
    // Check if lead can be deleted
    const deletionCheck = lead.canBeDeleted();
    if (!deletionCheck.canDelete) {
      return res.status(400).json({ 
        error: 'Lead cannot be deleted', 
        blockers: deletionCheck.blockers 
      });
    }
    
    // Handle contact based on user choice
    let contactActionResult = null;
    if (lead.contactId && contactAction) {
      switch (contactAction) {
        case 'delete':
          // Add note to contact about lead deletion
          const contactNotes = (lead.contactId.notes || '') + 
            `\n[${new Date().toISOString()}] Associated lead deleted. Reason: ${reason}`;
          await Contact.findByIdAndUpdate(lead.contactId._id, { notes: contactNotes });
          contactActionResult = 'marked';
          break;
          
        case 'keep':
          // Add note to contact about lead deletion
          const keepNotes = (lead.contactId.notes || '') + 
            `\n[${new Date().toISOString()}] Associated lead was deleted but contact preserved. Reason: ${reason}`;
          await Contact.findByIdAndUpdate(lead.contactId._id, { notes: keepNotes });
          contactActionResult = 'kept';
          break;
          
        case 'convert':
          // Convert to standalone contact
          const convertNotes = (lead.contactId.notes || '') + 
            `\n[${new Date().toISOString()}] Converted to standalone contact. Original lead deleted.`;
          await Contact.findByIdAndUpdate(lead.contactId._id, { notes: convertNotes });
          contactActionResult = 'converted';
          break;
          
        default:
          contactActionResult = 'no_action';
      }
    }
    
    // Soft delete the lead
    // Soft delete the lead - bypass validation
await Lead.findByIdAndUpdate(lead._id, {
  isDeleted: true,
  deletedAt: new Date(),
  deletedBy: req.user.id,
  deletionReason: reason,
  deletionNotes: notes,
  lastModifiedBy: req.user.id
}, { 
  runValidators: false  // This bypasses validation
});
    // Create history entry for deletion
    const historyEntry = new LeadHistory({
      leadId: lead._id,
      action: 'deleted',
      changes: {
        isDeleted: 'soft deleted',
        deletionReason: reason
      },
      oldValues: { isDeleted: false },
      newValues: { isDeleted: true, deletionReason: reason },
      userId: req.user.id,
      organizationId: req.user.organizationId
    });
    await historyEntry.save();
    
    console.log(`SOFT DELETE: Lead ${lead._id} (${lead.fullName}) deleted by user ${req.user.id}. Reason: ${reason}`);
    
    res.json({
      success: true,
      message: 'Lead deleted successfully',
      lead: {
        id: lead._id,
        name: lead.fullName,
        deletedAt: lead.deletedAt,
        reason: lead.deletionReason
      },
      contactAction: contactActionResult
    });
    
  } catch (error) {
    console.error('Error deleting lead:', error);
    res.status(500).json({ error: error.message });
  }
});

// NEW: POST restore a deleted lead
router.post('/:id/restore', auth, async (req, res) => {
  try {
    const lead = await Lead.findOne({
      _id: req.params.id,
      organizationId: req.user.organizationId
    });
    
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }
    
    if (!lead.isDeleted) {
      return res.status(400).json({ error: 'Lead is not deleted' });
    }
    
    await lead.restore(req.user.id);
    
    // Create history entry for restoration
    const historyEntry = new LeadHistory({
      leadId: lead._id,
      action: 'restored',
      changes: {
        isDeleted: 'restored'
      },
      oldValues: { isDeleted: true },
      newValues: { isDeleted: false },
      userId: req.user.id,
      organizationId: req.user.organizationId
    });
    await historyEntry.save();
    
    console.log(`RESTORE: Lead ${lead._id} (${lead.fullName}) restored by user ${req.user.id}`);
    
    res.json({
      success: true,
      message: 'Lead restored successfully',
      lead: lead
    });
    
  } catch (error) {
    console.error('Error restoring lead:', error);
    res.status(500).json({ error: error.message });
  }
});

// NEW: GET all deleted leads
router.get('/deleted', auth, async (req, res) => {
  try {
    const deletedLeads = await Lead.find({ 
      organizationId: req.user.organizationId,
      isDeleted: true 
    })
    .populate('contactId', 'firstName lastName email phone')
    .populate('deletedBy', 'firstName lastName email')
    .populate('assignedTo', 'firstName lastName email')
    .sort({ deletedAt: -1 });
      
    res.json(deletedLeads);
  } catch (error) {
    console.error('Error fetching deleted leads:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST a new lead for the user's organization (with automatic contact creation and history tracking)
router.post('/', auth, async (req, res) => {
  const { firstName, lastName, email, phone, leadSource, leadStage } = req.body;
  
  console.log('Creating lead with data:', { firstName, lastName, email });
  
  try {
    // Step 1: Create the Contact first (since Lead now requires contactId)
    const newContact = new Contact({
      firstName,
      lastName,
      email,
      phone,
      organizationId: req.user.organizationId,
      createdBy: req.user.id
    });

    const savedContact = await newContact.save();
    console.log('Contact created successfully:', savedContact._id);

    // Step 2: Create the Lead with contactId reference
    const newLead = new Lead({
      firstName,
      lastName,
      email,
      phone,
      leadSource,
      leadStage,
      contactId: savedContact._id,
      organizationId: req.user.organizationId,
      createdBy: req.user.id
    });

    const savedLead = await newLead.save();
    console.log('Lead created successfully:', savedLead._id);

    // Step 3: Create history entry for lead creation
    const historyEntry = new LeadHistory({
      leadId: savedLead._id,
      action: 'created',
      changes: {
        firstName: 'created',
        lastName: 'created',
        email: 'created',
        phone: phone ? 'created' : undefined,
        leadSource: leadSource ? 'created' : undefined,
        leadStage: leadStage || 'New'
      },
      oldValues: {},
      newValues: {
        firstName,
        lastName,
        email,
        phone: phone || null,
        leadSource: leadSource || null,
        leadStage: leadStage || 'New'
      },
      userId: req.user.id,
      organizationId: req.user.organizationId
    });

    await historyEntry.save();
    console.log('Lead history entry created');

    // Step 4: If lead is Qualified, create a Deal
    let createdDeal = null;
    if (leadStage === 'Qualified') {
      try {
        const newDeal = new Deal({
          firstName,
          lastName,
          stage: 'Qualified',
          closeDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          leadSource,
          owner: req.user.id,
          amount: 0,
          currency: 'USD',
          leadId: savedLead._id,
          contactId: savedContact._id,
          organizationId: req.user.organizationId,
          createdBy: req.user.id
        });

        createdDeal = await newDeal.save();
        console.log('Deal created successfully:', createdDeal._id);
      } catch (dealError) {
        console.error('Error creating deal:', dealError);
      }
    }

    // Step 5: Return response
    const response = {
      lead: savedLead,
      contact: savedContact,
      message: 'Lead and Contact created successfully'
    };

    if (createdDeal) {
      response.deal = createdDeal;
      response.message = 'Lead, Contact, and Deal created successfully';
    }

    res.status(201).json(response);

  } catch (error) {
    console.error('Error in lead creation:', error);
    
    if (error.code === 11000) {
      if (error.keyPattern?.email) {
        return res.status(400).json({ 
          message: 'A lead or contact with this email already exists' 
        });
      }
    }
    
    res.status(400).json({ message: error.message });
  }
});

// PUT update a lead (with history tracking and deal creation)
router.put('/:id', auth, async (req, res) => {
  const { firstName, lastName, email, phone, leadSource, leadStage } = req.body;
  
  try {
    // Step 1: Get the current lead to compare changes
    const currentLead = await Lead.findOne({ 
      _id: req.params.id, 
      organizationId: req.user.organizationId 
    });
    
    if (!currentLead) {
      return res.status(404).json({ message: 'Lead not found' });
    }

    // Step 2: Update the lead
    const updatedLead = await Lead.findByIdAndUpdate(
      req.params.id,
      { 
        firstName, 
        lastName, 
        email, 
        phone, 
        leadSource, 
        leadStage,
        lastModifiedBy: req.user.id  // NEW: Track who modified
      },
      { new: true }
    );

    // Step 3: Track what changed
    const changes = {};
    const oldValues = {};
    const newValues = {};

    if (currentLead.firstName !== firstName) {
      changes.firstName = 'updated';
      oldValues.firstName = currentLead.firstName;
      newValues.firstName = firstName;
    }
    if (currentLead.lastName !== lastName) {
      changes.lastName = 'updated';
      oldValues.lastName = currentLead.lastName;
      newValues.lastName = lastName;
    }
    if (currentLead.email !== email) {
      changes.email = 'updated';
      oldValues.email = currentLead.email;
      newValues.email = email;
    }
    if (currentLead.phone !== phone) {
      changes.phone = 'updated';
      oldValues.phone = currentLead.phone;
      newValues.phone = phone;
    }
    if (currentLead.leadSource !== leadSource) {
      changes.leadSource = 'updated';
      oldValues.leadSource = currentLead.leadSource;
      newValues.leadSource = leadSource;
    }
    if (currentLead.leadStage !== leadStage) {
      changes.leadStage = 'updated';
      oldValues.leadStage = currentLead.leadStage;
      newValues.leadStage = leadStage;
    }

    // Step 4: Create history entry if there were changes
    if (Object.keys(changes).length > 0) {
      const historyEntry = new LeadHistory({
        leadId: updatedLead._id,
        action: changes.leadStage ? 'status_changed' : 'updated',
        changes,
        oldValues,
        newValues,
        userId: req.user.id,
        organizationId: req.user.organizationId
      });
      
      await historyEntry.save();
    }

    // Step 5: Check if lead was just marked as Qualified and create deal
    let createdDeal = null;
    if (currentLead.leadStage !== 'Qualified' && leadStage === 'Qualified') {
      try {
        const existingDeal = await Deal.findOne({ leadId: updatedLead._id });
        
        if (!existingDeal) {
          const newDeal = new Deal({
            firstName,
            lastName,
            stage: 'Qualified',
            closeDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            leadSource,
            owner: req.user.id,
            amount: 0,
            currency: 'USD',
            leadId: updatedLead._id,
            contactId: updatedLead.contactId,
            organizationId: req.user.organizationId,
            createdBy: req.user.id
          });

          createdDeal = await newDeal.save();
          console.log('Deal created for qualified lead:', createdDeal._id);
        }
      } catch (dealError) {
        console.error('Error creating deal for qualified lead:', dealError);
      }
    }

    const response = {
      lead: updatedLead,
      message: 'Lead updated successfully'
    };

    if (createdDeal) {
      response.deal = createdDeal;
      response.message = 'Lead updated and Deal created successfully';
    }

    res.status(200).json(response);

  } catch (error) {
    console.error('Error updating lead:', error);
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;