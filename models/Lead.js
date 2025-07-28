// models/Lead.js (Updated)
const mongoose = require('mongoose');

const LeadSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, min: 2, max: 50, },
    lastName: { type: String, required: true, min: 2, max: 50, },
    email: { type: String, required: true, max: 50, unique: true, },
    phone: { type: String, default: "", },
    leadSource: { type: String, default: "", },
    leadStage: { type: String, enum: ["New", "Contacted", "Qualified", "Lost", "Won"], default: "New", },
    // NEW: Link lead to an organization
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },
  },
  { timestamps: true }
);

const Lead = mongoose.model("Lead", LeadSchema);
module.exports = Lead;