/**
 * MqttPublisher
 *
 * Design Pattern: STRATEGY (publish interface) + SINGLETON
 *
 * Abstracts MQTT communication so the DeviceService never imports
 * an MQTT library directly.  In tests, swap the strategy for a mock.
 *
 * Topic convention:
 *   home/devices/{device_id}/command   ← backend → hardware
 *   home/devices/{device_id}/status    ← hardware → backend  (IoT feedback)
 */

class MqttPublisher {
  constructor() {
    // In production, inject a real mqtt.Client here via MqttPublisher.init(client)
    this._client = null;
  }

  /** Call once at app bootstrap with a connected mqtt.Client instance */
  init(client) {
    this._client = client;
  }

  /**
   * Publishes a device command to the hardware broker.
   * @param {string} deviceId   MongoDB ObjectId string
   * @param {string} action     'ON' | 'OFF' | 'IDLE'
   */
  publishCommand(deviceId, action) {
    const topic   = `home/devices/${deviceId}/command`;
    const payload = JSON.stringify({ action, ts: Date.now() });

    if (!this._client) {
      // Dev / test: just log instead of throwing
      console.log(`[MQTT][MOCK] ${topic} → ${payload}`);
      return;
    }

    this._client.publish(topic, payload, { qos: 1 }, (err) => {
      if (err) console.error(`[MQTT] Publish failed for ${deviceId}:`, err.message);
    });
  }
}

// Singleton
module.exports = new MqttPublisher();