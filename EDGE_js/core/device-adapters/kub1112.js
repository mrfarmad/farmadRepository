const { BaseAdapter } = require('./base');

class Kub1112Adapter extends BaseAdapter {
  constructor(device) {
    super(device);
    this.registers = {
      0x1000: 3,
      0x1001: 0,
    };
  }

  async readHoldingRegisters() {
    return { ...this.registers };
  }
}

module.exports = { Kub1112Adapter };
