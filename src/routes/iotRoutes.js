/**
 * iotRoutes.js
 *
 * Hardware → Backend webhook endpoint.
 * No JWT auth — secured by API key header instead (hardware can't do OAuth).
 *
 * Middleware: iotApiKeyMiddleware checks req.headers['x-iot-key']
 */

const router     = require('express').Router();
const controller = require('../controllers/deviceController');
const { validateIotFeedback } = require('../validators/deviceValidator');
 
const iotApiKeyMiddleware = (req, res, next) => {
  const key = req.headers['x-iot-key'];
  if (!key || key !== process.env.IOT_API_KEY) {
    return res.status(401).json({ success: false, message: 'Invalid IoT API key' });
  }
  next();
};
 
router.post(
  '/feedback',
  iotApiKeyMiddleware,
  validateIotFeedback,
  controller.handle(controller.iotFeedback.bind(controller))
);
 
module.exports = router;