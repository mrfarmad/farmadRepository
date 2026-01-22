import { appendCRC16 } from './crc16.js';
import { RegisterType } from '../../types/index.js';

/**
 * Modbus Function Codes
 */
export enum ModbusFunctionCode {
  READ_COILS = 0x01,
  READ_DISCRETE_INPUTS = 0x02,
  READ_HOLDING_REGISTERS = 0x03,
  READ_INPUT_REGISTERS = 0x04,
  WRITE_SINGLE_COIL = 0x05,
  WRITE_SINGLE_REGISTER = 0x06,
  WRITE_MULTIPLE_COILS = 0x0f,
  WRITE_MULTIPLE_REGISTERS = 0x10,
}

/**
 * Build Modbus RTU read request
 * Function Code 03 (Read Holding Registers) or 04 (Read Input Registers)
 */
export function buildReadRequest(
  slaveId: number,
  registerAddress: number,
  count: number,
  registerType: RegisterType = RegisterType.HOLDING
): Buffer {
  // Choose function code based on register type
  const functionCode =
    registerType === RegisterType.INPUT
      ? ModbusFunctionCode.READ_INPUT_REGISTERS
      : ModbusFunctionCode.READ_HOLDING_REGISTERS;

  // Build request without CRC (6 bytes)
  const request = Buffer.allocUnsafe(6);
  request.writeUInt8(slaveId, 0);
  request.writeUInt8(functionCode, 1);
  request.writeUInt16BE(registerAddress, 2); // Big-endian address
  request.writeUInt16BE(count, 4); // Big-endian count

  // Append CRC16
  return appendCRC16(request);
}

/**
 * Build Modbus RTU write single register request
 * Function Code 06 (Write Single Register)
 */
export function buildWriteSingleRequest(
  slaveId: number,
  registerAddress: number,
  value: number
): Buffer {
  // Build request without CRC (6 bytes)
  const request = Buffer.allocUnsafe(6);
  request.writeUInt8(slaveId, 0);
  request.writeUInt8(ModbusFunctionCode.WRITE_SINGLE_REGISTER, 1);
  request.writeUInt16BE(registerAddress, 2);
  request.writeUInt16BE(value, 4);

  // Append CRC16
  return appendCRC16(request);
}

/**
 * Build Modbus RTU write multiple registers request
 * Function Code 16 (Write Multiple Registers)
 */
export function buildWriteMultipleRequest(
  slaveId: number,
  registerAddress: number,
  values: number[]
): Buffer {
  const byteCount = values.length * 2;

  // Build request without CRC (7 + byteCount bytes)
  const request = Buffer.allocUnsafe(7 + byteCount);
  request.writeUInt8(slaveId, 0);
  request.writeUInt8(ModbusFunctionCode.WRITE_MULTIPLE_REGISTERS, 1);
  request.writeUInt16BE(registerAddress, 2);
  request.writeUInt16BE(values.length, 4); // Quantity of registers
  request.writeUInt8(byteCount, 6);

  // Write register values (big-endian)
  for (let i = 0; i < values.length; i++) {
    request.writeUInt16BE(values[i], 7 + i * 2);
  }

  // Append CRC16
  return appendCRC16(request);
}

/**
 * Build Modbus RTU write single coil request
 * Function Code 05 (Write Single Coil)
 */
export function buildWriteCoilRequest(
  slaveId: number,
  coilAddress: number,
  value: boolean
): Buffer {
  // Build request without CRC (6 bytes)
  const request = Buffer.allocUnsafe(6);
  request.writeUInt8(slaveId, 0);
  request.writeUInt8(ModbusFunctionCode.WRITE_SINGLE_COIL, 1);
  request.writeUInt16BE(coilAddress, 2);
  request.writeUInt16BE(value ? 0xff00 : 0x0000, 4); // ON = 0xFF00, OFF = 0x0000

  // Append CRC16
  return appendCRC16(request);
}

