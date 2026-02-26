const mongoose = require('mongoose');

// Records every device state transition.
// The Markov transition probability matrix is computed by aggregating this collection.
const MarkovTransitionSchema = new mongoose.Schema(
  {
    device: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Device',
      required: true,
    },
    fromState: {
      type: String,
      enum: ['ON', 'OFF', 'IDLE', 'FAULT'],
      required: true,
    },
    toState: {
      type: String,
      enum: ['ON', 'OFF', 'IDLE', 'FAULT'],
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false }, // immutable log
  }
);

// Index for building the transition matrix per device
MarkovTransitionSchema.index({ device: 1, fromState: 1 });
MarkovTransitionSchema.index({ device: 1, timestamp: -1 });

module.exports = mongoose.model('MarkovTransition', MarkovTransitionSchema);
