import { DeviceConfig, DeviceType, Priority } from '../types/index.js';
import { getDeviceAdapter } from './device_adapters/factory.js';
import { DeviceAdapter } from './device_adapters/base.js';
import { logger } from './utils/logger.js';

/**
 * Device Registry
 * Manages all configured devices and their adapters
 */
export class DeviceRegistry {
  private devices: Map<number, DeviceConfig> = new Map();
  private adapters: Map<DeviceType, DeviceAdapter> = new Map();

  /**
   * Initialize registry with device configurations
   */
  initialize(deviceConfigs: DeviceConfig[]): void {
    this.devices.clear();

    for (const config of deviceConfigs) {
      this.devices.set(config.device_id, config);
      logger.debug({ device_id: config.device_id, type: config.device_type }, 'Device registered');
    }

    logger.info({ total: this.devices.size, enabled: this.getEnabledDevices().length }, 'Device registry initialized');
  }

  /**
   * Get all devices
   */
  getAllDevices(): DeviceConfig[] {
    return Array.from(this.devices.values());
  }

  /**
   * Get enabled devices only
   */
  getEnabledDevices(): DeviceConfig[] {
    return Array.from(this.devices.values()).filter((d) => d.enabled);
  }

  /**
   * Get device by ID
   */
  getDevice(deviceId: number): DeviceConfig | undefined {
    return this.devices.get(deviceId);
  }

  /**
   * Get devices by type
   */
  getDevicesByType(deviceType: DeviceType): DeviceConfig[] {
    return Array.from(this.devices.values()).filter((d) => d.device_type === deviceType);
  }

  /**
   * Get devices by priority
   */
  getDevicesByPriority(priority: Priority): DeviceConfig[] {
    return Array.from(this.devices.values()).filter((d) => d.priority === priority);
  }

  /**
   * Get devices by location
   */
  getDevicesByLocation(location: string): DeviceConfig[] {
    return Array.from(this.devices.values()).filter((d) => d.location === location);
  }

  /**
   * Get adapter for device
   */
  getAdapter(deviceId: number): DeviceAdapter | undefined {
    const device = this.getDevice(deviceId);
    if (!device) {
      return undefined;
    }

    // Cache adapters by device type
    if (!this.adapters.has(device.device_type)) {
      try {
        const adapter = getDeviceAdapter(device.device_type);
        this.adapters.set(device.device_type, adapter);
      } catch (error) {
        logger.error({ error, deviceType: device.device_type }, 'Failed to get device adapter');
        return undefined;
      }
    }

    return this.adapters.get(device.device_type);
  }

  /**
   * Add or update device
   */
  upsertDevice(config: DeviceConfig): void {
    this.devices.set(config.device_id, config);
    logger.info({ device_id: config.device_id }, 'Device added/updated in registry');
  }

  /**
   * Remove device
   */
  removeDevice(deviceId: number): boolean {
    const removed = this.devices.delete(deviceId);
    if (removed) {
      logger.info({ device_id: deviceId }, 'Device removed from registry');
    }
    return removed;
  }

  /**
   * Enable device
   */
  enableDevice(deviceId: number): boolean {
    const device = this.devices.get(deviceId);
    if (device) {
      device.enabled = true;
      logger.info({ device_id: deviceId }, 'Device enabled');
      return true;
    }
    return false;
  }

  /**
   * Disable device
   */
  disableDevice(deviceId: number): boolean {
    const device = this.devices.get(deviceId);
    if (device) {
      device.enabled = false;
      logger.info({ device_id: deviceId }, 'Device disabled');
      return true;
    }
    return false;
  }

  /**
   * Get device count
   */
  getDeviceCount(): number {
    return this.devices.size;
  }

  /**
   * Get enabled device count
   */
  getEnabledDeviceCount(): number {
    return this.getEnabledDevices().length;
  }

  /**
   * Check if device exists
   */
  hasDevice(deviceId: number): boolean {
    return this.devices.has(deviceId);
  }

  /**
   * Clear all devices
   */
  clear(): void {
    this.devices.clear();
    this.adapters.clear();
    logger.info('Device registry cleared');
  }

  /**
   * Get registry statistics
   */
  getStats(): {
    total: number;
    enabled: number;
    disabled: number;
    byType: Record<string, number>;
    byPriority: Record<string, number>;
  } {
    const devices = this.getAllDevices();
    const byType: Record<string, number> = {};
    const byPriority: Record<string, number> = {};

    for (const device of devices) {
      // Count by type
      byType[device.device_type] = (byType[device.device_type] || 0) + 1;

      // Count by priority
      const priority = device.priority || Priority.NORMAL;
      byPriority[priority] = (byPriority[priority] || 0) + 1;
    }

    return {
      total: devices.length,
      enabled: this.getEnabledDevices().length,
      disabled: devices.length - this.getEnabledDevices().length,
      byType,
      byPriority,
    };
  }
}

export default DeviceRegistry;
