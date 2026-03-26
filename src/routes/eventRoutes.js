/**
 * eventRoutes.js
 *
 * Mount point (app.js): app.use('/api/events', eventRoutes)
 *
 * Route map:
 *   GET /api/events/recent                          → inline (simple find)
 *   GET /api/events/device/:deviceId/lambda         → eventController.getPoissonLambda
 *   GET /api/events/device/:deviceId/frequency      → eventController.getActionFrequency
**/

const express              = require('express');
const router               = express.Router();
const { protect } = require('../middleware/authMiddleware');
const Event = require('../models/Event');
const eventController  = require('../controllers/eventController');

router.use(protect);


router.get('/recent', protect, async (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  const events = await Event.find()
    .sort({ timestamp: -1 })
    .limit(limit)
    .lean();
  res.json({ success: true, data: { events } });
});


// ── GET /events/device/:deviceId/lambda ───────────────────────────────────
router.get(
  '/device/:deviceId/lambda',
  eventController.handle(eventController.getPoissonLambda.bind(eventController))
);


// ── GET /events/device/:deviceId/frequency ────────────────────────────────
router.get(
  '/device/:deviceId/frequency',
  eventController.handle(eventController.getActionFrequency.bind(eventController))
);

module.exports = router;