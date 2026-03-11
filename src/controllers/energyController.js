const EnergyRecord = require('../models/EnergyRecord');
const mongoose     = require('mongoose');
 
// Helper: build date range filter
const getDateRange = (range) => {
  const now  = new Date();
  const days = range === 'weekly' ? 7 : range === 'monthly' ? 30 : 1;
  const from = new Date(now);
  from.setDate(from.getDate() - (days - 1));
  return from.toISOString().split('T')[0]; // 'YYYY-MM-DD'
};
 
//Device Energy (Show total energy of one Device grouped by Date)
// GET /api/energy/device/:device_id?range=daily
exports.getDeviceEnergy = async (req, res) => {
  try {
    const { device_id } = req.params;
    const range   = req.query.range || 'daily';
    const fromDate = getDateRange(range);
 
    const data = await EnergyRecord.aggregate([
      {
        $match: {
          device: new mongoose.Types.ObjectId(device_id),
          date:   { $gte: fromDate },
          endedAt: { $ne: null }     // only closed (completed) records
        }
      },
      {
        $group: {
          _id:   '$date',
          kwh:   { $sum: '$energyKwh' }
        }
      },
      { $sort: { _id: 1 } }
    ]);
 
    const total = data.reduce((sum, d) => sum + d.kwh, 0);
 
    res.status(200).json({
      device_id,
      energy_kwh: parseFloat(total.toFixed(3)),
      data: data.map(d => ({ date: d._id, kwh: parseFloat(d.kwh.toFixed(3)) }))
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

//Room-Wise Energy (Show total energy grouped by rooms)
// GET /api/energy/rooms?range=monthly
exports.getRoomEnergy = async (req, res) => {
  try {
    const range    = req.query.range || 'monthly';
    const fromDate = getDateRange(range);
 
    const data = await EnergyRecord.aggregate([
      { $match: { date: { $gte: fromDate }, endedAt: { $ne: null } } },
      {
        $group: {
          _id:        '$room',
          energy_kwh: { $sum: '$energyKwh' }
        }
      },
      {
        $lookup: {                       // join with rooms collection
          from:         'rooms',
          localField:   '_id',
          foreignField: '_id',
          as:           'roomInfo'
        }
      },
      { $unwind: '$roomInfo' },
      { $sort: { energy_kwh: -1 } }     // highest consuming room first
    ]);
 
    res.status(200).json(data.map(d => ({
      room:       d.roomInfo.name,
      energy_kwh: parseFloat(d.energy_kwh.toFixed(3))
    })));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


// GET /api/energy/overview (Displays daily trend line, monthly bar chart, room-wise pie chart data)
exports.getOverview = async (req, res) => {
  try {
    const sevenDaysAgo  = getDateRange('weekly');
    const thirtyDaysAgo = getDateRange('monthly');
 
    const [daily, roomWise] = await Promise.all([
 
      // Daily trend: last 7 days
      EnergyRecord.aggregate([
        { $match: { date: { $gte: sevenDaysAgo }, endedAt: { $ne: null } } },
        { $group: { _id: '$date', kwh: { $sum: '$energyKwh' } } },
        { $sort: { _id: 1 } }
      ]),
 
      // Room-wise: last 30 days
      EnergyRecord.aggregate([
        { $match: { date: { $gte: thirtyDaysAgo }, endedAt: { $ne: null } } },
        { $group: { _id: '$room', kwh: { $sum: '$energyKwh' } } },
        { $lookup: { from:'rooms', localField:'_id', foreignField:'_id', as:'roomInfo' } },
        { $unwind: '$roomInfo' },
        { $sort: { kwh: -1 } }
      ])
    ]);
 
    res.status(200).json({
      daily:     daily.map(d => ({ date: d._id, kwh: parseFloat(d.kwh.toFixed(3)) })),
      room_wise: roomWise.map(d => ({ room: d.roomInfo.name, kwh: parseFloat(d.kwh.toFixed(3)) }))
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
