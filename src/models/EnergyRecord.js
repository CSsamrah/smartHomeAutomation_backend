const mongoose = require('mongoose');

const EnergyRecordSchema = new mongoose.Schema(
  {
    device: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Device',
      required: true,
    },
    // Denormalized for fast room-wise aggregation without joins
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      required: true,
    },
    startedAt: {
      type: Date,
      required: true,
    },
    endedAt: {
      type: Date,
      default: null, // null means device is still ON
    },
    durationSeconds: {
      type: Number,
      default: 0,
    },
    energyKwh: {
      type: Number,
      default: 0,
      // Computed: (powerRatingWatt * durationSeconds) / 3_600_000
    },
    // Date-only field for efficient daily/weekly grouping
    date: {
      type: String, // stored as 'YYYY-MM-DD'
      required: true,
    },
  },
  { timestamps: true }
);

// Indexes for analytics queries
EnergyRecordSchema.index({ device: 1, date: 1 });
EnergyRecordSchema.index({ room: 1, date: 1 });
EnergyRecordSchema.index({ date: 1 });

// Static: compute kWh from watt and seconds
EnergyRecordSchema.statics.computeKwh = function (powerRatingWatt, durationSeconds) {
  return (powerRatingWatt * durationSeconds) / 3_600_000;
};

module.exports = mongoose.model('EnergyRecord', EnergyRecordSchema);
