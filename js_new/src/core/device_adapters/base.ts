import { RegisterType } from '../../types/index.js';

/**
 * Value types for register data
 */
export enum ValueType {
  TEMPERATURE = 'temperature',
  PERCENTAGE = 'percentage',
  BOOLEAN = 'boolean',
  INTEGER = 'integer',
  FLOAT = 'float',
  BITFIELD = 'bitfield',
  STATUS = 'status',
  VERSION = 'version',
}

/**
 * Register information
 */
export interface RegisterInfo {
  address: number;
  name: string;
  valueType: ValueType;
  unit?: string;
  scale?: number;
  signed?: boolean;
  description?: string;
  registerType?: RegisterType;
  specialValues?: Record<number, string>; // e.g., { 0xFFFF: 'not_ready', 0x8000: 'error' }
}

/**
 * Parsed device data
 */
export interface ParsedDeviceData {
  device_id: number;
  device_type: string;
  registers: Record<string, number | boolean | string>;
  raw_registers: Record<string, number>;
  status: Record<string, string>; // 'ok', 'error', 'disabled', etc.
  timestamp: Date;
}

/**
 * Base class for device adapters
 * Each device type (KUB-1063, KUB-1112, VFD-INVERTER, etc.) implements this interface
 */
export abstract class DeviceAdapter {
  /**
   * Get device type identifier
   */
  abstract get deviceType(): string;

  /**
   * Get register map for this device
   * Maps register name to register information
   */
  abstract get registerMap(): Record<string, RegisterInfo>;

  /**
   * Maximum number of registers to read in a single Modbus request
   */
  get maxBatchSize(): number {
    return 20;
  }

  /**
   * Parse raw register value
   * @param registerName - Name of the register
   * @param rawValue - Raw 16-bit value from Modbus
   * @returns [parsed value, status string]
   */
  abstract parseRegisterValue(registerName: string, rawValue: number): [unknown, string];

  /**
   * Format device data for display (Telegram bot, UI)
   */
  abstract formatForDisplay(data: ParsedDeviceData): string;

  /**
   * Get critical alarms from device data
   */
  abstract getCriticalAlarms(data: ParsedDeviceData): string[];

  /**
   * Get warnings from device data
   */
  abstract getWarnings(data: ParsedDeviceData): string[];

  /**
   * Get list of register addresses to read
   */
  getRegisterAddresses(): number[] {
    return Object.values(this.registerMap).map((reg) => reg.address);
  }

  /**
   * Find register by address
   */
  getRegisterByAddress(address: number): RegisterInfo | undefined {
    return Object.values(this.registerMap).find((reg) => reg.address === address);
  }

  /**
   * Find register by name
   */
  getRegisterByName(name: string): RegisterInfo | undefined {
    return this.registerMap[name];
  }

  /**
   * Parse all device data
   * @param deviceId - Device ID
   * @param rawRegisters - Map of register address to raw value
   */
  parseDeviceData(deviceId: number, rawRegisters: Record<number, number>): ParsedDeviceData {
    const registers: Record<string, number | boolean | string> = {};
    const rawByName: Record<string, number> = {};
    const status: Record<string, string> = {};

    for (const [registerName, registerInfo] of Object.entries(this.registerMap)) {
      if (registerInfo.address in rawRegisters) {
        const rawValue = rawRegisters[registerInfo.address];
        const [parsedValue, valueStatus] = this.parseRegisterValue(registerName, rawValue);

        registers[registerName] = parsedValue as number | boolean | string;
        rawByName[registerName] = rawValue;
        status[registerName] = valueStatus;
      }
    }

    return {
      device_id: deviceId,
      device_type: this.deviceType,
      registers,
      raw_registers: rawByName,
      status,
      timestamp: new Date(),
    };
  }

  /**
   * Apply scale and sign to raw value
   */
  protected applyScaleAndSign(rawValue: number, registerInfo: RegisterInfo): number {
    let value = rawValue;

    // Apply signed conversion if needed
    if (registerInfo.signed && value & 0x8000) {
      // Convert from unsigned 16-bit to signed
      value = value - 0x10000;
    }

    // Apply scale factor
    const scale = registerInfo.scale || 1.0;
    return value * scale;
  }

  /**
   * Check for special values (error codes, not ready, etc.)
   */
  protected checkSpecialValue(rawValue: number, registerInfo: RegisterInfo): string | null {
    if (registerInfo.specialValues && rawValue in registerInfo.specialValues) {
      return registerInfo.specialValues[rawValue];
    }
    return null;
  }

  /**
   * Group registers by contiguous address ranges for batch reading
   * Returns array of [start_address, count] pairs
   */
  getRegisterBatches(): Array<{ start: number; count: number; type: RegisterType }> {
    const addresses = this.getRegisterAddresses().sort((a, b) => a - b);
    const batches: Array<{ start: number; count: number; type: RegisterType }> = [];

    if (addresses.length === 0) return batches;

    let currentStart = addresses[0];
    let currentCount = 1;
    let currentType = this.getRegisterByAddress(addresses[0])?.registerType || RegisterType.HOLDING;

    for (let i = 1; i < addresses.length; i++) {
      const prevAddr = addresses[i - 1];
      const currAddr = addresses[i];
      const currType = this.getRegisterByAddress(currAddr)?.registerType || RegisterType.HOLDING;

      // Check if contiguous and same type, and within batch size limit
      if (currAddr === prevAddr + 1 && currType === currentType && currentCount < this.maxBatchSize) {
        currentCount++;
      } else {
        // Save current batch
        batches.push({ start: currentStart, count: currentCount, type: currentType });

        // Start new batch
        currentStart = currAddr;
        currentCount = 1;
        currentType = currType;
      }
    }

    // Add final batch
    batches.push({ start: currentStart, count: currentCount, type: currentType });

    return batches;
  }
}

export default DeviceAdapter;
