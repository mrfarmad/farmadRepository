import { EventEmitter } from 'events';
import { UniversalModbusReader, UniversalReaderConfig } from './universal-reader.js';
import { ModbusStorage } from './modbus-storage.js';
import { DeviceRegistry } from '../core/device-registry.js';
import { DeviceScheduler } from '../core/device-scheduler.js';
import { DeviceConfig, DeviceData } from '../types/index.js';
import { logger } from '../core/utils/logger.js';

/**
 * Reader Integration
 * Connects UniversalModbusReader with DeviceScheduler and Storage
 */

export class ReaderIntegration extends EventEmitter {
  private reader: UniversalModbusReader;
  private storage: ModbusStorage;
  private registry: DeviceRegistry;
  private scheduler: DeviceScheduler;
  private isRunning = false;

  constructor(
    reader: UniversalModbusReader,
    storage: ModbusStorage,
    registry: DeviceRegistry,
    scheduler: DeviceScheduler
  ) {
    super();
    this.reader = reader;
    this.storage = storage;
    this.registry = registry;
    this.scheduler = scheduler;

    // Listen to scheduler poll events
    this.scheduler.on('poll', (device: DeviceConfig) => {
      this.pollDevice(device);
    });
  }

  /**
   * Start integration
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Reader integration already running');
      return;
    }

    // Connect to serial port
    const connected = await this.reader.connect();
    if (!connected) {
      throw new Error('Failed to connect to Modbus reader');
    }

    // Start scheduler
    this.scheduler.start();

    this.isRunning = true;
    logger.info('Reader integration started');
    this.emit('started');
  }

  /**
   * Stop integration
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    // Stop scheduler
    this.scheduler.stop();

    // Disconnect reader
    await this.reader.disconnect();

    this.isRunning = false;
    logger.info('Reader integration stopped');
    this.emit('stopped');
  }

  /**
   * Poll device - read all registers and store data
   */
  private async pollDevice(device: DeviceConfig): Promise<void> {
    logger.debug({ device_id: device.device_id, name: device.name }, 'Polling device');

    try {
      // Get device adapter
      const adapter = this.registry.getAdapter(device.device_id);
      if (!adapter) {
        throw new Error(`No adapter found for device type: ${device.device_type}`);
      }

      // Get register batches to read
      const batches = adapter.getRegisterBatches();
      const rawRegisters: Record<number, number> = {};

      // Read all register batches
      for (const batch of batches) {
        const result = await this.reader.readRegisters(
          device.slave_id,
          batch.start,
          batch.count,
          batch.type
        );

        if (!result.success) {
          throw new Error(result.error || 'Read failed');
        }

        // Map register values to addresses
        if (result.data) {
          for (let i = 0; i < result.data.length; i++) {
            rawRegisters[batch.start + i] = result.data[i];
          }
        }
      }

      // Parse device data using adapter
      const parsedData = adapter.parseDeviceData(device.device_id, rawRegisters);

      // Get alarms and warnings
      const alarms = adapter.getCriticalAlarms(parsedData);
      const warnings = adapter.getWarnings(parsedData);

      // Store in database
      const deviceData: DeviceData = {
        device_id: device.device_id,
        timestamp: new Date(),
        data: parsedData.registers,
        alarms,
        warnings,
        status: 'online',
      };

      this.storage.updateData(deviceData);

      // Record success
      this.scheduler.recordSuccess(device.device_id);

      logger.debug(
        {
          device_id: device.device_id,
          registers: Object.keys(parsedData.registers).length,
          alarms: alarms.length,
          warnings: warnings.length,
        },
        'Device polled successfully'
      );

      this.emit('devicePolled', deviceData);

      // Emit alarms if any
      if (alarms.length > 0) {
        this.emit('alarms', device.device_id, alarms);
      }

      // Emit warnings if any
      if (warnings.length > 0) {
        this.emit('warnings', device.device_id, warnings);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';

      logger.error(
        { error, device_id: device.device_id, name: device.name },
        'Device poll failed'
      );

      // Record failure (will apply backoff)
      this.scheduler.recordFailure(device.device_id);

      // Store error status
      const deviceData: DeviceData = {
        device_id: device.device_id,
        timestamp: new Date(),
        data: {},
        status: 'error',
      };

      this.storage.updateData(deviceData);

      this.emit('pollError', device.device_id, errorMsg);
    }
  }

  /**
   * Force immediate poll for device
   */
  forcePollDevice(deviceId: number): void {
    this.scheduler.forcePoll(deviceId);
  }

  /**
   * Get integration status
   */
  getStatus(): {
    running: boolean;
    readerConnected: boolean;
    schedulerRunning: boolean;
  } {
    return {
      running: this.isRunning,
      readerConnected: this.reader.getStatus().connected,
      schedulerRunning: this.scheduler.getStats().running,
    };
  }
}

/**
 * Factory function to create ReaderIntegration
 */
export function createReaderIntegration(
  config: UniversalReaderConfig,
  storage: ModbusStorage,
  registry: DeviceRegistry,
  scheduler: DeviceScheduler
): ReaderIntegration {
  const reader = new UniversalModbusReader(config);
  return new ReaderIntegration(reader, storage, registry, scheduler);
}

export default ReaderIntegration;
