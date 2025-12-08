const { SerialPort } = require('serialport');

class UniversalReader {
  constructor({ port, baudRate, timeout }) {
    this.options = { path: port, baudRate, autoOpen: false }; 
    this.timeout = timeout || 1;
    this.serial = new SerialPort(this.options);
  }

  async start() {
    await new Promise((resolve, reject) => {
      this.serial.open((err) => (err ? reject(err) : resolve()));
    }).catch(() => {
      console.warn('⚠️ Serial port not available, running in dry-run mode');
    });
  }

  async stop() {
    if (!this.serial?.isOpen) return;
    await new Promise((resolve) => this.serial.close(resolve));
  }
}

module.exports = { UniversalReader };
