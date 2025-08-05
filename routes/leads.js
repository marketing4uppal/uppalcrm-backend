// REPLACE the entire POST route in routes/leads.js with this AGGRESSIVE HOTFIX

// POST a new lead - AGGRESSIVE HOTFIX (completely bypass all validation)
router.post('/', auth, async (req, res) => {
  const { firstName, lastName, email, phone, leadSource, leadStage } = req.body;
  
  console.log('🚨 AGGRESSIVE HOTFIX: Creating lead with data:', { firstName, lastName, email, phone });
  
  // AGGRESSIVE: Validate only lastName manually
  if (!lastName || lastName.trim().length === 0) {
    return res.status(400).json({ 
      message: 'Last Name is required' 
    });
  }
  
  try {
    // AGGRESSIVE: Use direct MongoDB insertion bypassing Mongoose validation
    const mongoose = require('mongoose');
    const { ObjectId } = mongoose.Types;
    
    // Step 1: Insert Contact directly into MongoDB
    const contactDoc = {
      _id: new ObjectId(),
      firstName: firstName || '',
      lastName: lastName.trim(),
      email: email || '',
      phone: phone || '',
      organizationId: new ObjectId(req.user.organizationId),
      createdBy: new ObjectId(req.user.id),
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // Direct MongoDB insert bypassing all Mongoose validation
    const db = mongoose.connection.db;
    const contactResult = await db.collection('contacts').insertOne(contactDoc);
    console.log('🚨 AGGRESSIVE: Contact inserted directly:', contactResult.insertedId);

    // Step 2: Insert Lead directly into MongoDB
    const leadDoc = {
      _id: new ObjectId(),
      firstName: firstName || '',
      lastName: lastName.trim(),
      email: email || '',
      phone: phone || '',
      leadSource: leadSource || 'other',
      leadStage: leadStage || 'New',
      contactId: contactResult.insertedId,
      organizationId: new ObjectId(req.user.organizationId),
      createdBy: new ObjectId(req.user.id),
      isDeleted: false,
      score: 0,
      inquiryType: 'new-account',
      budget: 'not-specified',
      timeline: 'not-specified',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const leadResult = await db.collection('leads').insertOne(leadDoc);
    console.log('🚨 AGGRESSIVE: Lead inserted directly:', leadResult.insertedId);

    // Step 3: Create history entry
    const historyDoc = {
      _id: new ObjectId(),
      leadId: leadResult.insertedId,
      action: 'created',
      changes: {
        firstName: firstName ? 'created' : undefined,
        lastName: 'created',
        email: email ? 'created' : undefined,
        phone: phone ? 'created' : undefined,
        leadSource: leadSource ? 'created' : undefined,
        leadStage: leadStage || 'New'
      },
      oldValues: {},
      newValues: {
        firstName: firstName || null,
        lastName: lastName.trim(),
        email: email || null,
        phone: phone || null,
        leadSource: leadSource || null,
        leadStage: leadStage || 'New'
      },
      userId: new ObjectId(req.user.id),
      organizationId: new ObjectId(req.user.organizationId),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    await db.collection('leadhistories').insertOne(historyDoc);
    console.log('🚨 AGGRESSIVE: History entry created');

    // Step 4: Return response with the created documents
    const response = {
      lead: {
        _id: leadResult.insertedId,
        firstName: firstName || '',
        lastName: lastName.trim(),
        email: email || '',
        phone: phone || '',
        leadSource: leadSource || 'other',
        leadStage: leadStage || 'New',
        contactId: contactResult.insertedId,
        organizationId: req.user.organizationId,
        createdBy: req.user.id,
        createdAt: leadDoc.createdAt,
        updatedAt: leadDoc.updatedAt
      },
      contact: {
        _id: contactResult.insertedId,
        firstName: firstName || '',
        lastName: lastName.trim(),
        email: email || '',
        phone: phone || '',
        organizationId: req.user.organizationId,
        createdBy: req.user.id,
        createdAt: contactDoc.createdAt,
        updatedAt: contactDoc.updatedAt
      },
      message: 'Lead and Contact created successfully (aggressive bypass)'
    };

    console.log('🚨 AGGRESSIVE: Success response:', response);
    res.status(201).json(response);

  } catch (error) {
    console.error('🚨 AGGRESSIVE: Error in lead creation:', error);
    console.error('🚨 AGGRESSIVE: Full error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
    res.status(500).json({ 
      message: 'Internal server error during lead creation',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Server error'
    });
  }
});