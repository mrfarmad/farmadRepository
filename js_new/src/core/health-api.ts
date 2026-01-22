import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import { SystemMetrics, HealthCheckResult } from '../types/index.js';
import { logger } from './utils/logger.js';
import si from 'systeminformation';

/**
 * Health API Server
 * Provides HTTP endpoints for system health monitoring
 */

export interface HealthAPIConfig {
  port: number;
  host?: string;
}

export class HealthAPI {
  private server: FastifyInstance;
  private config: HealthAPIConfig;
  private startTime: number = Date.now();

  constructor(config: HealthAPIConfig) {
    this.config = {
      ...config,
      host: config.host || '0.0.0.0',
    };

    this.server = Fastify({
      logger: false, // Use our own logger
    });

    this.setupRoutes();
  }

  /**
   * Setup API routes
   */
  private setupRoutes(): void {
    // Enable CORS
    this.server.register(cors, {
      origin: true,
    });

    // Root endpoint
    this.server.get('/', async () => {
      return {
        service: 'EDGE Industrial IoT Gateway - Health API',
        version: '1.0.0',
        endpoints: {
          '/health': 'Overall system health',
          '/health/:component': 'Component-specific health',
          '/metrics': 'System metrics',
          '/stats': 'Service statistics',
        },
      };
    });

    // Overall health
    this.server.get('/health', async () => {
      return this.getOverallHealth();
    });

    // Component health
    this.server.get<{ Params: { component: string } }>(
      '/health/:component',
      async (request, reply) => {
        const { component } = request.params;
        const health = await this.getComponentHealth(component);

        if (!health) {
          reply.code(404);
          return { error: 'Component not found', component };
        }

        return health;
      }
    );

    // System metrics
    this.server.get('/metrics', async () => {
      return this.getSystemMetrics();
    });

    // Service statistics
    this.server.get('/stats', async () => {
      return this.getServiceStats();
    });
  }

  /**
   * Start Health API server
   */
  async start(): Promise<void> {
    try {
      await this.server.listen({
        port: this.config.port,
        host: this.config.host,
      });

      logger.info(
        { port: this.config.port, host: this.config.host },
        'Health API started'
      );
    } catch (error) {
      logger.error({ error }, 'Failed to start Health API');
      throw error;
    }
  }

  /**
   * Stop Health API server
   */
  async stop(): Promise<void> {
    try {
      await this.server.close();
      logger.info('Health API stopped');
    } catch (error) {
      logger.error({ error }, 'Error stopping Health API');
    }
  }

  /**
   * Get overall system health
   */
  private async getOverallHealth(): Promise<{
    status: string;
    uptime: number;
    timestamp: string;
  }> {
    const uptime = (Date.now() - this.startTime) / 1000;

    return {
      status: 'healthy',
      uptime,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get component health
   */
  private async getComponentHealth(
    component: string
  ): Promise<HealthCheckResult | null> {
    // TODO: Implement actual component health checks
    const validComponents = ['modbus', 'database', 'websocket', 'telegram', 'scheduler'];

    if (!validComponents.includes(component)) {
      return null;
    }

    return {
      component,
      status: 'healthy',
      message: `${component} is operating normally`,
      last_check: new Date(),
    };
  }

  /**
   * Get system metrics
   */
  private async getSystemMetrics(): Promise<SystemMetrics> {
    try {
      const [cpu, mem, fsSize] = await Promise.all([
        si.currentLoad(),
        si.mem(),
        si.fsSize(),
      ]);

      const uptime = (Date.now() - this.startTime) / 1000;

      return {
        cpu_usage: cpu.currentLoad,
        memory_usage: (mem.used / mem.total) * 100,
        disk_usage: fsSize.length > 0 ? (fsSize[0].used / fsSize[0].size) * 100 : 0,
        uptime,
        active_devices: 0, // TODO: Get from device registry
        failed_polls: 0, // TODO: Get from scheduler
        successful_polls: 0, // TODO: Get from scheduler
        pending_commands: 0, // TODO: Get from command executor
      };
    } catch (error) {
      logger.error({ error }, 'Failed to get system metrics');
      throw error;
    }
  }

  /**
   * Get service statistics
   */
  private async getServiceStats(): Promise<{
    uptime: number;
    startTime: string;
    memoryUsage: NodeJS.MemoryUsage;
  }> {
    const uptime = (Date.now() - this.startTime) / 1000;

    return {
      uptime,
      startTime: new Date(this.startTime).toISOString(),
      memoryUsage: process.memoryUsage(),
    };
  }

  /**
   * Register external health provider
   * Allows other components to provide health data
   */
  registerHealthProvider(
    component: string,
    provider: () => Promise<HealthCheckResult>
  ): void {
    this.server.get(`/health/${component}`, async () => {
      return provider();
    });
  }
}

export default HealthAPI;
