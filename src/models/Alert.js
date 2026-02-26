const mongoose = require('mongoose');

const AlertSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['HIGH_ENERGY', 'DEVICE_FAULT', 'AUTOMATION_FAILED'],
      required: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    severity: {
      type: String,
      enum: ['info', 'warning', 'critical'],
      default: 'warning',
    },
    // Optional: which device caused the alert
    device: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Device',
      default: null,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false }, // alerts are append-only
  }
);

AlertSchema.index({ isRead: 1, createdAt: -1 });

module.exports = mongoose.model('Alert', AlertSchema);
