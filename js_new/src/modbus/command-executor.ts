import { EventEmitter } from 'events';
import { ModbusStorage } from './modbus-storage.js';
import { UniversalModbusReader } from './universal-reader.js';
import { ModbusCommand, Priority } from '../types/index.js';
import { DeviceRegistry } from '../core/device-registry.js';
import { logger } from '../core/utils/logger.js';

/**
 * Command Executor
 * Processes write commands from queue in priority order
 */

export interface CommandExecutorConfig {
  batchSize?: number;
  executionInterval?: number; // milliseconds
  maxRetries?: number;
}

export class CommandExecutor extends EventEmitter {
  private storage: ModbusStorage;
  private reader: UniversalModbusReader;
  private registry: DeviceRegistry;
  private config: CommandExecutorConfig;
  private isRunning = false;
  private executionTimer: NodeJS.Timeout | null = null;
  private executing = false;

  constructor(
    storage: ModbusStorage,
    reader: UniversalModbusReader,
    registry: DeviceRegistry,
    config?: CommandExecutorConfig
  ) {
    super();
    this.storage = storage;
    this.reader = reader;
    this.registry = registry;
    this.config = {
      batchSize: config?.batchSize || 10,
      executionInterval: config?.executionInterval || 500, // Check every 500ms
      maxRetries: config?.maxRetries || 3,
    };
  }

  /**
   * Start command executor
   */
  start(): void {
    if (this.isRunning) {
      logger.warn('Command executor already running');
      return;
    }

    this.isRunning = true;

    this.executionTimer = setInterval(() => {
      this.processCommands();
    }, this.config.executionInterval);

    logger.info('Command executor started');
    this.emit('started');
  }

  /**
   * Stop command executor
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    if (this.executionTimer) {
      clearInterval(this.executionTimer);
      this.executionTimer = null;
    }

    logger.info('Command executor stopped');
    this.emit('stopped');
  }

  /**
   * Process pending commands from queue
   */
  private async processCommands(): Promise<void> {
    if (this.executing) {
      return; // Already processing
    }

    this.executing = true;

    try {
      const commands = this.storage.getPendingCommands(this.config.batchSize!);

      if (commands.length === 0) {
        return;
      }

      logger.debug({ count: commands.length }, 'Processing pending commands');

      for (const command of commands) {
        await this.executeCommand(command);
      }
    } catch (error) {
      logger.error({ error }, 'Error processing commands');
    } finally {
      this.executing = false;
    }
  }

  /**
   * Execute single command
   */
  private async executeCommand(command: ModbusCommand): Promise<void> {
    if (!command.id) {
      logger.error({ command }, 'Command has no ID, skipping');
      return;
    }

    // Check if device is enabled
    const device = this.registry.getDevice(command.device_id);
    if (!device || !device.enabled) {
      this.storage.updateCommandStatus(
        command.id,
        'failed',
        'Device not found or disabled'
      );
      logger.warn({ device_id: command.device_id }, 'Device not available, command failed');
      return;
    }

    // Update status to executing
    this.storage.updateCommandStatus(command.id, 'executing');

    try {
      logger.info(
        {
          command_id: command.id,
          device_id: command.device_id,
          slave_id: command.slave_id,
          register: command.register_address,
          value: command.value,
        },
        'Executing write command'
      );

      // Execute write via Modbus reader
      const result = await this.reader.writeSingleRegister(
        command.slave_id,
        command.register_address,
        command.value
      );

      if (result.success) {
        // Update command as completed
        this.storage.updateCommandStatus(command.id, 'completed');

        logger.info(
          { command_id: command.id, device_id: command.device_id },
          'Command executed successfully'
        );

        this.emit('commandCompleted', command);
      } else {
        // Command failed
        const errorMsg = result.error || 'Unknown error';
        this.storage.updateCommandStatus(command.id, 'failed', errorMsg);

        logger.error(
          { command_id: command.id, device_id: command.device_id, error: errorMsg },
          'Command execution failed'
        );

        this.emit('commandFailed', command, errorMsg);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';

      this.storage.updateCommandStatus(command.id, 'failed', errorMsg);

      logger.error(
        { error, command_id: command.id, device_id: command.device_id },
        'Exception during command execution'
      );

      this.emit('commandFailed', command, errorMsg);
    }
  }

  /**
   * Enqueue new command
   */
  async enqueueCommand(
    deviceId: number,
    slaveId: number,
    registerAddress: number,
    value: number,
    priority: Priority = Priority.NORMAL
  ): Promise<number> {
    const commandId = this.storage.enqueueCommand({
      device_id: deviceId,
      slave_id: slaveId,
      register_address: registerAddress,
      value,
      priority,
    });

    logger.info(
      { command_id: commandId, device_id: deviceId, register: registerAddress },
      'Command enqueued'
    );

    this.emit('commandEnqueued', commandId);

    return commandId;
  }

  /**
   * Get pending command count
   */
  getPendingCommandCount(): number {
    return this.storage.getPendingCommands(1000).length;
  }

  /**
   * Get executor statistics
   */
  getStats(): {
    running: boolean;
    pendingCommands: number;
  } {
    return {
      running: this.isRunning,
      pendingCommands: this.getPendingCommandCount(),
    };
  }

  /**
   * Force immediate command processing
   */
  async processNow(): Promise<void> {
    await this.processCommands();
  }
}

export default CommandExecutor;
