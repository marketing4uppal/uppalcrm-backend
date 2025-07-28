// models/Contact.js (Updated)
const mongoose = require('mongoose');

const ContactSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, },
    lastName: { type: String, required: true, },
    email: { type: String, required: true, unique: true, },
    phone: { type: String, },
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', required: true, },
    // NEW: Link contact to an organization
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },
  },
  { timestamps: true }
);

const Contact = mongoose.model('Contact', ContactSchema);
module.exports = Contact;