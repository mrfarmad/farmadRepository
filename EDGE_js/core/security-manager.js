class SecurityManager {
  constructor(config = {}) {
    this.config = config;
  }

  async initialize() {
    if (this.config?.enabled === false) {
      console.log('🔓 Security manager disabled by config');
      return;
    }
    console.log('🔐 Security manager initialized');
  }
}

module.exports = { SecurityManager };
