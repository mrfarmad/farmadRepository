class BaseAdapter {
  constructor(device) {
    this.device = device;
  }

  async readHoldingRegisters() {
    throw new Error('readHoldingRegisters not implemented');
  }
}

module.exports = { BaseAdapter };
