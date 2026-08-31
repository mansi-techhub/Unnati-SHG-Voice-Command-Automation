const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const authRoutes = require('./routes/authRoutes');
const shgRoutes = require('./routes/shgRoutes');
const memberRoutes = require('./routes/memberRoutes');
const savingsRoutes = require('./routes/savingsRoutes');
const loanRoutes = require('./routes/loanRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const meetingRoutes = require('./routes/meetingRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const reportRoutes = require('./routes/reportRoutes');
const resourceRoutes = require('./routes/resourceRoutes');
const errorHandler = require('./middleware/errorHandler');

dotenv.config();

const app = express();

app.use(cors({ origin: process.env.CLIENT_ORIGIN || true, credentials: true }));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.json({
    app: 'SHGMS API',
    status: 'ok',
    health: '/api/health',
  });
});

app.get('/api/health', (req, res) => {
  const databaseConnected = mongoose.connection.readyState === 1;
  res.status(databaseConnected || !process.env.MONGODB_URI ? 200 : 503).json({
    status: databaseConnected ? 'ok' : 'database_unavailable',
    app: 'SHGMS',
    database: {
      configured: Boolean(process.env.MONGODB_URI),
      connected: databaseConnected,
    },
    timestamp: new Date().toISOString(),
  });
});

app.use('/api', (req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      message: process.env.MONGODB_URI
        ? 'Database is not connected. Check the backend MongoDB connection.'
        : 'MONGODB_URI is not set. Add it to backend/.env before using database routes.',
    });
  }
  next();
});

app.use('/api/auth', authRoutes);
app.use('/api/shgs', shgRoutes);
app.use('/api/members', memberRoutes);
app.use('/api/savings', savingsRoutes);
app.use('/api/loans', loanRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/meetings', meetingRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api', resourceRoutes);

app.use((req, res) => res.status(404).json({ message: 'API route not found' }));
app.use(errorHandler);

module.exports = app;
