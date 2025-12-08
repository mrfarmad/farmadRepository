class EdgePingService {
  constructor({ endpoint } = {}) {
    this.endpoint = endpoint || 'https://example.com/ping';
    this.timer = null;
  }

  async start() {
    this.timer = setInterval(() => {
      // placeholder for real ping logic
      process.stdout.write('.');
    }, 10000);
    console.log('📶 EDGE ping service started');
  }

  async stop() {
    if (this.timer) clearInterval(this.timer);
  }
}

module.exports = { EdgePingService };
