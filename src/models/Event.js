const mongoose = require('mongoose');

// Poisson process event log — every device state change is recorded here
const EventSchema = new mongoose.Schema(
  {
    device: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Device',
      required: true,
    },
    // Denormalized: lets /api/events/recent return name without populate()
    deviceName: {
      type: String,
      required: true,
    },
    action: {
      type: String,
      enum: ['ON', 'OFF', 'IDLE', 'FAULT'],
      required: true,
    },
    triggeredBy: {
      type: String,
      enum: ['USER', 'AUTOMATION', 'IOT_FEEDBACK'],
      default: 'USER',
    },
    // Optional references depending on trigger source
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    automation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AutomationRule',
      default: null,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  {
    // No updatedAt needed — events are immutable logs
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Indexes for Poisson lambda estimation and recent-action queries
EventSchema.index({ timestamp: -1 });
EventSchema.index({ device: 1, timestamp: -1 });

module.exports = mongoose.model('Event', EventSchema);