/**
 * Build Modbus RTU read coils request
 * Function Code 01 (Read Coils)
 */
export function buildReadCoilsRequest(
  slaveId: number,
  coilAddress: number,
  count: number
): Buffer {
  // Build request without CRC (6 bytes)
  const request = Buffer.allocUnsafe(6);
  request.writeUInt8(slaveId, 0);
  request.writeUInt8(ModbusFunctionCode.READ_COILS, 1);
  request.writeUInt16BE(coilAddress, 2);
  request.writeUInt16BE(count, 4);

  // Append CRC16
  return appendCRC16(request);
}

/**
 * Parse Modbus RTU response
 * Returns array of register values or null on error
 */
export interface ModbusResponse {
  slaveId: number;
  functionCode: number;
  data: number[];
}

export interface ModbusError {
  slaveId: number;
  functionCode: number;
  errorCode: number;
  errorMessage: string;
}

/**
 * Modbus exception codes
 */
const MODBUS_EXCEPTIONS: Record<number, string> = {
  0x01: 'Illegal Function',
  0x02: 'Illegal Data Address',
  0x03: 'Illegal Data Value',
  0x04: 'Slave Device Failure',
  0x05: 'Acknowledge',
  0x06: 'Slave Device Busy',
  0x08: 'Memory Parity Error',
  0x0a: 'Gateway Path Unavailable',
  0x0b: 'Gateway Target Device Failed to Respond',
};

/**
 * Parse Modbus RTU read response
 */
export function parseReadResponse(
  response: Buffer,
  expectedCount: number
): ModbusResponse | ModbusError | null {
  // Minimum response length: slave_id (1) + func (1) + byte_count (1) + crc (2) = 5
  if (response.length < 5) {
    return null;
  }

  const slaveId = response.readUInt8(0);
  const functionCode = response.readUInt8(1);

  // Check for error response (high bit set)
  if (functionCode & 0x80) {
    const errorCode = response.readUInt8(2);
    return {
      slaveId,
      functionCode: functionCode & 0x7f,
      errorCode,
      errorMessage: MODBUS_EXCEPTIONS[errorCode] || `Unknown Error (0x${errorCode.toString(16)})`,
    };
  }

  // Extract data
  const byteCount = response.readUInt8(2);
  const expectedBytes = expectedCount * 2;

  if (byteCount !== expectedBytes) {
    return null;
  }

  // Parse registers (2 bytes per register, big-endian)
  const data: number[] = [];
  for (let i = 0; i < expectedCount; i++) {
    const offset = 3 + i * 2;
    if (offset + 1 < response.length - 2) {
      // -2 for CRC
      const value = response.readUInt16BE(offset);
      data.push(value);
    }
  }

  if (data.length !== expectedCount) {
    return null;
  }

  return { slaveId, functionCode, data };
}

/**
 * Parse Modbus RTU write response
 */
export function parseWriteResponse(response: Buffer): ModbusResponse | ModbusError | null {
  // Minimum response length for write: 8 bytes
  if (response.length < 5) {
    return null;
  }

  const slaveId = response.readUInt8(0);
  const functionCode = response.readUInt8(1);

  // Check for error response
  if (functionCode & 0x80) {
    const errorCode = response.readUInt8(2);
    return {
      slaveId,
      functionCode: functionCode & 0x7f,
      errorCode,
      errorMessage: MODBUS_EXCEPTIONS[errorCode] || `Unknown Error (0x${errorCode.toString(16)})`,
    };
  }

  // For successful write, return address and value/quantity
  const address = response.readUInt16BE(2);
  const value = response.readUInt16BE(4);

  return { slaveId, functionCode, data: [address, value] };
}

/**
 * Check if response is an error
 */
export function isModbusError(
  response: ModbusResponse | ModbusError | null
): response is ModbusError {
  return response !== null && 'errorCode' in response;
}
