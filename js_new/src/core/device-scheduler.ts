import { EventEmitter } from 'events';
import { DeviceConfig, Priority, DeviceType } from '../types/index.js';
import { DeviceRegistry } from './device-registry.js';
import { logger } from './utils/logger.js';

/**
 * Priority-based device polling scheduler
 * Manages when each device should be polled based on priority and poll interval
 */

interface ScheduledDevice {
  config: DeviceConfig;
  nextPollTime: number;
  lastPollTime: number;
  pollInterval: number;
  consecutiveFailures: number;
}

export class DeviceScheduler extends EventEmitter {
  private registry: DeviceRegistry;
  private scheduledDevices: Map<number, ScheduledDevice> = new Map();
  private isRunning = false;
  private schedulerInterval: NodeJS.Timeout | null = null;
  private defaultIntervals: Map<DeviceType, number>;
  private baseCheckInterval = 1000; // Check every second

  // Priority weights for sorting
  private static readonly PRIORITY_WEIGHTS: Record<Priority, number> = {
    [Priority.CRITICAL]: 1,
    [Priority.HIGH]: 2,
    [Priority.NORMAL]: 3,
    [Priority.LOW]: 4,
  };

  constructor(
    registry: DeviceRegistry,
    defaultIntervals?: Map<DeviceType, number>
  ) {
    super();
    this.registry = registry;
    this.defaultIntervals = defaultIntervals || new Map([
      [DeviceType.KUB_1063, 20],
      [DeviceType.KUB_1112, 20],
      [DeviceType.VFD_INVERTER, 20],
      [DeviceType.ESQ_230, 20],
      [DeviceType.VARIABLE_SYSTEM, 30],
    ]);
  }

  /**
   * Initialize scheduler with devices from registry
   */
  initialize(): void {
    this.scheduledDevices.clear();
    const devices = this.registry.getEnabledDevices();

    for (const config of devices) {
      const pollInterval = this.getPollInterval(config);
      const now = Date.now();

      this.scheduledDevices.set(config.device_id, {
        config,
        nextPollTime: now, // Poll immediately on first run
        lastPollTime: 0,
        pollInterval: pollInterval * 1000, // Convert to milliseconds
        consecutiveFailures: 0,
      });
    }

    logger.info(
      { deviceCount: this.scheduledDevices.size },
      'Device scheduler initialized'
    );
  }

  /**
   * Get poll interval for device (from config or default)
   */
  private getPollInterval(config: DeviceConfig): number {
    if (config.poll_interval && config.poll_interval > 0) {
      return config.poll_interval;
    }
    return this.defaultIntervals.get(config.device_type) || 30;
  }

  /**
   * Start the scheduler
   */
  start(): void {
    if (this.isRunning) {
      logger.warn('Scheduler already running');
      return;
    }

    this.initialize();
    this.isRunning = true;

    // Run scheduler loop
    this.schedulerInterval = setInterval(() => {
      this.tick();
    }, this.baseCheckInterval);

    logger.info('Device scheduler started');
    this.emit('started');
  }

  /**
   * Stop the scheduler
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    if (this.schedulerInterval) {
      clearInterval(this.schedulerInterval);
      this.schedulerInterval = null;
    }

    logger.info('Device scheduler stopped');
    this.emit('stopped');
  }

  /**
   * Scheduler tick - check for devices that need polling
   */
  private tick(): void {
    const now = Date.now();
    const devicesToPoll: DeviceConfig[] = [];

    // Find devices that need polling
    for (const scheduled of this.scheduledDevices.values()) {
      if (now >= scheduled.nextPollTime) {
        devicesToPoll.push(scheduled.config);
      }
    }

    if (devicesToPoll.length === 0) {
      return;
    }

    // Sort by priority (CRITICAL first, then HIGH, NORMAL, LOW)
    devicesToPoll.sort((a, b) => {
      const priorityA = a.priority || Priority.NORMAL;
      const priorityB = b.priority || Priority.NORMAL;

      const weightA = DeviceScheduler.PRIORITY_WEIGHTS[priorityA];
      const weightB = DeviceScheduler.PRIORITY_WEIGHTS[priorityB];

      if (weightA !== weightB) {
        return weightA - weightB;
      }

      // If same priority, sort by device_id
      return a.device_id - b.device_id;
    });

    // Emit poll events for each device
    for (const device of devicesToPoll) {
      this.emit('poll', device);
      this.updateNextPollTime(device.device_id);
    }
  }

