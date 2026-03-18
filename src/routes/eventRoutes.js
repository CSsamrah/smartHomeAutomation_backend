const router = require('express').Router();
const { protect } = require('../middleware/authMiddleware');
const Event = require('../models/Event');

router.get('/recent', protect, async (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  const events = await Event.find()
    .sort({ timestamp: -1 })
    .limit(limit)
    .lean();
  res.json({ success: true, data: { events } });
});

module.exports = router;