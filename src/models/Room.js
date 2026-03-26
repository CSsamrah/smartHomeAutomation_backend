
const mongoose = require('mongoose');

const RoomSchema = new mongoose.Schema(
  {
    // ── Identity ──────────────────────────────────────────────────────────
    name: {
      type:      String,
      required:  [true, 'Room name is required'],
      trim:      true,
      maxlength: [100, 'Room name cannot exceed 100 characters'],
    },
    description: {
      type:    String,
      trim:    true,
      default: null,
    },

    // ── Relationships ─────────────────────────────────────────────────────

    /**
     * The Home this room belongs to.
     * Required — a room without a home is orphaned and meaningless.
     */
    home: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'Home',
      required: [true, 'Room must belong to a home'],
    },

    /**
     * The Admin user who created this room.
     * Always the admin of the home — enforced in the service layer.
     */
    createdBy: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: [true, 'Room must have a creator'],
    },

    // ── Status ────────────────────────────────────────────────────────────
    isActive: {
      type:    Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(_, ret) {
        delete ret.__v;
        return ret;
      },
    },
  }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────
RoomSchema.index({ home: 1 });
RoomSchema.index({ home: 1, name: 1 }, { unique: true }); // no duplicate room names in same home

// ─── Virtuals ─────────────────────────────────────────────────────────────────

/**
 * Device count — populated on demand via virtual populate.
 * Usage: Room.findById(id).populate('deviceCount')
 */
RoomSchema.virtual('deviceCount', {
  ref:        'Device',
  localField: '_id',
  foreignField: 'room',
  count:      true,
});

// ─── Active Record Instance Methods ──────────────────────────────────────────

/** True if this room belongs to the given homeId. */
RoomSchema.methods.belongsToHome = function (homeId) {
  return this.home.toString() === homeId.toString();
};

/** True if this room was created by the given userId. */
RoomSchema.methods.wasCreatedBy = function (userId) {
  return this.createdBy.toString() === userId.toString();
};

/** Safe public shape for API responses. */
RoomSchema.methods.toPublicJson = function () {
  return {
    id:          this._id,
    name:        this.name,
    description: this.description,
    home:        this.home,
    createdBy:   this.createdBy,
    isActive:    this.isActive,
    createdAt:   this.createdAt,
    updatedAt:   this.updatedAt,
  };
};

module.exports = mongoose.model('Room', RoomSchema);