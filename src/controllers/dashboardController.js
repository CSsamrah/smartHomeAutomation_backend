const Room         = require('../models/Room');
const Device       = require('../models/Device');
const EnergyRecord = require('../models/EnergyRecord');
const Event = require('../models/Event');
const Alert = require('../models/Alert');
 
// GET /api/dashboard/summary
exports.getSummary = async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0]; // 'YYYY-MM-DD'
 
    const [total_rooms, total_devices, active_devices, energyResult] = await Promise.all([
      Room.countDocuments(),
      Device.countDocuments({ isActive: true }),
      Device.countDocuments({ status: 'ON', isActive: true }),
      EnergyRecord.aggregate([
        { $match: { date: today } },
        { $group: { _id: null, total: { $sum: '$energyKwh' } } }
      ])
    ]);
 
    // energyResult is an array — get the total or default to 0
    const total_energy_today_kwh = energyResult[0]?.total || 0;
 
    res.status(200).json({
      total_rooms,
      total_devices,
      active_devices,
      total_energy_today_kwh: parseFloat(total_energy_today_kwh.toFixed(2))
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/events/recent?limit=5
exports.getRecentEvents = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 5;
 
    const events = await Event.find()
      .sort({ timestamp: -1 })   // newest first
      .limit(limit)
      .select('deviceName action timestamp triggeredBy');
 
    const result = events.map(e => ({
      device_name: e.deviceName,
      action:      e.action,
      timestamp:   e.timestamp,
      triggered_by: e.triggeredBy
    }));
 
    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/alerts
exports.getAlerts = async (req, res) => {
  try {
    const alerts = await Alert.find({ isRead: false })
      .sort({ createdAt: -1 })
      .populate('device', 'name type');  // get device name if linked
 
    res.status(200).json(alerts.map(a => ({
      id:       a._id,
      type:     a.type,
      message:  a.message,
      severity: a.severity,
      device:   a.device?.name || null,
      created:  a.createdAt
    })));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
