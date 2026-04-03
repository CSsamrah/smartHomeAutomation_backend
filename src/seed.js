require('dotenv').config();
const mongoose  = require('mongoose');
const connectDB = require('./config/db');

// ── Import all models ────────────────────────────────────────────────────────
const User            = require('./models/User');
const Home            = require('./models/Home');
const Room            = require('./models/Room');
const Device          = require('./models/Device');
const EnergyRecord    = require('./models/EnergyRecord');
const Event           = require('./models/Event');
const AutomationRule  = require('./models/AutomationRule');
const Alert           = require('./models/Alert');
const MarkovTransition= require('./models/MarkovTransition');
const Invitation      = require('./models/Invitation');

const seedDatabase = async () => {
  await connectDB();

  // ── Step A: Clear existing data ──────────────────────────────────────────
  console.log('Clearing existing data...');
  await Promise.all([
    User.deleteMany(),
    Home.deleteMany(),
    Room.deleteMany(),
    Device.deleteMany(),
    EnergyRecord.deleteMany(),
    Event.deleteMany(),
    AutomationRule.deleteMany(),
    Alert.deleteMany(),
    MarkovTransition.deleteMany(),
    Invitation.deleteMany(),
  ]);

  // ── Step B: Create users ─────────────────────────────────────────────────
  console.log('Creating users...');

  const admin = await User.create({
    name:     'Areesha Admin',
    email:    'admin@smarthome.com',
    password: 'password123',
    role:     'ADMIN',
  });

  const resident1 = await User.create({
    name:     'Ali Resident',
    email:    'ali@smarthome.com',
    password: 'password123',
    role:     'RESIDENT',
  });

  const resident2 = await User.create({
    name:     'Sara Resident',
    email:    'sara@smarthome.com',
    password: 'password123',
    role:     'RESIDENT',
  });

  // ── Step C: Create home ──────────────────────────────────────────────────
  // NOTE: Home.pre('save') validates that admin field points to an ADMIN-role
  // user, so users must be created first.
  console.log('Creating home...');

  const home = await Home.create({
    name:      'Smart Villa',
    address:   '12 Tech Street, Karachi',
    admin:     admin._id,
    residents: [resident1._id, resident2._id],
    isActive:  true,
  });

  // ── Step D: Create rooms ─────────────────────────────────────────────────
  // NOTE: Room requires both `home` and `createdBy` — the old seed was missing
  // the `home` field entirely, causing validation failures at runtime.
  console.log('Creating rooms...');

  const bedroom  = await Room.create({ name: 'Bedroom',  home: home._id, createdBy: admin._id });
  const lounge   = await Room.create({ name: 'Lounge',   home: home._id, createdBy: admin._id });
  const kitchen  = await Room.create({ name: 'Kitchen',  home: home._id, createdBy: admin._id });
  const bathroom = await Room.create({ name: 'Bathroom', home: home._id, createdBy: admin._id });

  // ── Step E: Create devices ───────────────────────────────────────────────
  console.log('Creating devices...');

  const bedroomAC    = await Device.create({ name: 'Bedroom AC',    type: 'AC',    room: bedroom._id,  powerRatingWatt: 1500, status: 'ON'  });
  const bedroomLight = await Device.create({ name: 'Bedroom Light', type: 'LIGHT', room: bedroom._id,  powerRatingWatt: 15,   status: 'OFF' });
  const bedroomFan   = await Device.create({ name: 'Bedroom Fan',   type: 'FAN',   room: bedroom._id,  powerRatingWatt: 75,   status: 'IDLE'});
  const loungeLight  = await Device.create({ name: 'Lounge Light',  type: 'LIGHT', room: lounge._id,   powerRatingWatt: 20,   status: 'ON'  });
  const loungeFan    = await Device.create({ name: 'Lounge Fan',    type: 'FAN',   room: lounge._id,   powerRatingWatt: 60,   status: 'FAULT'});
  const kitchenLight = await Device.create({ name: 'Kitchen Light', type: 'LIGHT', room: kitchen._id,  powerRatingWatt: 18,   status: 'OFF' });
  const bathroomLight= await Device.create({ name: 'Bathroom Light',type: 'LIGHT', room: bathroom._id, powerRatingWatt: 10,   status: 'OFF' });

  // ── Step F: Create energy records ────────────────────────────────────────
  console.log('Creating energy records...');

  const today        = new Date().toISOString().split('T')[0]; // 'YYYY-MM-DD'
  const twoHoursAgo  = new Date(Date.now() - 2 * 60 * 60 * 1000);
  const oneHourAgo   = new Date(Date.now() - 1 * 60 * 60 * 1000);
  const threeHrsAgo  = new Date(Date.now() - 3 * 60 * 60 * 1000);

  await EnergyRecord.create([
    {
      // Closed record — Bedroom AC ran for 1 hour earlier today
      device:          bedroomAC._id,
      room:            bedroom._id,
      startedAt:       twoHoursAgo,
      endedAt:         oneHourAgo,
      durationSeconds: 3600,
      energyKwh:       EnergyRecord.computeKwh(1500, 3600), // 1.5 kWh
      date:            today,
    },
    {
      // Open record — Bedroom AC is still ON right now
      device:    bedroomAC._id,
      room:      bedroom._id,
      startedAt: oneHourAgo,
      // endedAt: null  → device still running
      date:      today,
    },
    {
      // Closed record — Lounge Light ran for 2 hours
      device:          loungeLight._id,
      room:            lounge._id,
      startedAt:       threeHrsAgo,
      endedAt:         oneHourAgo,
      durationSeconds: 7200,
      energyKwh:       EnergyRecord.computeKwh(20, 7200), // 0.04 kWh
      date:            today,
    },
  ]);

  // ── Step G: Create events (Poisson log) ──────────────────────────────────
  console.log('Creating events...');

  await Event.create([
    { device: bedroomAC._id,    deviceName: 'Bedroom AC',    action: 'ON',   triggeredBy: 'USER',         user: admin._id    },
    { device: bedroomLight._id, deviceName: 'Bedroom Light', action: 'OFF',  triggeredBy: 'USER',         user: resident1._id},
    { device: loungeLight._id,  deviceName: 'Lounge Light',  action: 'ON',   triggeredBy: 'USER',         user: admin._id    },
    { device: bedroomAC._id,    deviceName: 'Bedroom AC',    action: 'IDLE', triggeredBy: 'IOT_FEEDBACK'                      },
    { device: loungeFan._id,    deviceName: 'Lounge Fan',    action: 'FAULT',triggeredBy: 'IOT_FEEDBACK'                      },
    { device: bedroomFan._id,   deviceName: 'Bedroom Fan',   action: 'IDLE', triggeredBy: 'AUTOMATION'                        },
  ]);

  // ── Step H: Create automation rules ──────────────────────────────────────
  console.log('Creating automation rules...');

  await AutomationRule.create([
    {
      name:      'Good Night',
      isActive:  true,
      trigger:   { type: 'TIME', time: '23:00' },
      actions: [
        { device: bedroomAC._id,    action: 'OFF' },
        { device: bedroomLight._id, action: 'OFF' },
        { device: bedroomFan._id,   action: 'OFF' },
      ],
      createdBy: admin._id,
    },
    {
      name:     'High Energy Cutoff',
      isActive: true,
      trigger: {
        type:      'CONDITION',
        condition: { field: 'energy_kwh', operator: 'gt', value: 10 },
      },
      actions: [
        { device: bedroomAC._id,  action: 'OFF' },
        { device: loungeFan._id,  action: 'OFF' },
      ],
      createdBy: admin._id,
    },
    {
      name:      'Morning Lights On',
      isActive:  false, // disabled rule — useful to test isActive filter
      trigger:   { type: 'TIME', time: '07:00' },
      actions: [
        { device: kitchenLight._id,  action: 'ON' },
        { device: bathroomLight._id, action: 'ON' },
      ],
      createdBy: admin._id,
    },
  ]);

  // ── Step I: Create alerts ─────────────────────────────────────────────────
  console.log('Creating alerts...');

  await Alert.create([
    {
      type:     'HIGH_ENERGY',
      message:  'Bedroom AC has been running for over 6 hours continuously.',
      severity: 'warning',
      device:   bedroomAC._id,
    },
    {
      type:     'DEVICE_FAULT',
      message:  'Lounge Fan reported a FAULT status via IoT feedback.',
      severity: 'critical',
      device:   loungeFan._id,
    },
    {
      type:     'AUTOMATION_FAILED',
      message:  'Good Night rule could not turn off Bedroom Fan — device unreachable.',
      severity: 'info',
      device:   bedroomFan._id,
    },
  ]);

  // ── Step J: Create Markov transitions ────────────────────────────────────
  console.log('Creating Markov transitions...');

  await MarkovTransition.create([
    // Bedroom AC state history
    { device: bedroomAC._id, fromState: 'OFF',  toState: 'ON'   },
    { device: bedroomAC._id, fromState: 'ON',   toState: 'IDLE' },
    { device: bedroomAC._id, fromState: 'IDLE', toState: 'ON'   },
    { device: bedroomAC._id, fromState: 'ON',   toState: 'OFF'  },
    { device: bedroomAC._id, fromState: 'OFF',  toState: 'ON'   },
    { device: bedroomAC._id, fromState: 'ON',   toState: 'IDLE' },
    // Lounge Fan state history (ended in FAULT)
    { device: loungeFan._id, fromState: 'OFF',  toState: 'ON'   },
    { device: loungeFan._id, fromState: 'ON',   toState: 'FAULT'},
    // Bedroom Light state history
    { device: bedroomLight._id, fromState: 'OFF', toState: 'ON'  },
    { device: bedroomLight._id, fromState: 'ON',  toState: 'OFF' },
    { device: bedroomLight._id, fromState: 'OFF', toState: 'ON'  },
    { device: bedroomLight._id, fromState: 'ON',  toState: 'OFF' },
  ]);

  // ── Step K: Create invitations ────────────────────────────────────────────
  // NOTE: Invitation was completely absent from the old seed.
  console.log('Creating invitations...');

  await Invitation.create([
    {
      // Pending invitation for a new user not yet registered
      home:      home._id,
      invitedBy: admin._id,
      email:     'newresident@example.com',
      token:     Invitation.generateToken(),
      status:    'pending',
      expiresAt: Invitation.calculateExpiry(48), // expires in 48 hours
    },
    {
      // Already accepted invitation — reflects resident2's onboarding
      home:       home._id,
      invitedBy:  admin._id,
      email:      resident2.email,
      token:      Invitation.generateToken(),
      status:     'accepted',
      expiresAt:  Invitation.calculateExpiry(48),
      acceptedBy: resident2._id,
      acceptedAt: new Date(),
    },
    {
      // Expired invitation — useful for testing the isExpired() method
      home:      home._id,
      invitedBy: admin._id,
      email:     'expired@example.com',
      token:     Invitation.generateToken(),
      status:    'pending',
      expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 hrs in the past
    },
  ]);

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('\n✓  Database seeded successfully!');
  console.log('  Users:       3  (1 admin, 2 residents)');
  console.log('  Homes:       1');
  console.log('  Rooms:       4  (Bedroom, Lounge, Kitchen, Bathroom)');
  console.log('  Devices:     7');
  console.log('  Energy:      3 records (2 closed, 1 open)');
  console.log('  Events:      6');
  console.log('  Rules:       3  (2 active, 1 disabled)');
  console.log('  Alerts:      3  (warning, critical, info)');
  console.log('  Markov:     12 transitions');
  console.log('  Invitations: 3  (pending, accepted, expired)');
  console.log('\n  Credentials (all passwords: password123)');
  console.log('  admin@smarthome.com   → ADMIN');
  console.log('  ali@smarthome.com     → RESIDENT');
  console.log('  sara@smarthome.com    → RESIDENT');

  process.exit(0);
};

