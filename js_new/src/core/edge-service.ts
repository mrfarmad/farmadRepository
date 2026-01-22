import { EventEmitter } from 'events';
import { configManager } from './config/config-manager.js';
import { DeviceRegistry } from './device-registry.js';
import { DeviceScheduler } from './device-scheduler.js';
import { ModbusStorage } from '../modbus/modbus-storage.js';
import { UniversalModbusReader } from '../modbus/universal-reader.js';
import { CommandExecutor } from '../modbus/command-executor.js';
import { ReaderIntegration } from '../modbus/reader-integration.js';
import { WebSocketServer } from './publishing/websocket-server.js';
import { HealthAPI } from './health-api.js';
import { SystemConfig, DeviceData } from '../types/index.js';
import { logger } from './utils/logger.js';

/**
 * Main EDGE Service
 * Orchestrates all components of the EDGE gateway
 */

export interface EDGEServiceConfig {
  offlineMode?: boolean;
  disableTelegram?: boolean;
  disableWebSocket?: boolean;
  disableMQTT?: boolean;
}

export class EDGEService extends EventEmitter {
  private config: SystemConfig | null = null;
  private registry: DeviceRegistry;
  private scheduler: DeviceScheduler;
  private storage: ModbusStorage | null = null;
  private reader: UniversalModbusReader | null = null;
  private readerIntegration: ReaderIntegration | null = null;
  private commandExecutor: CommandExecutor | null = null;
  private websocketServer: WebSocketServer | null = null;
  private healthAPI: HealthAPI | null = null;
  private isRunning = false;
  private serviceConfig: EDGEServiceConfig;

  constructor(serviceConfig?: EDGEServiceConfig) {
    super();
    this.serviceConfig = serviceConfig || {};
    this.registry = new DeviceRegistry();
    this.scheduler = new DeviceScheduler(this.registry);
  }

  /**
   * Initialize all components
   */
  async initialize(): Promise<void> {
    logger.info('🚀 Initializing EDGE Service...');

    try {
      // Load configuration
      logger.info('📋 Loading configuration...');
      this.config = await configManager.loadSystemConfig();
      const devices = await configManager.loadDevices();

      // Initialize device registry
      logger.info('📱 Initializing device registry...');
      this.registry.initialize(devices);

      // Initialize database
      logger.info('💾 Initializing database...');
      this.storage = new ModbusStorage(
        this.config.database.file,
        this.config.database.commands_db
      );

      // Initialize Modbus reader
      if (!this.serviceConfig.offlineMode && !this.config.system.offline_mode) {
        logger.info('🔌 Initializing Modbus reader...');
        this.reader = new UniversalModbusReader({
          port: this.config.rs485.port,
          baudrate: this.config.rs485.baudrate,
          timeout: this.config.rs485.timeout,
        });

        // Initialize reader integration
        this.readerIntegration = new ReaderIntegration(
          this.reader,
          this.storage,
          this.registry,
          this.scheduler
        );

        // Listen to poll events
        this.readerIntegration.on('devicePolled', (data: DeviceData) => {
          this.handleDeviceData(data);
        });

        this.readerIntegration.on('alarms', (deviceId: number, alarms: string[]) => {
          this.handleAlarms(deviceId, alarms);
        });

        this.readerIntegration.on('warnings', (deviceId: number, warnings: string[]) => {
          this.handleWarnings(deviceId, warnings);
        });

        // Initialize command executor
        logger.info('⚙️ Initializing command executor...');
        this.commandExecutor = new CommandExecutor(
          this.storage,
          this.reader,
          this.registry
        );
      } else {
        logger.warn('📴 Running in OFFLINE mode - Modbus services disabled');
      }

      // Initialize WebSocket server
      if (
        this.config.services.websocket_enabled &&
        !this.serviceConfig.disableWebSocket
      ) {
        logger.info('🌐 Initializing WebSocket server...');
        this.websocketServer = new WebSocketServer({
          port: this.config.services.websocket_port,
        });
      }

      // Initialize Health API
      logger.info('🏥 Initializing Health API...');
      this.healthAPI = new HealthAPI({
        port: 8090, // TODO: Make configurable
      });

      logger.info('✅ EDGE Service initialized successfully');
      this.emit('initialized');
    } catch (error) {
      logger.error({ error }, '❌ Failed to initialize EDGE Service');
      throw error;
    }
  }

