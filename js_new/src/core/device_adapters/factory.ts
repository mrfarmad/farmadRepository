import { DeviceAdapter } from './base.js';
import { KUB1063Adapter } from './kub1063-adapter.js';
import { DeviceType } from '../../types/index.js';
import { logger } from '../utils/logger.js';

/**
 * Device Adapter Factory
 * Creates appropriate adapter instance based on device type
 */
export class DeviceAdapterFactory {
  private static adapters: Map<DeviceType, DeviceAdapter> = new Map();

  /**
   * Get adapter for device type
   * Uses singleton pattern - one adapter instance per type
   */
  static getAdapter(deviceType: DeviceType): DeviceAdapter {
    // Check cache first
    if (this.adapters.has(deviceType)) {
      return this.adapters.get(deviceType)!;
    }

    // Create new adapter instance
    let adapter: DeviceAdapter;

    switch (deviceType) {
      case DeviceType.KUB_1063:
        adapter = new KUB1063Adapter();
        break;

      case DeviceType.KUB_1112:
        // TODO: Implement KUB1112Adapter
        throw new Error(`Device adapter for ${deviceType} not yet implemented`);

      case DeviceType.VFD_INVERTER:
        // TODO: Implement VFDInverterAdapter
        throw new Error(`Device adapter for ${deviceType} not yet implemented`);

      case DeviceType.ESQ_230:
        // TODO: Implement ESQ230Adapter
        throw new Error(`Device adapter for ${deviceType} not yet implemented`);

      case DeviceType.VARIABLE_SYSTEM:
        // TODO: Implement VariableSystemAdapter
        throw new Error(`Device adapter for ${deviceType} not yet implemented`);

      default:
        throw new Error(`Unknown device type: ${deviceType}`);
    }

    // Cache adapter
    this.adapters.set(deviceType, adapter);
    logger.debug({ deviceType }, 'Device adapter created and cached');

    return adapter;
  }

  /**
   * Check if adapter exists for device type
   */
  static hasAdapter(deviceType: DeviceType): boolean {
    try {
      this.getAdapter(deviceType);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Clear adapter cache
   */
  static clearCache(): void {
    this.adapters.clear();
    logger.debug('Device adapter cache cleared');
  }

  /**
   * Get all supported device types
   */
  static getSupportedDeviceTypes(): DeviceType[] {
    return [
      DeviceType.KUB_1063,
      // Add more as they're implemented
      // DeviceType.KUB_1112,
      // DeviceType.VFD_INVERTER,
      // DeviceType.ESQ_230,
    ];
  }
}

/**
 * Helper function to get adapter
 */
export function getDeviceAdapter(deviceType: DeviceType): DeviceAdapter {
  return DeviceAdapterFactory.getAdapter(deviceType);
}

export default DeviceAdapterFactory;
