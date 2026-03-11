const dns=require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);
require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');

const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const roomRoutes = require('./routes/rooms');
const dashboardRoutes = require('./routes/dashboard');
const eventRoutes = require('./routes/events');
const alertRoutes = require('./routes/alerts');
const energyRoutes = require('./routes/energy');
const modelRoutes = require('./routes/model');
const globalErrorHandler = require('./middleware/errorHandler');
const AppError = require('./utils/AppError');

const app = express();

connectDB();

app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['X-User-Role', 'X-User-Id'],
}));
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

app.get('/health', (req, res) =>
  res.status(200).json({ status: 'ok', uptime: process.uptime() })
);

app.use('/auth', authRoutes);
app.use('/users', userRoutes);
app.use('/rooms', roomRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/events', eventRoutes);
app.use('/alerts', alertRoutes);
app.use('/energy', energyRoutes);
app.use('/model', modelRoutes);

app.use((req, res, next) => {
  next(new AppError(`Route ${req.originalUrl} not found.`, 404, 'ROUTE_NOT_FOUND'));
});

app.use(globalErrorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});

process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION:', err);
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err);
  process.exit(1);
});

module.exports = app;
