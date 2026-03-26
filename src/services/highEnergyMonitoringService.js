/**
 * highEnergyMonitor.js
 *
 * Design Pattern: SCHEDULER (cron job)
 *
 * Runs every hour.  Finds any open EnergyRecord (endedAt = null) whose
 * session has been running longer than THRESHOLD_HOURS.  For each one,
 * creates a HIGH_ENERGY alert — but only if a HIGH_ENERGY alert for that
 * device hasn't already been created in the last THRESHOLD_HOURS.
 * This prevents alert spam (one alert per over-run, not one per cron tick).
 *
 * Register once at app bootstrap alongside AutomationService.scheduleAllActiveRules():
 *
 *   const highEnergyMonitor = require('./jobs/highEnergyMonitor');
 *   highEnergyMonitor.start();
 *
 * Dependencies:
 *   npm install node-cron
 */

const cron         = require('node-cron');
const EnergyRecord = require('../models/EnergyRecord');
const Device       = require('../models/Device');
const Alert        = require('../models/Alert');

// How long (hours) a device must be continuously ON before alerting
const THRESHOLD_HOURS = 6;

class HighEnergyMonitor {
  constructor() {
    if (HighEnergyMonitor._instance) return HighEnergyMonitor._instance;
    this._task = null;
    HighEnergyMonitor._instance = this;
  }

  /**
   * Start the hourly monitor.
   * Safe to call multiple times — won't double-register.
   */
  start() {
    if (this._task) return; // already running

    // Run once per hour, on the hour
    this._task = cron.schedule('0 * * * *', () => {
      this._checkLongRunning().catch((err) =>
        console.error('[HighEnergyMonitor] Check failed:', err.message)
      );
    });

    console.log('[HighEnergyMonitor] Started — checking every hour for devices running >' +
      ` ${THRESHOLD_HOURS}h.`);
  }

  stop() {
    if (this._task) {
      this._task.stop();
      this._task = null;
    }
  }

  // ── Core check ─────────────────────────────────────────────────────────────

  async _checkLongRunning() {
    const thresholdMs  = THRESHOLD_HOURS * 60 * 60 * 1000;
    const cutoffDate   = new Date(Date.now() - thresholdMs);

    // Find all open sessions that started before the threshold cutoff
    const longSessions = await EnergyRecord.find({
      endedAt:   null,
      startedAt: { $lte: cutoffDate },
    })
      .populate('device', 'name type powerRatingWatt')
      .lean();

    if (longSessions.length === 0) return;

    console.log(`[HighEnergyMonitor] Found ${longSessions.length} over-threshold session(s).`);

    for (const session of longSessions) {
      const device = session.device;
      if (!device) continue;

      // Dedup: skip if we already raised a HIGH_ENERGY alert for this device
      // within the same threshold window (prevents re-alerting every hour)
      const recentAlert = await Alert.findOne({
        type:      'HIGH_ENERGY',
        device:    device._id,
        createdAt: { $gte: cutoffDate },
      }).lean();

      if (recentAlert) {
        console.log(`[HighEnergyMonitor] Skipping ${device.name} — alert already exists.`);
        continue;
      }

      const runningHours = Math.floor(
        (Date.now() - new Date(session.startedAt).getTime()) / (60 * 60 * 1000)
      );

      await Alert.create({
        type:     'HIGH_ENERGY',
        message:  `${device.name} has been running for over ${runningHours} hour(s) continuously.`,
        severity: 'warning',
        device:   device._id,
      });

      console.log(`[HighEnergyMonitor] HIGH_ENERGY alert created for "${device.name}" ` +
        `(${runningHours}h running).`);
    }
  }
}

module.exports = new HighEnergyMonitor();