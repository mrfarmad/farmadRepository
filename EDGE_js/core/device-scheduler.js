class DeviceScheduler {
  constructor({ registry, executor, intervalMs = 1000 }) {
    this.registry = registry;
    this.executor = executor;
    this.intervalMs = intervalMs;
    this.timer = null;
  }

  start() {
    if (this.timer) return;
    this.timer = setInterval(() => this.tick(), this.intervalMs);
    console.log(`⏱️ Device scheduler started (${this.intervalMs} ms)`);
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  async tick() {
    for (const device of this.registry.list()) {
      try {
        await this.executor.readStatus(device);
      } catch (err) {
        console.error(`Scheduler error for device ${device.id}:`, err.message);
      }
    }
  }
}

module.exports = { DeviceScheduler };
