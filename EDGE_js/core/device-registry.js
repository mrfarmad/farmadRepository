const EventEmitter = require('events');

class DeviceRegistry extends EventEmitter {
  constructor(configDevices = {}) {
    super();
    this.devices = new Map();
    this.loadFromConfig(configDevices);
  }

  loadFromConfig(devices) {
    if (!devices || !Array.isArray(devices.items || devices)) return;
    const items = devices.items || devices;
    items.forEach((device) => {
      this.devices.set(device.id, { ...device, state: {} });
    });
  }

  getDevice(id) {
    return this.devices.get(id);
  }

  list() {
    return Array.from(this.devices.values());
  }

  updateState(id, state) {
    const device = this.devices.get(id);
    if (!device) return;
    device.state = { ...device.state, ...state };
    this.emit('state', { id, state: device.state });
  }
}

module.exports = { DeviceRegistry };
