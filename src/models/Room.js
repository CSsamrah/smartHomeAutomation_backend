const mongoose = require('mongoose');

const RoomSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Room name is required'],
      trim: true,
      maxlength: [100, 'Room name cannot exceed 100 characters'],
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

// Virtual: device count (populated on demand via aggregation)
RoomSchema.virtual('deviceCount', {
  ref: 'Device',
  localField: '_id',
  foreignField: 'room',
  count: true,
});

module.exports = mongoose.model('Room', RoomSchema);