seedDatabase().catch(err => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
















// require('dotenv').config();
// const mongoose   = require('mongoose');
// const connectDB  = require('./config/db');
 
// // Import all models
// const User            = require('./models/User');
// const Room            = require('./models/Room');
// const Device          = require('./models/Device');
// const EnergyRecord    = require('./models/EnergyRecord');
// const Event           = require('./models/Event');
// const AutomationRule  = require('./models/AutomationRule');
// const Alert           = require('./models/Alert');
// const MarkovTransition= require('./models/MarkovTransition');
 
// const seedDatabase = async () => {
//   await connectDB();
 
//   // ── Step A: Clear existing data ──────────────────────────
//   console.log('Clearing existing data...');
//   await Promise.all([
//     User.deleteMany(),
//     Room.deleteMany(),
//     Device.deleteMany(),
//     EnergyRecord.deleteMany(),
//     Event.deleteMany(),
//     AutomationRule.deleteMany(),
//     Alert.deleteMany(),
//     MarkovTransition.deleteMany(),
//   ]);
 
//   // ── Step B: Create users ─────────────────────────────────
//   console.log('Creating users...');
//   const admin = await User.create({
//     name: 'Areesha Admin',
//     email: 'admin@smarthome.com',
//     password: 'password123',
//     role: 'ADMIN',
//   });
//   const resident = await User.create({
//     name: 'Ali Resident',
//     email: 'ali@smarthome.com',
//     password: 'password123',
//     role: 'RESIDENT',
//   });
 
//   // ── Step C: Create rooms ─────────────────────────────────
//   console.log('Creating rooms...');
//   const bedroom  = await Room.create({ name: 'Bedroom',    createdBy: admin._id });
//   const lounge   = await Room.create({ name: 'Lounge',     createdBy: admin._id });
//   const kitchen  = await Room.create({ name: 'Kitchen',    createdBy: admin._id });
//   const bathroom = await Room.create({ name: 'Bathroom',   createdBy: admin._id });
 
//   // ── Step D: Create devices ───────────────────────────────
//   console.log('Creating devices...');
//   const bedroomAC    = await Device.create({ name:'Bedroom AC',    type:'AC',    room:bedroom._id,  powerRatingWatt:1500, status:'ON'  });
//   const bedroomLight = await Device.create({ name:'Bedroom Light', type:'LIGHT', room:bedroom._id,  powerRatingWatt:15,   status:'OFF' });
//   const bedroomFan   = await Device.create({ name:'Bedroom Fan',   type:'FAN',   room:bedroom._id,  powerRatingWatt:75,   status:'OFF' });
//   const loungeLight  = await Device.create({ name:'Lounge Light',  type:'LIGHT', room:lounge._id,   powerRatingWatt:20,   status:'ON'  });
//   const loungeFan    = await Device.create({ name:'Lounge Fan',    type:'FAN',   room:lounge._id,   powerRatingWatt:60,   status:'OFF' });
//   const kitchenLight = await Device.create({ name:'Kitchen Light', type:'LIGHT', room:kitchen._id,  powerRatingWatt:18,   status:'OFF' });
 
//   // ── Step E: Create energy records ────────────────────────
//   console.log('Creating energy records...');
//   // Closed record — AC ran for 2 hours earlier today
//   const twoHoursAgo = new Date(Date.now() - 2*60*60*1000);
//   const oneHourAgo  = new Date(Date.now() - 1*60*60*1000);
//   await EnergyRecord.create({
//     device: bedroomAC._id, room: bedroom._id,
//     startedAt: twoHoursAgo, endedAt: oneHourAgo,
//     durationSeconds: 3600, energyKwh: 1.5,
//     date: new Date().toISOString().split('T')[0],
//   });
//   // Open record — AC is still ON right now
//   await EnergyRecord.create({
//     device: bedroomAC._id, room: bedroom._id,
//     startedAt: oneHourAgo,  // endedAt stays null
//     date: new Date().toISOString().split('T')[0],
//   });
 
//   // ── Step F: Create events (Poisson log) ─────────────────
//   console.log('Creating events...');
//   await Event.create([
//     { device:bedroomAC._id,    deviceName:'Bedroom AC',    action:'ON',  triggeredBy:'USER', user:admin._id },
//     { device:bedroomLight._id, deviceName:'Bedroom Light', action:'OFF', triggeredBy:'USER', user:resident._id },
//     { device:loungeLight._id,  deviceName:'Lounge Light',  action:'ON',  triggeredBy:'USER', user:admin._id },
//     { device:bedroomAC._id,    deviceName:'Bedroom AC',    action:'IDLE',triggeredBy:'IOT_FEEDBACK' },
//   ]);
 
//   // ── Step G: Create automation rule ──────────────────────
//   console.log('Creating automation rules...');
//   await AutomationRule.create({
//     name: 'Good Night',
//     isActive: true,
//     trigger: { type: 'TIME', time: '23:00' },
//     actions: [
//       { device: bedroomAC._id,    action: 'OFF' },
//       { device: bedroomLight._id, action: 'OFF' },
//     ],
//     createdBy: admin._id,
//   });
 
//   // ── Step H: Create alerts ────────────────────────────────
//   console.log('Creating alerts...');
//   await Alert.create([
//     { type:'HIGH_ENERGY', message:'Bedroom AC running for 6 hours continuously', severity:'warning', device:bedroomAC._id },
//     { type:'DEVICE_FAULT',message:'Lounge Fan returned FAULT status',           severity:'critical',device:loungeFan._id },
//   ]);
 
//   // ── Step I: Create Markov transitions ───────────────────
//   console.log('Creating Markov transitions...');
//   await MarkovTransition.create([
//     { device:bedroomAC._id, fromState:'OFF',  toState:'ON'  },
//     { device:bedroomAC._id, fromState:'ON',   toState:'IDLE'},
//     { device:bedroomAC._id, fromState:'IDLE', toState:'ON'  },
//     { device:bedroomAC._id, fromState:'ON',   toState:'OFF' },
//   ]);
 
//   console.log('\n✓  Database seeded successfully!');
//   console.log('  Users:     2  (1 admin, 1 resident)');
//   console.log('  Rooms:     4');
//   console.log('  Devices:   6');
//   console.log('  Energy:    2 records');
//   console.log('  Events:    4');
//   console.log('  Rules:     1');
//   console.log('  Alerts:    2');
//   console.log('  Markov:    4 transitions');
 
//   process.exit(0);
// };
 
// seedDatabase().catch(err => {
//   console.error('Seed failed:', err.message);
//   process.exit(1);
// });