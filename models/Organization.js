// models/Organization.js
const mongoose = require('mongoose');

const OrganizationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  // We can later link this to the user who created the organization
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, { timestamps: true });

const Organization = mongoose.model('Organization', OrganizationSchema);
module.exports = Organization;