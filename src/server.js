/**
 * server.js — Server Entry Point
 *
 * This file starts the Express server by importing the configured app
 * from app.js and listening on the specified port.
 */

require('dotenv').config();

const app = require('./app');

// Start the server
const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`[Server] Smart Home Energy Simulation API running on port ${PORT}`);
});

module.exports = server;