  /**
   * Update next poll time for device
   */
  private updateNextPollTime(deviceId: number): void {
    const scheduled = this.scheduledDevices.get(deviceId);
    if (!scheduled) {
      return;
    }

    const now = Date.now();
    scheduled.lastPollTime = now;
    scheduled.nextPollTime = now + scheduled.pollInterval;

    logger.debug(
      {
        device_id: deviceId,
        nextPoll: new Date(scheduled.nextPollTime).toISOString(),
      },
      'Next poll time updated'
    );
  }

  /**
   * Record poll success
   */
  recordSuccess(deviceId: number): void {
    const scheduled = this.scheduledDevices.get(deviceId);
    if (scheduled) {
      scheduled.consecutiveFailures = 0;
    }
  }

  /**
   * Record poll failure and apply backoff
   */
  recordFailure(deviceId: number): void {
    const scheduled = this.scheduledDevices.get(deviceId);
    if (!scheduled) {
      return;
    }

    scheduled.consecutiveFailures++;

    // Apply exponential backoff (max 5 failures)
    const backoffFactor = Math.min(scheduled.consecutiveFailures, 5);
    const backoffInterval = scheduled.pollInterval * Math.pow(1.5, backoffFactor);

    scheduled.nextPollTime = Date.now() + backoffInterval;

    logger.warn(
      {
        device_id: deviceId,
        failures: scheduled.consecutiveFailures,
        backoffSeconds: backoffInterval / 1000,
      },
      'Poll failure recorded, applying backoff'
    );
  }

  /**
   * Force immediate poll for device
   */
  forcePoll(deviceId: number): void {
    const scheduled = this.scheduledDevices.get(deviceId);
    if (scheduled) {
      scheduled.nextPollTime = Date.now();
      logger.info({ device_id: deviceId }, 'Forced immediate poll');
    }
  }

  /**
   * Update device poll interval
   */
  updatePollInterval(deviceId: number, intervalSeconds: number): void {
    const scheduled = this.scheduledDevices.get(deviceId);
    if (scheduled) {
      scheduled.pollInterval = intervalSeconds * 1000;
      logger.info(
        { device_id: deviceId, interval: intervalSeconds },
        'Poll interval updated'
      );
    }
  }

  /**
   * Get next device to poll
   */
  getNextDevice(): DeviceConfig | null {
    const now = Date.now();
    let nextDevice: ScheduledDevice | null = null;

    for (const scheduled of this.scheduledDevices.values()) {
      if (now >= scheduled.nextPollTime) {
        if (
          !nextDevice ||
          this.comparePriority(scheduled.config, nextDevice.config) < 0
        ) {
          nextDevice = scheduled;
        }
      }
    }

    return nextDevice?.config || null;
  }

  /**
   * Compare device priorities (-1 if a has higher priority)
   */
  private comparePriority(a: DeviceConfig, b: DeviceConfig): number {
    const priorityA = a.priority || Priority.NORMAL;
    const priorityB = b.priority || Priority.NORMAL;

    const weightA = DeviceScheduler.PRIORITY_WEIGHTS[priorityA];
    const weightB = DeviceScheduler.PRIORITY_WEIGHTS[priorityB];

    return weightA - weightB;
  }

  /**
   * Get scheduler statistics
   */
  getStats(): {
    running: boolean;
    totalDevices: number;
    devicesPendingPoll: number;
    devicesWithFailures: number;
    nextPollTime: Date | null;
  } {
    const now = Date.now();
    let devicesPendingPoll = 0;
    let devicesWithFailures = 0;
    let earliestPollTime = Infinity;

    for (const scheduled of this.scheduledDevices.values()) {
      if (now >= scheduled.nextPollTime) {
        devicesPendingPoll++;
      }

      if (scheduled.consecutiveFailures > 0) {
        devicesWithFailures++;
      }

      if (scheduled.nextPollTime < earliestPollTime) {
        earliestPollTime = scheduled.nextPollTime;
      }
    }

    return {
      running: this.isRunning,
      totalDevices: this.scheduledDevices.size,
      devicesPendingPoll,
      devicesWithFailures,
      nextPollTime: earliestPollTime !== Infinity ? new Date(earliestPollTime) : null,
    };
  }

  /**
   * Get device schedule info
   */
  getDeviceSchedule(deviceId: number): ScheduledDevice | undefined {
    return this.scheduledDevices.get(deviceId);
  }

  /**
   * Reload devices from registry
   */
  reload(): void {
    logger.info('Reloading device scheduler');
    const wasRunning = this.isRunning;

    if (wasRunning) {
      this.stop();
    }

    this.initialize();

    if (wasRunning) {
      this.start();
    }
  }
}

export default DeviceScheduler;
