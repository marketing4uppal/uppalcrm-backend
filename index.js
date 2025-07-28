// index.js

const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');

const leadRoutes = require('./routes/leads.js'); // <<< NEW LINE

dotenv.config();
const app = express();
// Allow requests from any origin
app.use(cors({ origin: "*" }));
app.use(express.json());

// API Routes
app.use('/api/leads', leadRoutes); // <<< NEW LINE

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