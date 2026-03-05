const mongoose = require('mongoose');

const DeviceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Device name is required'],
      trim: true,
    },
    type: {
      type: String,
      enum: ['LIGHT', 'FAN', 'AC'],
      required: [true, 'Device type is required'],
    },
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      required: [true, 'Device must belong to a room'],
    },
    powerRatingWatt: {
      type: Number,
      required: [true, 'Power rating is required'],
      min: [1, 'Power rating must be at least 1 watt'],
    },
    status: {
      type: String,
      enum: ['ON', 'OFF', 'IDLE', 'FAULT'],
      default: 'OFF',
    },
    isActive: {
      type: Boolean,
      default: true, // false = deleted (soft delete)
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Update lastUpdated whenever status changes
DeviceSchema.pre('save', function (next) {
  if (this.isModified('status')) this.lastUpdated = Date.now();
});

// Index for fast room-wise device queries
DeviceSchema.index({ room: 1, isActive: 1 });
DeviceSchema.index({ status: 1 });

module.exports = mongoose.model('Device', DeviceSchema);
