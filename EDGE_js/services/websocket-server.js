const { WebSocketServer } = require('ws');

class WebSocketService {
  constructor({ port, registry }) {
    this.port = port || process.env.WEBSOCKET_PORT || 8765;
    this.registry = registry;
    this.wss = null;
    this.bound = null;
  }

  async start() {
    this.wss = new WebSocketServer({ port: this.port });
    this.bound = (payload) => this.broadcast(payload);
    this.registry.on('state', this.bound);
    this.wss.on('connection', (ws) => {
      ws.send(JSON.stringify({ type: 'welcome', devices: this.registry.list() }));
    });
    console.log(`📡 WebSocket server listening on ${this.port}`);
  }

  broadcast(payload) {
    const message = JSON.stringify({ type: 'state', ...payload });
    this.wss?.clients?.forEach((client) => {
      if (client.readyState === 1) client.send(message);
    });
  }

  async stop() {
    this.registry.off('state', this.bound);
    await new Promise((resolve) => this.wss?.close(resolve));
  }
}

module.exports = { WebSocketService };
