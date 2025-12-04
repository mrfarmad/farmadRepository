class PingService {
    constructor({ io, interval, url }) {
      this.io = io;
      this.interval = interval;
      this.url = url;
      this.timer = null;
    }
  
    start() {
      if (this.timer) return;
      this.timer = setInterval(() => this.send(), this.interval);
    }
  
    stop() {
      if (!this.timer) return;
      clearInterval(this.timer);
      this.timer = null;
    }
  
    async send() {
      if (!this.url) {
        this.io.emit('ping', { status: 'skipped', timestamp: new Date().toISOString() });
        return;
      }
  
      try {
        await fetch(this.url, { method: 'POST', body: JSON.stringify({ ts: Date.now() }) });
        this.io.emit('ping', { status: 'ok', timestamp: new Date().toISOString() });
      } catch (error) {
        this.io.emit('ping', { status: 'failed', error: error.message, timestamp: new Date().toISOString() });
      }
    }
  }
  
  export function createPingService(options) {
    return new PingService(options);
  }