// scripts/migrate-soft-delete.js - Database Migration for Soft Delete
const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URL || 'mongodb://localhost:27017/uppalcrm';
    await mongoose.connect(mongoUri);
    console.log('✅ MongoDB connected for soft delete migration');
    console.log('📊 Database:', mongoose.connection.name);
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// Migration function
const migrateSoftDelete = async () => {
  try {
    console.log('\n🚀 Starting soft delete migration for Uppal CRM...\n');
    
    // Check current lead count
    const totalLeads = await mongoose.connection.db.collection('leads').countDocuments();
    console.log(`📋 Found ${totalLeads} leads in database`);
    
    if (totalLeads === 0) {
      console.log('ℹ️  No leads found. Migration not needed.');
      return;
    }

    // Show sample of current leads (just for info)
    const sampleLead = await mongoose.connection.db.collection('leads').findOne();
    console.log('📝 Sample lead structure:', Object.keys(sampleLead || {}));
    
    // Update all existing leads to have soft delete fields
    console.log('\n🔄 Adding soft delete fields to existing leads...');
    
    const leadUpdateResult = await mongoose.connection.db.collection('leads').updateMany(
      { 
        $or: [
          { isDeleted: { $exists: false } },
          { deletedAt: { $exists: false } },
          { deletedBy: { $exists: false } },
          { deletionReason: { $exists: false } },
          { deletionNotes: { $exists: false } },
          { lastModifiedBy: { $exists: false } }
        ]
      },
      {
        $set: {
          isDeleted: false,
          deletedAt: null,
          deletedBy: null,
          deletionReason: null,
          deletionNotes: null,
          lastModifiedBy: null
        }
      }
    );
    
    console.log(`✅ Updated ${leadUpdateResult.modifiedCount} leads with soft delete fields`);
    
    // Check if contacts collection exists and update it too
    const collections = await mongoose.connection.db.listCollections().toArray();
    const hasContacts = collections.some(col => col.name === 'contacts');
    
    if (hasContacts) {
      const totalContacts = await mongoose.connection.db.collection('contacts').countDocuments();
      console.log(`📞 Found ${totalContacts} contacts in database`);
      
      if (totalContacts > 0) {
        console.log('🔄 Adding soft delete fields to existing contacts...');
        
        const contactUpdateResult = await mongoose.connection.db.collection('contacts').updateMany(
          { 
            $or: [
              { isDeleted: { $exists: false } },
              { deletedAt: { $exists: false } },
              { deletedBy: { $exists: false } },
              { deletionReason: { $exists: false } },
              { deletionNotes: { $exists: false } }
            ]
          },
          {
            $set: {
              isDeleted: false,
              deletedAt: null,
              deletedBy: null,
              deletionReason: null,
              deletionNotes: null
            }
          }
        );
        
        console.log(`✅ Updated ${contactUpdateResult.modifiedCount} contacts with soft delete fields`);
      }
    } else {
      console.log('ℹ️  No contacts collection found - skipping contact migration');
    }
    
    // Create indexes for better performance
    console.log('\n🔍 Creating indexes for soft delete functionality...');
    
    // Lead indexes
    const leadIndexes = [
      { isDeleted: 1 },
      { organizationId: 1, isDeleted: 1 },
      { email: 1, isDeleted: 1 },
      { leadStage: 1, isDeleted: 1 },
      { createdAt: -1, isDeleted: 1 },
      { score: -1, isDeleted: 1 },
      { assignedTo: 1, isDeleted: 1 }
    ];
    
    for (const index of leadIndexes) {
      try {
        await mongoose.connection.db.collection('leads').createIndex(index);
        console.log(`✅ Created lead index: ${Object.keys(index).join(', ')}`);
      } catch (error) {
        if (error.code === 85) { // Index already exists
          console.log(`ℹ️  Lead index already exists: ${Object.keys(index).join(', ')}`);
        } else {
          console.error(`❌ Error creating lead index: ${error.message}`);
        }
      }
    }
    
    // Contact indexes (if contacts exist)
    if (hasContacts) {
      const contactIndexes = [
        { isDeleted: 1 },
        { email: 1, isDeleted: 1 },
        { organizationId: 1, isDeleted: 1 }
      ];
      
      for (const index of contactIndexes) {
        try {
          await mongoose.connection.db.collection('contacts').createIndex(index);
          console.log(`✅ Created contact index: ${Object.keys(index).join(', ')}`);
        } catch (error) {
          if (error.code === 85) { // Index already exists
            console.log(`ℹ️  Contact index already exists: ${Object.keys(index).join(', ')}`);
          } else {
            console.error(`❌ Error creating contact index: ${error.message}`);
          }
        }
      }
    }
    
    // Verify the migration
    const activeLeads = await mongoose.connection.db.collection('leads').countDocuments({ isDeleted: false });
    const deletedLeads = await mongoose.connection.db.collection('leads').countDocuments({ isDeleted: true });
    
    console.log('\n🎉 Migration completed successfully!');
    console.log('═══════════════════════════════════════════');
    console.log(`📊 Active leads: ${activeLeads}`);
    console.log(`🗑️  Deleted leads: ${deletedLeads}`);
    console.log(`📈 Total leads: ${activeLeads + deletedLeads}`);
    
    if (hasContacts) {
      const activeContacts = await mongoose.connection.db.collection('contacts').countDocuments({ isDeleted: false });
      const deletedContacts = await mongoose.connection.db.collection('contacts').countDocuments({ isDeleted: true });
      console.log(`📞 Active contacts: ${activeContacts}`);
      console.log(`🗑️  Deleted contacts: ${deletedContacts}`);
    }
    
    console.log('\n✨ Your database is now ready for soft delete functionality!');
    
  } catch (error) {
    console.error('❌ Migration error:', error);
    throw error;
  }
};

// Run migration
const runMigration = async () => {
  try {
    await connectDB();
    await migrateSoftDelete();
    console.log('\n🏁 Migration script completed successfully');
  } catch (error) {
    console.error('\n💥 Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
    process.exit(0);
  }
};

// Execute if run directly
if (require.main === module) {
  console.log('🔧 Uppal CRM - Soft Delete Migration Script');
  console.log('═══════════════════════════════════════════');
  runMigration();
}

module.exports = { migrateSoftDelete };