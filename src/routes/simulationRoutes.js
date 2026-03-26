const express = require('express');
const router = express.Router();
const SimulationController = require('../controllers/simulationController');
const { body, validationResult } = require('express-validator');

// Validation middleware
const validateSimulationRun = [
  body('scenario')
    .isIn(['HIGH_USAGE', 'NORMAL', 'ENERGY_SAVING', 'ON'])
    .withMessage('Scenario must be one of: HIGH_USAGE, NORMAL, ENERGY_SAVING, ON'),
  body('duration_hours')
    .isFloat({ min: 0.1 })
    .withMessage('duration_hours must be a positive number greater than 0'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({
        success: false,
        message: errors.array()[0].msg,
        code: 'VALIDATION_ERROR',
      });
    }
    next();
  }
];

// Routes
router.post('/run', validateSimulationRun, SimulationController.runSimulation);
router.get('/compare', SimulationController.compareSimulation);

module.exports = router;