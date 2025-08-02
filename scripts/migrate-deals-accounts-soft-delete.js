// scripts/migrate-deals-accounts-soft-delete.js - Extended Migration for Deals and Accounts
const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URL || 'mongodb://localhost:27017/uppalcrm';
    await mongoose.connect(mongoUri);
    console.log('✅ MongoDB connected for deals/accounts soft delete migration');
    console.log('📊 Database:', mongoose.connection.name);
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// Migration function for deals and accounts
const migrateDealsAccountsSoftDelete = async () => {
  try {
    console.log('\n🚀 Starting deals & accounts soft delete migration for Uppal CRM...\n');
    
    // Get all collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    const collectionNames = collections.map(col => col.name);
    
    console.log('📋 Available collections:', collectionNames.join(', '));
    
    // ===== DEALS MIGRATION =====
    const hasDeals = collectionNames.includes('deals');
    
    if (hasDeals) {
      const totalDeals = await mongoose.connection.db.collection('deals').countDocuments();
      console.log(`\n💼 Found ${totalDeals} deals in database`);
      
      if (totalDeals > 0) {
        console.log('🔄 Adding soft delete fields to existing deals...');
        
        const dealUpdateResult = await mongoose.connection.db.collection('deals').updateMany(
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
        
        console.log(`✅ Updated ${dealUpdateResult.modifiedCount} deals with soft delete fields`);
        
        // Create deal indexes
        const dealIndexes = [
          { isDeleted: 1 },
          { organizationId: 1, isDeleted: 1 },
          { stage: 1, isDeleted: 1 },
          { contactId: 1, isDeleted: 1 },
          { leadId: 1, isDeleted: 1 },
          { accountId: 1, isDeleted: 1 },
          { owner: 1, isDeleted: 1 },
          { closeDate: 1, isDeleted: 1 }
        ];
        
        for (const index of dealIndexes) {
          try {
            await mongoose.connection.db.collection('deals').createIndex(index);
            console.log(`✅ Created deal index: ${Object.keys(index).join(', ')}`);
          } catch (error) {
            if (error.code === 85) {
              console.log(`ℹ️  Deal index already exists: ${Object.keys(index).join(', ')}`);
            } else {
              console.error(`❌ Error creating deal index: ${error.message}`);
            }
          }
        }
      }
    } else {
      console.log('ℹ️  No deals collection found - skipping deal migration');
    }
    
    // ===== ACCOUNTS MIGRATION =====
    const hasAccounts = collectionNames.includes('accounts');
    
    if (hasAccounts) {
      const totalAccounts = await mongoose.connection.db.collection('accounts').countDocuments();
      console.log(`\n🏢 Found ${totalAccounts} accounts in database`);
      
      if (totalAccounts > 0) {
        console.log('🔄 Adding soft delete fields to existing accounts...');
        
        const accountUpdateResult = await mongoose.connection.db.collection('accounts').updateMany(
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
        
        console.log(`✅ Updated ${accountUpdateResult.modifiedCount} accounts with soft delete fields`);
        
        // Create account indexes
        const accountIndexes = [
          { isDeleted: 1 },
          { organizationId: 1, isDeleted: 1 },
          { status: 1, isDeleted: 1 },
          { contactId: 1, isDeleted: 1 },
          { renewalDate: 1, isDeleted: 1 },
          { serviceType: 1, isDeleted: 1 }
        ];
        
        for (const index of accountIndexes) {
          try {
            await mongoose.connection.db.collection('accounts').createIndex(index);
            console.log(`✅ Created account index: ${Object.keys(index).join(', ')}`);
          } catch (error) {
            if (error.code === 85) {
              console.log(`ℹ️  Account index already exists: ${Object.keys(index).join(', ')}`);
            } else {
              console.error(`❌ Error creating account index: ${error.message}`);
            }
          }
        }
      }
    } else {
      console.log('ℹ️  No accounts collection found - skipping account migration');
    }
    
    // ===== VERIFICATION =====
    console.log('\n🔍 Verifying migration results...');
    
    let finalStats = {};
    
    if (hasDeals) {
      const activeDeals = await mongoose.connection.db.collection('deals').countDocuments({ isDeleted: false });
      const deletedDeals = await mongoose.connection.db.collection('deals').countDocuments({ isDeleted: true });
      finalStats.deals = { active: activeDeals, deleted: deletedDeals, total: activeDeals + deletedDeals };
    }
    
    if (hasAccounts) {
      const activeAccounts = await mongoose.connection.db.collection('accounts').countDocuments({ isDeleted: false });
      const deletedAccounts = await mongoose.connection.db.collection('accounts').countDocuments({ isDeleted: true });
      finalStats.accounts = { active: activeAccounts, deleted: deletedAccounts, total: activeAccounts + deletedAccounts };
    }
    
    // Also check existing collections (leads/contacts)
    if (collectionNames.includes('leads')) {
      const activeLeads = await mongoose.connection.db.collection('leads').countDocuments({ isDeleted: false });
      const deletedLeads = await mongoose.connection.db.collection('leads').countDocuments({ isDeleted: true });
      finalStats.leads = { active: activeLeads, deleted: deletedLeads, total: activeLeads + deletedLeads };
    }
    
    if (collectionNames.includes('contacts')) {
      const activeContacts = await mongoose.connection.db.collection('contacts').countDocuments({ isDeleted: false });
      const deletedContacts = await mongoose.connection.db.collection('contacts').countDocuments({ isDeleted: true });
      finalStats.contacts = { active: activeContacts, deleted: deletedContacts, total: activeContacts + deletedContacts };
    }
    
    console.log('\n🎉 Migration completed successfully!');
    console.log('═══════════════════════════════════════════');
    
    Object.entries(finalStats).forEach(([type, stats]) => {
      console.log(`${getEmoji(type)} ${type.charAt(0).toUpperCase() + type.slice(1)}:`);
      console.log(`   Active: ${stats.active}`);
      console.log(`   Deleted: ${stats.deleted}`);
      console.log(`   Total: ${stats.total}`);
    });
    
    console.log('\n✨ Your database is now ready for full soft delete functionality!');
    console.log('🚀 You can now deploy the updated models and routes');
    
  } catch (error) {
    console.error('❌ Migration error:', error);
    throw error;
  }
};

const getEmoji = (type) => {
  switch (type) {
    case 'leads': return '📋';
    case 'contacts': return '📞';
    case 'deals': return '💼';
    case 'accounts': return '🏢';
    default: return '📊';
  }
};

// Run migration
const runMigration = async () => {
  try {
    await connectDB();
    await migrateDealsAccountsSoftDelete();
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
  console.log('🔧 Uppal CRM - Extended Soft Delete Migration Script');
  console.log('═══════════════════════════════════════════════════');
  console.log('📝 This script will add soft delete support to Deals and Accounts');
  runMigration();
}

module.exports = { migrateDealsAccountsSoftDelete };