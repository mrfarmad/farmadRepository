const { adapterFor } = require('../core/device-adapters/catalog');

class CommandExecutor {
  constructor({ registry, queue, reader, storage }) {
    this.registry = registry;
    this.queue = queue;
    this.reader = reader;
    this.storage = storage;
  }

  async readStatus(device) {
    const adapter = adapterFor(device);
    if (!adapter) return;
    const registers = await adapter.readHoldingRegisters();
    this.registry.updateState(device.id, registers);
    this.storage.persistSnapshot(device.id, registers);
  }
}

module.exports = { CommandExecutor };
