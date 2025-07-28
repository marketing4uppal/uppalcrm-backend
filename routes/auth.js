// routes/auth.js (Updated for Organizations)
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User.js');
const Organization = require('../models/Organization.js'); // <<< NEW

// @route   POST /api/auth/register
// @desc    Register a new business (Organization and first Admin User)
router.post('/register', async (req, res) => {
  const { firstName, lastName, email, password, businessName } = req.body;

  try {
    // 1. Check if a user with this email already exists
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    // 2. Create the new Organization
    const newOrganization = new Organization({ name: businessName });
    const savedOrganization = await newOrganization.save();

    // 3. Create the new User
    user = new User({
      firstName,
      lastName,
      email,
      password,
      organizationId: savedOrganization._id, // Link user to the new organization
      role: 'admin', // Make the first user an admin
    });

    // 4. Hash the password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);

    // 5. Save the user
    await user.save();

    res.status(201).json({ message: 'Organization and admin user registered successfully' });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

// routes/auth.js (Updated /login route)

// ... leave the '/register' route as is ...

// @route   POST /api/auth/login
// @desc    Log in a user and get a token
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // <<< CHANGE IS HERE: We now include more info in the token's payload
    const payload = {
      user: {
        id: user.id,
        role: user.role,
        organizationId: user.organizationId,
      },
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: 3600 },
      (err, token) => {
        if (err) throw err;
        res.json({ token });
      }
    );
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;