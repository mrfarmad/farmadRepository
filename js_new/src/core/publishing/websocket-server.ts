import { WebSocketServer as WSServer, WebSocket } from 'ws';
import { EventEmitter } from 'events';
import { DeviceData, WebSocketMessage } from '../../types/index.js';
import { logger } from '../utils/logger.js';

/**
 * WebSocket Server for real-time data publishing
 */

export interface WebSocketServerConfig {
  port: number;
  pingInterval?: number; // milliseconds
  maxClients?: number;
}

export class WebSocketServer extends EventEmitter {
  private wss: WSServer | null = null;
  private config: WebSocketServerConfig;
  private clients: Set<WebSocket> = new Set();
  private pingTimer: NodeJS.Timeout | null = null;

  constructor(config: WebSocketServerConfig) {
    super();
    this.config = {
      ...config,
      pingInterval: config.pingInterval || 30000, // 30 seconds
      maxClients: config.maxClients || 100,
    };
  }

  /**
   * Start WebSocket server
   */
  async start(): Promise<void> {
    if (this.wss) {
      logger.warn('WebSocket server already running');
      return;
    }

    this.wss = new WSServer({ port: this.config.port });

    this.wss.on('connection', (ws: WebSocket) => {
      this.handleConnection(ws);
    });

    this.wss.on('error', (error) => {
      logger.error({ error }, 'WebSocket server error');
      this.emit('error', error);
    });

    // Start ping timer
    this.startPingTimer();

    logger.info({ port: this.config.port }, 'WebSocket server started');
    this.emit('started');
  }

  /**
   * Stop WebSocket server
   */
  async stop(): Promise<void> {
    if (!this.wss) {
      return;
    }

    // Stop ping timer
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }

    // Close all client connections
    for (const client of this.clients) {
      client.close(1000, 'Server shutting down');
    }
    this.clients.clear();

    // Close server
    await new Promise<void>((resolve) => {
      this.wss!.close(() => {
        resolve();
      });
    });

    this.wss = null;

    logger.info('WebSocket server stopped');
    this.emit('stopped');
  }

  /**
   * Handle new WebSocket connection
   */
  private handleConnection(ws: WebSocket): void {
    // Check max clients
    if (this.clients.size >= this.config.maxClients!) {
      logger.warn('Max clients reached, rejecting connection');
      ws.close(1008, 'Server full');
      return;
    }

    this.clients.add(ws);

    logger.info({ totalClients: this.clients.size }, 'WebSocket client connected');

    ws.on('message', (data) => {
      this.handleMessage(ws, data);
    });

    ws.on('close', () => {
      this.clients.delete(ws);
      logger.info({ totalClients: this.clients.size }, 'WebSocket client disconnected');
    });

    ws.on('error', (error) => {
      logger.error({ error }, 'WebSocket client error');
      this.clients.delete(ws);
    });

    ws.on('pong', () => {
      // Client is alive
      (ws as any).isAlive = true;
    });

    // Send welcome message
    this.sendToClient(ws, {
      type: 'system_status',
      timestamp: new Date(),
      data: { message: 'Connected to EDGE Gateway' },
    });
  }

  /**
   * Handle message from client
   */
  private handleMessage(ws: WebSocket, data: any): void {
    try {
      const message = JSON.parse(data.toString());
      logger.debug({ message }, 'Received WebSocket message');
      this.emit('message', ws, message);
    } catch (error) {
      logger.error({ error, data }, 'Failed to parse WebSocket message');
    }
  }

  /**
   * Broadcast device data to all clients
   */
  broadcastDeviceData(deviceData: DeviceData): void {
    const message: WebSocketMessage = {
      type: 'device_data',
      timestamp: deviceData.timestamp,
      data: deviceData,
    };

    this.broadcast(message);
  }

  /**
   * Broadcast alarm to all clients
   */
  broadcastAlarm(deviceId: number, alarms: string[]): void {
    const message: WebSocketMessage = {
      type: 'alarm',
      timestamp: new Date(),
      data: { device_id: deviceId, alarms },
    };

    this.broadcast(message);
  }

  /**
   * Broadcast warning to all clients
   */
  broadcastWarning(deviceId: number, warnings: string[]): void {
    const message: WebSocketMessage = {
      type: 'warning',
      timestamp: new Date(),
      data: { device_id: deviceId, warnings },
    };

    this.broadcast(message);
  }

  /**
   * Broadcast system status
   */
  broadcastSystemStatus(status: unknown): void {
    const message: WebSocketMessage = {
      type: 'system_status',
      timestamp: new Date(),
      data: status,
    };

    this.broadcast(message);
  }

  /**
   * Broadcast message to all connected clients
   */
  private broadcast(message: WebSocketMessage): void {
    const data = JSON.stringify(message);

    let sentCount = 0;
    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
        sentCount++;
      }
    }

    logger.debug(
      { type: message.type, clients: sentCount },
      'Broadcasted WebSocket message'
    );
  }

  /**
   * Send message to specific client
   */
  private sendToClient(ws: WebSocket, message: WebSocketMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  /**
   * Start ping timer to keep connections alive
   */
  private startPingTimer(): void {
    this.pingTimer = setInterval(() => {
      for (const client of this.clients) {
        if ((client as any).isAlive === false) {
          // Client didn't respond to ping, terminate
          logger.warn('Client failed ping, terminating connection');
          client.terminate();
          this.clients.delete(client);
        } else {
          // Mark as not alive and send ping
          (client as any).isAlive = false;
          client.ping();
        }
      }
    }, this.config.pingInterval);
  }

  /**
   * Get server statistics
   */
  getStats(): {
    running: boolean;
    port: number;
    connectedClients: number;
    maxClients: number;
  } {
    return {
      running: this.wss !== null,
      port: this.config.port,
      connectedClients: this.clients.size,
      maxClients: this.config.maxClients!,
    };
  }
}

export default WebSocketServer;
