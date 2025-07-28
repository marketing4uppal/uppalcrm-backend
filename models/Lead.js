// models/Lead.js

const mongoose = require('mongoose');

const LeadSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
      min: 2,
      max: 50,
    },
    lastName: {
      type: String,
      required: true,
      min: 2,
      max: 50,
    },
    email: {
      type: String,
      required: true,
      max: 50,
      unique: true, // Each lead must have a unique email
    },
    phone: {
      type: String,
      default: "",
    },
    leadSource: {
      type: String,
      default: "",
    },
    leadStage: {
      type: String,
      // You can define the specific stages you want here
      enum: ["New", "Contacted", "Qualified", "Lost", "Won"],
      default: "New",
    },
  },
  { timestamps: true } // This automatically adds 'createdAt' and 'updatedAt' fields
);

const Lead = mongoose.model("Lead", LeadSchema);
module.exports = Lead;