// routes/dealStages.js (Admin Only)
const express = require('express');
const router = express.Router();
const DealStage = require('../models/DealStage.js');
const auth = require('../middleware/auth.js');
const adminAuth = require('../middleware/adminAuth.js'); // Admin authorization middleware

// GET all deal stages for organization (Admin only)
router.get('/', auth, adminAuth, async (req, res) => {
  try {
    const stages = await DealStage.find({ 
      organizationId: req.user.organizationId 
    }).sort({ order: 1 });
    
    res.status(200).json(stages);
  } catch (error) {
    console.error('Error fetching deal stages:', error);
    res.status(500).json({ message: error.message });
  }
});

// POST create new deal stage (Admin only)
router.post('/', auth, adminAuth, async (req, res) => {
  const { name, probability, color, description, isDefault } = req.body;
  
  try {
    // Get the next order number
    const lastStage = await DealStage.findOne({ 
      organizationId: req.user.organizationId 
    }).sort({ order: -1 });
    
    const nextOrder = lastStage ? lastStage.order + 1 : 1;
    
    const newStage = new DealStage({
      name,
      order: nextOrder,
      probability: probability || 50,
      color: color || '#3B82F6',
      description,
      isDefault: isDefault || false,
      organizationId: req.user.organizationId,
      createdBy: req.user.id
    });
    
    const savedStage = await newStage.save();
    
    res.status(201).json({
      stage: savedStage,
      message: 'Deal stage created successfully'
    });
    
  } catch (error) {
    console.error('Error creating deal stage:', error);
    res.status(400).json({ message: error.message });
  }
});

// PUT update deal stage (Admin only)
router.put('/:id', auth, adminAuth, async (req, res) => {
  const { name, probability, color, description, isActive, isDefault } = req.body;
  
  try {
    const updatedStage = await DealStage.findOneAndUpdate(
      { _id: req.params.id, organizationId: req.user.organizationId },
      { name, probability, color, description, isActive, isDefault },
      { new: true }
    );

    if (!updatedStage) {
      return res.status(404).json({ message: 'Deal stage not found' });
    }

    res.status(200).json({
      stage: updatedStage,
      message: 'Deal stage updated successfully'
    });

  } catch (error) {
    console.error('Error updating deal stage:', error);
    res.status(400).json({ message: error.message });
  }
});

// PUT reorder deal stages (Admin only)
router.put('/reorder', auth, adminAuth, async (req, res) => {
  const { stageOrders } = req.body; // Array of { id, order }
  
  try {
    const updatePromises = stageOrders.map(({ id, order }) =>
      DealStage.findOneAndUpdate(
        { _id: id, organizationId: req.user.organizationId },
        { order },
        { new: true }
      )
    );
    
    await Promise.all(updatePromises);
    
    const updatedStages = await DealStage.find({ 
      organizationId: req.user.organizationId 
    }).sort({ order: 1 });
    
    res.status(200).json({
      stages: updatedStages,
      message: 'Deal stages reordered successfully'
    });
    
  } catch (error) {
    console.error('Error reordering deal stages:', error);
    res.status(400).json({ message: error.message });
  }
});

// DELETE deal stage (Admin only)
router.delete('/:id', auth, adminAuth, async (req, res) => {
  try {
    const stageToDelete = await DealStage.findOne({
      _id: req.params.id,
      organizationId: req.user.organizationId
    });

    if (!stageToDelete) {
      return res.status(404).json({ message: 'Deal stage not found' });
    }

    // Check if this stage is being used by any deals
    const Deal = require('../models/Deal.js');
    const dealsUsingStage = await Deal.countDocuments({
      organizationId: req.user.organizationId,
      stage: stageToDelete.name
    });

    if (dealsUsingStage > 0) {
      return res.status(400).json({ 
        message: `Cannot delete stage. ${dealsUsingStage} deal(s) are currently using this stage.` 
      });
    }

    await DealStage.findByIdAndDelete(req.params.id);

    res.status(200).json({ message: 'Deal stage deleted successfully' });
  } catch (error) {
    console.error('Error deleting deal stage:', error);
    res.status(500).json({ message: error.message });
  }
});

// POST initialize default stages for organization (Admin only)
router.post('/initialize', auth, adminAuth, async (req, res) => {
  try {
    // Check if stages already exist
    const existingStages = await DealStage.countDocuments({ 
      organizationId: req.user.organizationId 
    });
    
    if (existingStages > 0) {
      return res.status(400).json({ 
        message: 'Deal stages already exist for this organization' 
      });
    }
    
    // Create default stages
    const defaultStages = [
      { name: 'Qualified', order: 1, probability: 25, color: '#10B981', isDefault: true },
      { name: 'Proposal', order: 2, probability: 50, color: '#3B82F6' },
      { name: 'Negotiation', order: 3, probability: 75, color: '#F59E0B' },
      { name: 'Closed Won', order: 4, probability: 100, color: '#059669' },
      { name: 'Closed Lost', order: 5, probability: 0, color: '#DC2626' }
    ];
    
    const stages = defaultStages.map(stage => ({
      ...stage,
      organizationId: req.user.organizationId,
      createdBy: req.user.id
    }));
    
    const createdStages = await DealStage.insertMany(stages);
    
    res.status(201).json({
      stages: createdStages,
      message: 'Default deal stages created successfully'
    });
    
  } catch (error) {
    console.error('Error initializing deal stages:', error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;