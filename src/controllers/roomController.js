// controllers/roomController.js
const Room   = require('../models/Room');
const Device = require('../models/Device');
 
// GET /api/rooms
exports.getAllRooms = async (req, res) => {
  try {
    const rooms = await Room.find().sort({ createdAt: 1 });
 
    const result = await Promise.all(
      rooms.map(async (room) => {
        const device_count = await Device.countDocuments({
          room: room._id,
          isActive: true
        });
        return { id: room._id, name: room.name, device_count };
      })
    );
 
    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/rooms
exports.createRoom = async (req, res) => {
  try {
    const { name } = req.body;
 
    if (!name) {
      return res.status(400).json({ message: 'Room name is required' });
    }
 
    const room = await Room.create({
      name,
      createdBy: req.user.id,  // set by auth middleware from Person 1
    });
 
    res.status(201).json({ id: room._id, name: room.name });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/rooms/:room_id
exports.getRoomById = async (req, res) => {
  try {
    const room = await Room.findById(req.params.room_id);
    if (!room) return res.status(404).json({ message: 'Room not found' });
 
    const devices = await Device.find({
      room: room._id,
      isActive: true
    }).select('name type status powerRatingWatt lastUpdated');
 
    res.status(200).json({
      id: room._id,
      name: room.name,
      devices: devices.map(d => ({
        id: d._id,
        name: d.name,
        type: d.type,
        status: d.status,
        current_state: d.status,
      }))
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
