import mqtt from 'mqtt';
import { config } from '../config/index.js';

class MqttClient {
  constructor() {
    this.enabled = Boolean(config.mqttUrl);
    this.client = null;
    if (this.enabled) {
      this.client = mqtt.connect(config.mqttUrl);
      this.client.on('connect', () => console.log('[mqtt] connected'));
      this.client.on('error', (err) => console.error('[mqtt] error', err.message));
    } else {
      console.info('[mqtt] disabled: set MQTT_URL to enable publishing');
    }
  }

  publishTelemetry(payload) {
    if (!this.enabled || !this.client) return;
    this.client.publish('edge/telemetry', JSON.stringify(payload));
  }
}

export const mqttClient = new MqttClient();