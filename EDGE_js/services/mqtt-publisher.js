const mqtt = require('mqtt');

class MqttPublisher {
  constructor({ url, username, password, registry }) {
    this.url = url;
    this.username = username;
    this.password = password;
    this.registry = registry;
    this.client = null;
    this.bound = null;
  }

  async start() {
    if (!this.url) {
      console.log('⚠️ MQTT URL not set, skipping MQTT publisher');
      return;
    }
    this.client = mqtt.connect(this.url, { username: this.username, password: this.password });
    this.bound = (payload) => this.publishState(payload);
    this.registry.on('state', this.bound);
    this.client.on('connect', () => console.log('📡 MQTT connected'));
    this.client.on('error', (err) => console.error('MQTT error', err));
  }

  publishState({ id, state }) {
    const topic = `edge/devices/${id}/state`;
    this.client?.publish(topic, JSON.stringify(state || {}), { qos: 0 });
  }

  async stop() {
    this.registry.off('state', this.bound);
    await new Promise((resolve) => this.client?.end(true, {}, resolve));
  }
}

module.exports = { MqttPublisher };