  /**
   * Start all services
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('EDGE Service already running');
      return;
    }

    logger.info('🚀 Starting EDGE Service...');

    try {
      // Start Health API
      if (this.healthAPI) {
        await this.healthAPI.start();
      }

      // Start WebSocket server
      if (this.websocketServer) {
        await this.websocketServer.start();
      }

      // Start reader integration (includes scheduler)
      if (this.readerIntegration) {
        await this.readerIntegration.start();
      }

      // Start command executor
      if (this.commandExecutor) {
        this.commandExecutor.start();
      }

      this.isRunning = true;
      logger.info('✅ EDGE Service started successfully');
      this.emit('started');

      // Log service status
      this.logServiceStatus();
    } catch (error) {
      logger.error({ error }, '❌ Failed to start EDGE Service');
      throw error;
    }
  }

  /**
   * Stop all services
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    logger.info('🛑 Stopping EDGE Service...');

    try {
      // Stop command executor
      if (this.commandExecutor) {
        this.commandExecutor.stop();
      }

      // Stop reader integration
      if (this.readerIntegration) {
        await this.readerIntegration.stop();
      }

      // Stop WebSocket server
      if (this.websocketServer) {
        await this.websocketServer.stop();
      }

      // Stop Health API
      if (this.healthAPI) {
        await this.healthAPI.stop();
      }

      // Close database
      if (this.storage) {
        this.storage.close();
      }

      this.isRunning = false;
      logger.info('✅ EDGE Service stopped successfully');
      this.emit('stopped');
    } catch (error) {
      logger.error({ error }, 'Error stopping EDGE Service');
      throw error;
    }
  }

  /**
   * Handle device data from polling
   */
  private handleDeviceData(deviceData: DeviceData): void {
    // Broadcast to WebSocket clients
    if (this.websocketServer) {
      this.websocketServer.broadcastDeviceData(deviceData);
    }

    // TODO: Publish to MQTT if enabled

    this.emit('deviceData', deviceData);
  }

  /**
   * Handle alarms
   */
  private handleAlarms(deviceId: number, alarms: string[]): void {
    logger.warn({ device_id: deviceId, alarms }, '🚨 Device alarms detected');

    // Broadcast to WebSocket clients
    if (this.websocketServer) {
      this.websocketServer.broadcastAlarm(deviceId, alarms);
    }

    // TODO: Send Telegram notification if enabled

    this.emit('alarms', deviceId, alarms);
  }

  /**
   * Handle warnings
   */
  private handleWarnings(deviceId: number, warnings: string[]): void {
    logger.info({ device_id: deviceId, warnings }, '⚠️ Device warnings detected');

    // Broadcast to WebSocket clients
    if (this.websocketServer) {
      this.websocketServer.broadcastWarning(deviceId, warnings);
    }

    this.emit('warnings', deviceId, warnings);
  }

  /**
   * Log service status
   */
  private logServiceStatus(): void {
    const status = this.getStatus();

    logger.info(
      {
        devices: status.devices,
        modbus: status.modbusConnected,
        websocket: status.websocketRunning,
        healthAPI: status.healthAPIRunning,
      },
      '📊 Service Status'
    );
  }

  /**
   * Get service status
   */
  getStatus(): {
    running: boolean;
    offlineMode: boolean;
    devices: {
      total: number;
      enabled: number;
    };
    modbusConnected: boolean;
    schedulerRunning: boolean;
    websocketRunning: boolean;
    healthAPIRunning: boolean;
  } {
    return {
      running: this.isRunning,
      offlineMode: this.serviceConfig.offlineMode || this.config?.system.offline_mode || false,
      devices: {
        total: this.registry.getDeviceCount(),
        enabled: this.registry.getEnabledDeviceCount(),
      },
      modbusConnected: this.reader?.getStatus().connected || false,
      schedulerRunning: this.scheduler.getStats().running,
      websocketRunning: this.websocketServer?.getStats().running || false,
      healthAPIRunning: this.healthAPI !== null,
    };
  }

  /**
   * Force poll device
   */
  forcePollDevice(deviceId: number): void {
    if (this.readerIntegration) {
      this.readerIntegration.forcePollDevice(deviceId);
    }
  }

  /**
   * Enqueue command
   */
  async enqueueCommand(
    deviceId: number,
    registerAddress: number,
    value: number
  ): Promise<number | null> {
    if (!this.commandExecutor) {
      logger.error('Command executor not available');
      return null;
    }

    const device = this.registry.getDevice(deviceId);
    if (!device) {
      logger.error({ device_id: deviceId }, 'Device not found');
      return null;
    }

    return this.commandExecutor.enqueueCommand(
      deviceId,
      device.slave_id,
      registerAddress,
      value,
      device.priority
    );
  }
}

export default EDGEService;
