import { deviceStore } from '../store/deviceStore.js';
import { mqttClient } from './mqttClient.js';

class TelemetryService {
  constructor({ io, interval }) {
    this.io = io;
    this.interval = interval;
    this.timer = null;
  }

  start() {
    if (this.timer) return;
    this.timer = setInterval(() => this.broadcast(), this.interval);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  broadcast() {
    const payload = deviceStore.all().map((device) => ({
      ...device,
      metrics: this.fakeMetrics(device)
    }));

    this.io.emit('telemetry', payload);
    mqttClient.publishTelemetry(payload);
  }

  fakeMetrics(device) {
    const now = Date.now();
    const seed = Math.abs(device.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0));
    return {
      timestamp: new Date(now).toISOString(),
      voltage: Number(((seed % 220) + Math.random() * 5).toFixed(2)),
      current: Number(((seed % 10) + Math.random()).toFixed(2)),
      temperature: Number(((seed % 30) + 15 + Math.random() * 2).toFixed(1)),
      status: Math.random() > 0.1 ? 'ok' : 'degraded'
    };
  }
}

export function createTelemetryService(options) {
  return new TelemetryService(options);
}