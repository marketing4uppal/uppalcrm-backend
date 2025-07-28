// models/User.js (Updated)
const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: true,
  },
  lastName: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  // NEW: Link user to an organization
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
  },
  // NEW: Define the user's role
  role: {
    type: String,
    enum: ['admin', 'user'],
    default: 'user',
  },
}, { timestamps: true });

const User = mongoose.model('User', UserSchema);
module.exports = User;