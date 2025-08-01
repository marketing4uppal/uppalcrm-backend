// models/LeadHistory.js
const mongoose = require('mongoose');

const LeadHistorySchema = new mongoose.Schema({
  leadId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lead',
    required: true
  },
  // In models/LeadHistory.js - find the action field and update it:
action: {
  type: String,
  enum: ['created', 'updated', 'status_changed', 'deleted', 'restored'], // ADD 'deleted' and 'restored'
  required: true
},
  changes: {
    type: Object, // Store what fields changed
    default: {}
  },
  oldValues: {
    type: Object, // Store previous values
    default: {}
  },
  newValues: {
    type: Object, // Store new values
    default: {}
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  }
}, { timestamps: true });

module.exports = mongoose.model('LeadHistory', LeadHistorySchema);