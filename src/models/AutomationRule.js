const mongoose = require('mongoose');

// Sub-schema: a single action inside an automation
const ActionSchema = new mongoose.Schema(
  {
    device: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Device',
      required: true,
    },
    action: {
      type: String,
      enum: ['ON', 'OFF', 'IDLE'],
      required: true,
    },
  },
  { _id: false } // no separate _id for sub-documents
);

// Sub-schema: trigger definition
const TriggerSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['TIME', 'CONDITION'],
      required: true,
    },
    // For TIME triggers: "HH:MM" in 24-hour format, e.g. "23:00"
    time: {
      type: String,
      default: null,
      match: [/^\d{2}:\d{2}$/, 'Time must be in HH:MM format'],
    },
    // For CONDITION triggers: a flexible condition expression object
    condition: {
      field: { type: String, default: null },   // e.g. "energy_kwh"
      operator: { type: String, default: null }, // e.g. "gt", "lt", "eq"
      value: { type: Number, default: null },    // e.g. 10
    },
  },
  { _id: false }
);

const AutomationRuleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Automation name is required'],
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    trigger: {
      type: TriggerSchema,
      required: true,
    },
    actions: {
      type: [ActionSchema],
      validate: [arr => arr.length > 0, 'At least one action is required'],
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    lastRunAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

AutomationRuleSchema.index({ isActive: 1 });

module.exports = mongoose.model('AutomationRule', AutomationRuleSchema);
