const Device = require('../models/Device');
const EnergyRecord = require('../models/EnergyRecord');
const SimulationResult = require('../models/simulationResult');

const SCENARIO_MULTIPLIERS = {
  HIGH_USAGE: 1.2,
  NORMAL: 1.0,
  ENERGY_SAVING: 0.6,
  ON: 1.0,
};

class SimulationService {
  /**
   * Run energy simulation based on active devices and scenario
   */
  static async runSimulation(scenario, durationHours) {
    if (!SCENARIO_MULTIPLIERS[scenario]) {
      throw new Error(
        `Invalid scenario: ${scenario}. Valid options: ${Object.keys(
          SCENARIO_MULTIPLIERS
        ).join(', ')}`
      );
    }

    const activeDevices = await Device.find({ isActive: true, status: 'ON' });
    if (activeDevices.length === 0) {
      throw new Error('No active devices found for simulation');
    }

    const durationSeconds = durationHours * 3600;
    let totalEnergyKwh = 0;

    for (const device of activeDevices) {
      totalEnergyKwh += (device.powerRatingWatt * durationSeconds) / 3600000;
    }

    const multiplier = SCENARIO_MULTIPLIERS[scenario];
    totalEnergyKwh *= multiplier;

    const totalDevices = await Device.countDocuments({ isActive: true });
    const utilization = totalDevices > 0 ? (activeDevices.length / totalDevices) * 100 : 0;
    const avgResponseTimeMs = Math.random() * 100 + 50;

    const result = {
      scenario,
      durationHours,
      energyKwh: Math.round(totalEnergyKwh * 100) / 100,
      avgResponseTimeMs: Math.round(avgResponseTimeMs),
      utilization: Math.round(utilization * 100) / 100,
    };

    // Save to MongoDB
    const savedResult = await SimulationResult.create(result);

    return savedResult;
  }

  /**
   * Compare last simulation result with today's real energy consumption
   */
  static async compareWithRealData() {
  // Get latest simulation
  const lastSimulationResult = await SimulationResult.findOne({})
    .sort({ createdAt: -1 })
    .lean();

  if (!lastSimulationResult) {
    throw new Error('No simulation result available. Run a simulation first.');
  }

  const today = new Date().toISOString().split('T')[0];

  const todayRecords = await EnergyRecord.aggregate([
    { $match: { date: today } },
    { $group: { _id: null, totalEnergyKwh: { $sum: '$energyKwh' } } },
  ]);

  const realEnergyKwh =
    todayRecords.length > 0 ? todayRecords[0].totalEnergyKwh : 0;

  const simulatedEnergyKwh = lastSimulationResult.energyKwh;

  // Handle case when no real data exists
  if (realEnergyKwh === 0) {
    return {
      real_energy_kwh: 0,
      simulated_energy_kwh: simulatedEnergyKwh,
      difference_percent: null,
      accuracy: null,
      message: 'No real energy data available for today',
      scenario: lastSimulationResult.scenario,
      duration_hours: lastSimulationResult.durationHours,
      simulated_at: lastSimulationResult.createdAt,
    };
  }

  // Normal calculation when real data exists
  const differencePercent =
    ((simulatedEnergyKwh - realEnergyKwh) / realEnergyKwh) * 100;

  const accuracy = Math.max(0, 100 - Math.abs(differencePercent));

  return {
    real_energy_kwh: Math.round(realEnergyKwh * 100) / 100,
    simulated_energy_kwh: simulatedEnergyKwh,
    difference_percent: Math.round(differencePercent * 100) / 100,
    accuracy: Math.round(accuracy * 100) / 100,
    scenario: lastSimulationResult.scenario,
    duration_hours: lastSimulationResult.durationHours,
    simulated_at: lastSimulationResult.createdAt,
  };
}

  /**
   * Optionally: get history of simulation results
   */
  static async getSimulationHistory(limit = 10) {
    return SimulationResult.find({})
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
  }
}

module.exports = SimulationService;