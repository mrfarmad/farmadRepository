class DeviceStore {
    constructor() {
      this.devices = new Map();
    }
  
    upsert(device) {
      this.devices.set(device.id, { ...device, updatedAt: new Date().toISOString() });
      return this.devices.get(device.id);
    }
  
    all() {
      return Array.from(this.devices.values());
    }
  
    get(id) {
      return this.devices.get(id);
    }
  }
  
  export const deviceStore = new DeviceStore();