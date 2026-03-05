require('dotenv').config();
const mongoose   = require('mongoose');
const connectDB  = require('./config/db');
 
// Import all models
const User            = require('./models/User');
const Room            = require('./models/Room');
const Device          = require('./models/Device');
const EnergyRecord    = require('./models/EnergyRecord');
const Event           = require('./models/Event');
const AutomationRule  = require('./models/AutomationRule');
const Alert           = require('./models/Alert');
const MarkovTransition= require('./models/MarkovTransition');
 
const seedDatabase = async () => {
  await connectDB();
 
  // ── Step A: Clear existing data ──────────────────────────
  console.log('Clearing existing data...');
  await Promise.all([
    User.deleteMany(),
    Room.deleteMany(),
    Device.deleteMany(),
    EnergyRecord.deleteMany(),
    Event.deleteMany(),
    AutomationRule.deleteMany(),
    Alert.deleteMany(),
    MarkovTransition.deleteMany(),
  ]);
 
  // ── Step B: Create users ─────────────────────────────────
  console.log('Creating users...');
  const admin = await User.create({
    name: 'Areesha Admin',
    email: 'admin@smarthome.com',
    password: 'password123',
    role: 'ADMIN',
  });
  const resident = await User.create({
    name: 'Ali Resident',
    email: 'ali@smarthome.com',
    password: 'password123',
    role: 'RESIDENT',
  });
 
  // ── Step C: Create rooms ─────────────────────────────────
  console.log('Creating rooms...');
  const bedroom  = await Room.create({ name: 'Bedroom',    createdBy: admin._id });
  const lounge   = await Room.create({ name: 'Lounge',     createdBy: admin._id });
  const kitchen  = await Room.create({ name: 'Kitchen',    createdBy: admin._id });
  const bathroom = await Room.create({ name: 'Bathroom',   createdBy: admin._id });
 
  // ── Step D: Create devices ───────────────────────────────
  console.log('Creating devices...');
  const bedroomAC    = await Device.create({ name:'Bedroom AC',    type:'AC',    room:bedroom._id,  powerRatingWatt:1500, status:'ON'  });
  const bedroomLight = await Device.create({ name:'Bedroom Light', type:'LIGHT', room:bedroom._id,  powerRatingWatt:15,   status:'OFF' });
  const bedroomFan   = await Device.create({ name:'Bedroom Fan',   type:'FAN',   room:bedroom._id,  powerRatingWatt:75,   status:'OFF' });
  const loungeLight  = await Device.create({ name:'Lounge Light',  type:'LIGHT', room:lounge._id,   powerRatingWatt:20,   status:'ON'  });
  const loungeFan    = await Device.create({ name:'Lounge Fan',    type:'FAN',   room:lounge._id,   powerRatingWatt:60,   status:'OFF' });
  const kitchenLight = await Device.create({ name:'Kitchen Light', type:'LIGHT', room:kitchen._id,  powerRatingWatt:18,   status:'OFF' });
 
  // ── Step E: Create energy records ────────────────────────
  console.log('Creating energy records...');
  // Closed record — AC ran for 2 hours earlier today
  const twoHoursAgo = new Date(Date.now() - 2*60*60*1000);
  const oneHourAgo  = new Date(Date.now() - 1*60*60*1000);
  await EnergyRecord.create({
    device: bedroomAC._id, room: bedroom._id,
    startedAt: twoHoursAgo, endedAt: oneHourAgo,
    durationSeconds: 3600, energyKwh: 1.5,
    date: new Date().toISOString().split('T')[0],
  });
  // Open record — AC is still ON right now
  await EnergyRecord.create({
    device: bedroomAC._id, room: bedroom._id,
    startedAt: oneHourAgo,  // endedAt stays null
    date: new Date().toISOString().split('T')[0],
  });
 
  // ── Step F: Create events (Poisson log) ─────────────────
  console.log('Creating events...');
  await Event.create([
    { device:bedroomAC._id,    deviceName:'Bedroom AC',    action:'ON',  triggeredBy:'USER', user:admin._id },
    { device:bedroomLight._id, deviceName:'Bedroom Light', action:'OFF', triggeredBy:'USER', user:resident._id },
    { device:loungeLight._id,  deviceName:'Lounge Light',  action:'ON',  triggeredBy:'USER', user:admin._id },
    { device:bedroomAC._id,    deviceName:'Bedroom AC',    action:'IDLE',triggeredBy:'IOT_FEEDBACK' },
  ]);
 
  // ── Step G: Create automation rule ──────────────────────
  console.log('Creating automation rules...');
  await AutomationRule.create({
    name: 'Good Night',
    isActive: true,
    trigger: { type: 'TIME', time: '23:00' },
    actions: [
      { device: bedroomAC._id,    action: 'OFF' },
      { device: bedroomLight._id, action: 'OFF' },
    ],
    createdBy: admin._id,
  });
 
  // ── Step H: Create alerts ────────────────────────────────
  console.log('Creating alerts...');
  await Alert.create([
    { type:'HIGH_ENERGY', message:'Bedroom AC running for 6 hours continuously', severity:'warning', device:bedroomAC._id },
    { type:'DEVICE_FAULT',message:'Lounge Fan returned FAULT status',           severity:'critical',device:loungeFan._id },
  ]);
 
  // ── Step I: Create Markov transitions ───────────────────
  console.log('Creating Markov transitions...');
  await MarkovTransition.create([
    { device:bedroomAC._id, fromState:'OFF',  toState:'ON'  },
    { device:bedroomAC._id, fromState:'ON',   toState:'IDLE'},
    { device:bedroomAC._id, fromState:'IDLE', toState:'ON'  },
    { device:bedroomAC._id, fromState:'ON',   toState:'OFF' },
  ]);
 
  console.log('\n✓  Database seeded successfully!');
  console.log('  Users:     2  (1 admin, 1 resident)');
  console.log('  Rooms:     4');
  console.log('  Devices:   6');
  console.log('  Energy:    2 records');
  console.log('  Events:    4');
  console.log('  Rules:     1');
  console.log('  Alerts:    2');
  console.log('  Markov:    4 transitions');
 
  process.exit(0);
};
 
seedDatabase().catch(err => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
