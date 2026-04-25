const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');

class SerialController {
  constructor() {
    this._port      = null;
    this._parser    = null;
    // LED number (1/2/3) → MongoDB deviceId string
    // Populated by DeviceService via registerLedMap()
    this._ledToDeviceId = {};
  }

  /**
   * Call this once after DeviceService is ready.
   * Mirrors the LED_MAP in DeviceService so feedback can be routed back.
   *
   * Example:
   *   serialController.registerLedMap({
   *     1: '69e487ece973b61c10472714',
   *     2: '69e48800e973b61c10472717',
   *     3: '69e4889034b0bd6931d3cf4b',
   *   });
   */
  registerLedMap(map) {
    this._ledToDeviceId = map;
    console.log('[Serial] LED→DeviceId map registered:', map);
  }

  init(portPath) {
    this._port   = new SerialPort({ path: portPath, baudRate: 9600 });
    this._parser = this._port.pipe(new ReadlineParser({ delimiter: '\n' }));

    this._port.on('open',  () => console.log(`[Serial] Connected on ${portPath}`));
    this._port.on('error', (err) => console.error('[Serial] Error:', err.message));

    // ── Arduino → Backend feedback ──────────────────────────────────────────
    // Arduino sends:  {"led":1,"status":"ON"}
    // We parse it and call DeviceService.handleIotFeedback() so that:
    //   1. MongoDB device.status is updated
    //   2. DomainEvents.DEVICE_STATE_CHANGED fires
    //   3. Your Socket.io listener pushes the update to the dashboard
    this._parser.on('data', (line) => {
      const raw = line.trim();
      console.log('[Serial] Arduino says:', raw);

      try {
        const msg = JSON.parse(raw); // { led: 1, status: 'ON' }

        if (msg.led && msg.status) {
          const deviceId = this._ledToDeviceId[msg.led];

          if (!deviceId) {
            console.warn(`[Serial] No deviceId mapped for LED ${msg.led} — skipping feedback`);
            return;
          }

          // Lazy-require to avoid circular dependency at module load time
          const DeviceService = require('../services/deviceService');

          DeviceService.handleIotFeedback(
            deviceId,
            msg.status,   // 'ON' | 'OFF'
            undefined,    // power  — Arduino doesn't send this; extend later if needed
            undefined     // energy_kwh
          ).catch((err) => {
            console.error('[Serial] handleIotFeedback failed:', err.message);
          });
        }
      } catch (_) {
        // Not JSON (e.g. debug print from Arduino) — ignore silently
      }
    });
  }

  // ledNumber: 1, 2, or 3   action: 'ON' or 'OFF'
  sendCommand(ledNumber, action) {
    const cmd = `LED:${ledNumber}:${action}\n`;

    if (!this._port || !this._port.isOpen) {
      console.log(`[Serial][MOCK] Would send: ${cmd.trim()}`);
      return;
    }

    this._port.write(cmd, (err) => {
      if (err) console.error('[Serial] Write failed:', err.message);
    });
  }
}

module.exports = new SerialController();