// routes/users.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User.js');
const auth = require('../middleware/auth.js');

// @route   POST /api/users
// @desc    Admin creates a new user for their organization
router.post('/', auth, async (req, res) => {
  // First, check if the logged-in user is an admin
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Forbidden: Admins only' });
  }

  const { firstName, lastName, email, password, role } = req.body;

  try {
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    user = new User({
      firstName,
      lastName,
      email,
      password,
      role, // e.g., 'user' or 'admin'
      organizationId: req.user.organizationId, // Assign to the admin's organization
    });

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);
    await user.save();
    res.status(201).json({ message: 'User created successfully' });

  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/users
// @desc    Admin gets all users in their organization
router.get('/', auth, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Forbidden: Admins only' });
  }
  try {
    const users = await User.find({ organizationId: req.user.organizationId }).select('-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;