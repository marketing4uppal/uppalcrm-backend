// index.js (Updated with CRM Settings)
const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');

const leadRoutes = require('./routes/leads.js');
const contactRoutes = require('./routes/contacts.js');
const authRoutes = require('./routes/auth.js');
const userRoutes = require('./routes/users.js');
const leadHistoryRoutes = require('./routes/leadHistory');
const crmSettingsRoutes = require('./routes/crmSettings.js'); // NEW

dotenv.config();
const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());

// API Routes
app.use('/api/leads', leadRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/deals', require('./routes/deals'));
app.use('/api/accounts', require('./routes/accounts'));
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/leadhistory', leadHistoryRoutes);
app.use('/api/crm-settings', crmSettingsRoutes); // NEW

app.get('/', (req, res) => {
  res.send('CRM Backend is running and connected to the database!');
});

const PORT = process.env.PORT || 5001;
const MONGO_URL = process.env.MONGO_URL;

mongoose
  .connect(MONGO_URL)
  .then(() => {
    console.log('Successfully connected to MongoDB!');
    app.listen(PORT, () => console.log(`Server is listening on port ${PORT}`));
  })
  .catch((error) => {
    console.error('Failed to connect to MongoDB:', error);
  });