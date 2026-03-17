/**
 * app.js — Application Entry Point
 *
 * Design Pattern: FACADE
 * Single file that configures Express, connects to MongoDB, and boots the
 * HTTP server. All wiring is encapsulated here — nothing else needs to know
 * how the app starts.
 *
 * Boot sequence:
 *  1. Load env variables
 *  2. Connect to MongoDB
 *  3. Configure Express (middleware → routes → error handler)
 *  4. Start HTTP server
 *  5. Register graceful shutdown + unhandled error hooks
 */
const dns=require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);
require('dotenv').config();

const express    = require('express');
const cors       = require('cors');
const mongoose   = require('mongoose');

const authRoutes   = require('./routes/authRoutes');
const userRoutes   = require('./routes/userRoutes');
const homeRoutes   = require('./routes/homeRoutes');
const roomRoutes   = require('./routes/roomRoutes');
const errorHandler = require('./middleware/errorHandler');

// ── Express Setup ──────────────────────────────────────────────────────────────

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// ── Routes ─────────────────────────────────────────────────────────────────────

app.use('/auth',  authRoutes);
app.use('/users', userRoutes);
app.use('/homes', homeRoutes);
app.use('/rooms', roomRoutes);




// ── 404 ────────────────────────────────────────────────────────────────────────

app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found.' });
});

// ── Global Error Handler (Chain of Responsibility — terminal link) ─────────────

app.use(errorHandler.middleware);

// ── MongoDB Connection ─────────────────────────────────────────────────────────

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`[DB] MongoDB connected: ${conn.connection.host}`);
  } catch (err) {
    console.error('[DB] Connection failed:', err.message);
    process.exit(1);
  }
};

// ── Graceful Shutdown ──────────────────────────────────────────────────────────

const shutdown = (server, signal) => async () => {
  console.log(`\n[Server] ${signal} received — shutting down gracefully...`);
  server.close(async () => {
    await mongoose.connection.close();
    console.log('[DB] MongoDB connection closed.');
    console.log('[Server] Process terminated.');
    process.exit(0);
  });
};

// ── Boot ───────────────────────────────────────────────────────────────────────

const start = async () => {
  await connectDB();

  const PORT   = process.env.PORT || 5000;
  const server = app.listen(PORT, () => {
    console.log(`[Server] Running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  });

  process.on('SIGTERM',            shutdown(server, 'SIGTERM'));
  process.on('SIGINT',             shutdown(server, 'SIGINT'));
  process.on('unhandledRejection', (err) => {
    console.error('[Server] Unhandled Rejection:', err.message);
    shutdown(server, 'unhandledRejection')();
  });
  process.on('uncaughtException',  (err) => {
    console.error('[Server] Uncaught Exception:', err.message);
    shutdown(server, 'uncaughtException')();
  });
};

start();