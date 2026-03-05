require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');

const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const globalErrorHandler = require('./middleware/errorHandler');
const AppError = require('./utils/AppError');

const app = express();

// Connect to MongoDB
connectDB();

app.use(helmet());

app.use(
  cors({
    origin: process.env.CLIENT_URL || '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['X-User-Role', 'X-User-Id'], // expose custom headers to browser clients
  })
);
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));


app.get('/health', (req, res) =>
  res.status(200).json({ status: 'ok', uptime: process.uptime() })
);
app.use('/auth', authRoutes);
app.use('/users', userRoutes);

app.all('*', (req, res, next) => {
  next(new AppError(`Route ${req.originalUrl} not found.`, 404, 'ROUTE_NOT_FOUND'));
});

app.use(globalErrorHandler);

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  logger.info(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});

module.exports = app;