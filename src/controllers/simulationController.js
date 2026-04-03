const SimulationService = require('../services/simulationService');
const ApiResponse = require('../utils/ApiResponse');
const { ValidationError, AppError } = require('../utils/AppError');

class SimulationController {
  /**
   * POST /simulation/run
   * Run energy simulation
   */
  static async runSimulation(req, res, next) {
    try {
      const { scenario, duration_hours } = req.body;

      // Validate input
      if (!scenario || !duration_hours) {
        // Use ValidationError for 422
        return next(new ValidationError('Scenario and duration_hours are required'));
      }

      if (typeof duration_hours !== 'number' || duration_hours <= 0) {
        return next(new ValidationError('duration_hours must be a positive number'));
      }

      // Run simulation
      const result = await SimulationService.runSimulation(scenario, duration_hours);

      res.status(200).json(
        ApiResponse.success('Simulation completed successfully', result)
      );
    } catch (error) {
      // Pass unknown errors to global error handler
      next(error instanceof AppError ? error : new AppError(error.message, 500));
    }
  }

  /**
   * GET /simulation/compare
   * Compare simulation with real data
   */
  static async compareSimulation(req, res, next) {
    try {
      const result = await SimulationService.compareWithRealData();

      res.status(200).json(
        ApiResponse.success('Comparison completed successfully', result)
      );
    } catch (error) {
      next(error instanceof AppError ? error : new AppError(error.message, 500));
    }
  }
}

module.exports = SimulationController;