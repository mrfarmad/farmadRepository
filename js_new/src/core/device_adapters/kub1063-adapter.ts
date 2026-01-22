import { DeviceAdapter, RegisterInfo, ParsedDeviceData, ValueType } from './base.js';
import { RegisterType } from '../../types/index.js';

/**
 * КУБ-1063 Device Adapter
 * Poultry/broiler farm climate control system
 * Handles: ventilation, temperature, humidity, CO2, NH3, pressure, alarms
 */
export class KUB1063Adapter extends DeviceAdapter {
  get deviceType(): string {
    return 'KUB-1063';
  }

  get registerMap(): Record<string, RegisterInfo> {
    return {
      // Temperature sensors (0x0000-0x0009)
      temp_inside: {
        address: 0x0000,
        name: 'temp_inside',
        valueType: ValueType.TEMPERATURE,
        unit: '°C',
        scale: 0.1,
        signed: true,
        description: 'Inside temperature',
        registerType: RegisterType.HOLDING,
      },
      temp_outside: {
        address: 0x0001,
        name: 'temp_outside',
        valueType: ValueType.TEMPERATURE,
        unit: '°C',
        scale: 0.1,
        signed: true,
        description: 'Outside temperature',
      },
      temp_setpoint: {
        address: 0x0002,
        name: 'temp_setpoint',
        valueType: ValueType.TEMPERATURE,
        unit: '°C',
        scale: 0.1,
        signed: true,
        description: 'Temperature setpoint',
      },

      // Humidity (0x0010-0x0012)
      humidity_inside: {
        address: 0x0010,
        name: 'humidity_inside',
        valueType: ValueType.PERCENTAGE,
        unit: '%',
        scale: 0.1,
        description: 'Inside humidity',
      },
      humidity_setpoint: {
        address: 0x0011,
        name: 'humidity_setpoint',
        valueType: ValueType.PERCENTAGE,
        unit: '%',
        scale: 0.1,
        description: 'Humidity setpoint',
      },

      // Gas sensors (0x0020-0x0029)
      co2_level: {
        address: 0x0020,
        name: 'co2_level',
        valueType: ValueType.INTEGER,
        unit: 'ppm',
        description: 'CO2 concentration',
      },
      nh3_level: {
        address: 0x0021,
        name: 'nh3_level',
        valueType: ValueType.INTEGER,
        unit: 'ppm',
        description: 'NH3 (ammonia) concentration',
      },

      // Pressure (0x0030-0x0032)
      static_pressure: {
        address: 0x0030,
        name: 'static_pressure',
        valueType: ValueType.INTEGER,
        unit: 'Pa',
        scale: 0.1,
        signed: true,
        description: 'Static pressure',
      },
      pressure_setpoint: {
        address: 0x0031,
        name: 'pressure_setpoint',
        valueType: ValueType.INTEGER,
        unit: 'Pa',
        scale: 0.1,
        signed: true,
        description: 'Pressure setpoint',
      },

      // Ventilation control (0x0040-0x004F)
      ventilation_level: {
        address: 0x0040,
        name: 'ventilation_level',
        valueType: ValueType.PERCENTAGE,
        unit: '%',
        description: 'Current ventilation level',
      },
      damper_position: {
        address: 0x0041,
        name: 'damper_position',
        valueType: ValueType.PERCENTAGE,
        unit: '%',
        description: 'Air damper position',
      },

      // Digital outputs (0x0100-0x0101)
      digital_outputs_1: {
        address: 0x0100,
        name: 'digital_outputs_1',
        valueType: ValueType.BITFIELD,
        description: 'Digital outputs 1-16',
      },
      digital_outputs_2: {
        address: 0x0101,
        name: 'digital_outputs_2',
        valueType: ValueType.BITFIELD,
        description: 'Digital outputs 17-32',
      },

      // System status (0x0200-0x0202)
      system_status: {
        address: 0x0200,
        name: 'system_status',
        valueType: ValueType.BITFIELD,
        description: 'System status flags',
      },
      alarm_status: {
        address: 0x0201,
        name: 'alarm_status',
        valueType: ValueType.BITFIELD,
        description: 'Alarm status flags',
      },
      warning_status: {
        address: 0x0202,
        name: 'warning_status',
        valueType: ValueType.BITFIELD,
        description: 'Warning status flags',
      },
    };
  }

