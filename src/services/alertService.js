const Alert = require('../models/Alert');
const { NotFoundError } = require('../utils/AppError');

class AlertService {
  constructor() {
    if (AlertService._instance) return AlertService._instance;
    AlertService._instance = this;
  }

  /**
   * Basic counters for the dashboard and global stats.
   */
  async getAlertStats() {
    const [unread, critical, total, totalAlerts] = await Promise.all([
      Alert.countDocuments({ isRead: false }),
      Alert.countDocuments({ isRead: false, severity: 'critical' }),
      Alert.countDocuments({}),
      Alert.find().sort({ createdAt: -1 }).limit(5).populate('device', 'name').lean()
    ]);

    return { unread, critical, total, totalAlerts};
  }

  async getUnreadAlerts() {
    return await Alert.find({ isRead: false })
      .sort({ createdAt: -1 })
      .populate('device', 'name type')
      .lean();
    }

  async getCriticalAlerts() {
    return await Alert.find({ isRead: false, severity: 'critical' })
      .sort({ createdAt: -1 })
      .populate('device', 'name type')
      .lean();
  }

  /**
   * Fetches paginated alerts for a specific home.
   * Scopes the search to devices or rooms belonging to that home.
   */
  async getAlertsByHome(homeId, { page = 1, limit = 20, severity }) {
    const query = { home: homeId };
    if (severity) query.severity = severity;

    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      Alert.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('device', 'name type')
        .lean(),
      Alert.countDocuments(query),
    ]);

    return {
      data,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Updates an alert status to read.
   */
  async markAsRead(alertId) {
    const alert = await Alert.findByIdAndUpdate(
      alertId,
      { isRead: true, readAt: new Date() },
      { new: true }
    );

    if (!alert) {
      throw new NotFoundError('Alert not found.', 'ALERT_NOT_FOUND');
    }

    return alert;
  }
}

module.exports = new AlertService();