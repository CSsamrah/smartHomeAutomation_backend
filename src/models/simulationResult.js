// models/SimulationResult.js
const mongoose = require('mongoose');

const SimulationResultSchema = new mongoose.Schema(
  {
    scenario: {
      type: String,
      enum: ['HIGH_USAGE', 'NORMAL', 'ENERGY_SAVING', 'ON'],
      required: true,
    },
    durationHours: {
      type: Number,
      required: true,
      min: 0.1,
    },
    energyKwh: {
      type: Number,
      required: true,
    },
    avgResponseTimeMs: {
      type: Number,
      required: true,
    },
    utilization: {
      type: Number,
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('SimulationResult', SimulationResultSchema);