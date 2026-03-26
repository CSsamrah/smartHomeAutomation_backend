/**
 * ModelService  (Module 8 — AI / Mathematical Modeling)
 *
 * Design Patterns:
 *  • SERVICE LAYER  — all probabilistic model computation isolated here
 *  • STRATEGY       — Markov and Poisson are separate conceptual strategies,
 *                     both operating on immutable historical logs
 *  • SINGLETON      — one shared instance per process
 *
 * Two models are implemented:
 *
 *  1. MARKOV TRANSITION MATRIX
 *     P(toState | fromState) computed by counting fromState→toState pairs
 *     in the MarkovTransition collection and normalising row sums to 1.
 *     Yields the most-likely next state and a confidence score.
 *
 *  2. HOME DEVICE ANALYTICS
 *     Aggregated status + type breakdown across all devices in a home.
 *     Used by the admin dashboard's overview panel.
 *
 * Poisson λ estimation lives in EventService because it operates directly
 * on the Event log (same collection, same pattern) — no reason to split.
 */

const mongoose         = require('mongoose');
const MarkovTransition = require('../models/MarkovTransition');
const Device           = require('../models/Device');
const Room             = require('../models/Room');

const { NotFoundError } = require('../utils/AppError');

const STATES       = ['ON', 'OFF', 'IDLE', 'FAULT'];
const DEVICE_TYPES = ['AC', 'FAN', 'LIGHT'];

const oid = (id) => new mongoose.Types.ObjectId(id.toString());

class ModelService {
  constructor() {
    if (ModelService._instance) return ModelService._instance;
    ModelService._instance = this;
  }

  // ── Markov transition matrix ───────────────────────────────────────────────

  /**
   * Build the full Markov transition probability matrix for one device.
   *
   * Returns:
   * {
   *   deviceId, deviceName, totalTransitions,
   *   matrix:    { ON: { ON: 0, OFF: 0.6, ... }, OFF: { ... }, ... }
   *   rawCounts: { ON: { ON: 0, OFF: 3,   ... }, ... }
   * }
   *
   * @param {string} deviceId
   */
  async getMarkovMatrix(deviceId) {
    const device = await Device.findById(deviceId).lean();
    if (!device) throw new NotFoundError('Device not found.', 'DEVICE_NOT_FOUND');

    // Aggregate all fromState→toState counts for this device
    const counts = await MarkovTransition.aggregate([
      { $match: { device: oid(deviceId) } },
      {
        $group: {
          _id:   { from: '$fromState', to: '$toState' },
          count: { $sum: 1 },
        },
      },
    ]);

    // Initialise a zero-filled count map
    const countMap = {};
    for (const from of STATES) {
      countMap[from] = {};
      for (const to of STATES) countMap[from][to] = 0;
    }

    let totalTransitions = 0;
    for (const { _id: { from, to }, count } of counts) {
      countMap[from][to] = count;
      totalTransitions  += count;
    }

    // Normalise each row to get transition probabilities
    const matrix = {};
    for (const from of STATES) {
      const rowTotal = Object.values(countMap[from]).reduce((a, b) => a + b, 0);
      matrix[from]   = {};
      for (const to of STATES) {
        matrix[from][to] = rowTotal > 0
          ? +(countMap[from][to] / rowTotal).toFixed(4)
          : 0;
      }
    }

    return {
      deviceId:         device._id,
      deviceName:       device.name,
      currentStatus:    device.status,
      totalTransitions,
      matrix,
      rawCounts:        countMap,
    };
  }

  // ── Next-state prediction ──────────────────────────────────────────────────

  /**
   * Predict the most probable next state from the device's current state.
   *
   * Uses the Markov matrix row for `currentState` and picks the column
   * with the highest probability.  Returns a confidence score (0–1).
   *
   * If no transitions exist, predictedNextState is null and confidence is 0.
   *
   * @param {string} deviceId
   * @param {string} currentState  'ON' | 'OFF' | 'IDLE' | 'FAULT'
   */
  async predictNextState(deviceId, currentState) {
    const { matrix, totalTransitions, deviceName } = await this.getMarkovMatrix(deviceId);

    if (totalTransitions === 0) {
      return {
        deviceId,
        deviceName,
        currentState,
        predictedNextState: null,
        confidence:         0,
        note: 'No transition history available for this device.',
      };
    }

    const row  = matrix[currentState];
    let bestState = null;
    let bestProb  = -1;

    for (const [state, prob] of Object.entries(row)) {
      if (prob > bestProb) { bestProb = prob; bestState = state; }
    }

    return {
      deviceId,
      deviceName,
      currentState,
      predictedNextState: bestState,
      confidence:         bestProb,
      allProbabilities:   row,
      note: this._interpretConfidence(bestProb),
    };
  }

  // ── Home-level device analytics ────────────────────────────────────────────

  /**
   * Aggregated device status and type breakdown for all devices in a home.
   * Used by the admin overview panel / analytics tab.
   *
   * @param {string} homeId
   */
  async getHomeDeviceAnalytics(homeId) {
    const rooms    = await Room.find({ home: homeId, isActive: true }).select('_id').lean();
    const roomIds  = rooms.map((r) => r._id);

    const devices  = await Device.find({ room: { $in: roomIds }, isActive: true })
      .select('_id name type status room')
      .lean();

    const byStatus = STATES.reduce((acc, s) => {
      acc[s] = devices.filter((d) => d.status === s).length;
      return acc;
    }, {});

    const byType = DEVICE_TYPES.reduce((acc, t) => {
      acc[t] = devices.filter((d) => d.type === t).length;
      return acc;
    }, {});

    // Which rooms have devices currently ON or IDLE (active rooms)
    const activeDeviceIds = devices
      .filter((d) => d.status === 'ON' || d.status === 'IDLE')
      .map((d) => d.room.toString());

    const activeRoomCount = new Set(activeDeviceIds).size;

    return {
      homeId,
      totalDevices:    devices.length,
      activeRooms:     activeRoomCount,
      totalRooms:      rooms.length,
      byStatus,
      byType,
    };
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  _interpretConfidence(prob) {
    if (prob >= 0.8) return 'High confidence — strongly predictable transition.';
    if (prob >= 0.5) return 'Moderate confidence — likely but not certain.';
    if (prob >  0)   return 'Low confidence — multiple transitions are equally probable.';
    return 'No data — transition cannot be predicted.';
  }
}

module.exports = new ModelService();