  parseRegisterValue(registerName: string, rawValue: number): [unknown, string] {
    const registerInfo = this.registerMap[registerName];
    if (!registerInfo) {
      return [rawValue, 'unknown'];
    }

    // Check for special values
    const specialValue = this.checkSpecialValue(rawValue, registerInfo);
    if (specialValue) {
      return [specialValue, 'special'];
    }

    switch (registerInfo.valueType) {
      case ValueType.TEMPERATURE:
      case ValueType.PERCENTAGE:
      case ValueType.INTEGER:
      case ValueType.FLOAT:
        return [this.applyScaleAndSign(rawValue, registerInfo), 'ok'];

      case ValueType.BOOLEAN:
        return [rawValue !== 0, 'ok'];

      case ValueType.BITFIELD:
        return [rawValue, 'ok'];

      default:
        return [rawValue, 'ok'];
    }
  }

  formatForDisplay(data: ParsedDeviceData): string {
    const lines: string[] = [];

    lines.push(`КУБ-1063 Device #${data.device_id}`);
    lines.push('');

    // Temperature section
    if (data.registers.temp_inside !== undefined) {
      lines.push(`🌡️ Temperature: ${data.registers.temp_inside}°C (setpoint: ${data.registers.temp_setpoint}°C)`);
    }

    // Humidity section
    if (data.registers.humidity_inside !== undefined) {
      lines.push(`💧 Humidity: ${data.registers.humidity_inside}% (setpoint: ${data.registers.humidity_setpoint}%)`);
    }

    // Gas levels
    if (data.registers.co2_level !== undefined) {
      lines.push(`🌫️ CO2: ${data.registers.co2_level} ppm`);
    }
    if (data.registers.nh3_level !== undefined) {
      lines.push(`⚗️ NH3: ${data.registers.nh3_level} ppm`);
    }

    // Pressure
    if (data.registers.static_pressure !== undefined) {
      lines.push(`💨 Pressure: ${data.registers.static_pressure} Pa (setpoint: ${data.registers.pressure_setpoint} Pa)`);
    }

    // Ventilation
    if (data.registers.ventilation_level !== undefined) {
      lines.push(`🌀 Ventilation: ${data.registers.ventilation_level}%`);
      lines.push(`🚪 Damper: ${data.registers.damper_position}%`);
    }

    return lines.join('\n');
  }

  getCriticalAlarms(data: ParsedDeviceData): string[] {
    const alarms: string[] = [];
    const alarmStatus = data.registers.alarm_status as number;

    if (typeof alarmStatus !== 'number') {
      return alarms;
    }

    // Bit flags for alarms
    if (alarmStatus & 0x0001) alarms.push('Temperature sensor failure');
    if (alarmStatus & 0x0002) alarms.push('High temperature alarm');
    if (alarmStatus & 0x0004) alarms.push('Low temperature alarm');
    if (alarmStatus & 0x0008) alarms.push('Humidity sensor failure');
    if (alarmStatus & 0x0010) alarms.push('CO2 sensor failure');
    if (alarmStatus & 0x0020) alarms.push('NH3 sensor failure');
    if (alarmStatus & 0x0040) alarms.push('Pressure sensor failure');
    if (alarmStatus & 0x0080) alarms.push('Power failure');
    if (alarmStatus & 0x0100) alarms.push('Communication error');
    if (alarmStatus & 0x0200) alarms.push('Emergency stop active');

    return alarms;
  }

  getWarnings(data: ParsedDeviceData): string[] {
    const warnings: string[] = [];
    const warningStatus = data.registers.warning_status as number;

    if (typeof warningStatus !== 'number') {
      return warnings;
    }

    // Bit flags for warnings
    if (warningStatus & 0x0001) warnings.push('Temperature deviation');
    if (warningStatus & 0x0002) warnings.push('Humidity deviation');
    if (warningStatus & 0x0004) warnings.push('High CO2 level');
    if (warningStatus & 0x0008) warnings.push('High NH3 level');
    if (warningStatus & 0x0010) warnings.push('Pressure deviation');
    if (warningStatus & 0x0020) warnings.push('Filter maintenance required');
    if (warningStatus & 0x0040) warnings.push('Damper position error');
    if (warningStatus & 0x0080) warnings.push('Low battery');

    return warnings;
  }
}

export default KUB1063Adapter;
