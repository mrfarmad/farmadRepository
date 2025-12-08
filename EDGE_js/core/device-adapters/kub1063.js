const { BaseAdapter } = require('./base');

class Kub1063Adapter extends BaseAdapter {
  constructor(device) {
    super(device);
    this.registers = {
      0x0083: 1010,
      0x0084: 550,
      0x0085: 3000,
    };
  }

  async readHoldingRegisters() {
    return { ...this.registers };
  }
}

module.exports = { Kub1063Adapter };
