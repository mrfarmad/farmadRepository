import { SerialPort } from 'serialport';
import { EventEmitter } from 'events';
import {
  buildReadRequest,
  buildWriteSingleRequest,
  parseReadResponse,
  parseWriteResponse,
  isModbusError,
} from './protocol/message-builder.js';
import { verifyCRC16 } from './protocol/crc16.js';
import { RegisterType } from '../types/index.js';
import { logger } from '../core/utils/logger.js';

export interface UniversalReaderConfig {
  port: string;
  baudrate: number;
  timeout: number;
  parity?: 'none' | 'even' | 'odd';
  stopBits?: 1 | 2;
  dataBits?: 7 | 8;
}

export interface ReadResult {
  success: boolean;
  data?: number[];
  error?: string;
  timestamp: Date;
}

export interface WriteResult {
  success: boolean;
  error?: string;
  timestamp: Date;
}

/**
 * Universal Modbus RTU Reader
 * Handles serial communication with Modbus RTU devices
 */
export class UniversalModbusReader extends EventEmitter {
  private serialPort: SerialPort | null = null;
  private config: UniversalReaderConfig;
  private isConnected = false;
  private readBuffer: Buffer = Buffer.alloc(0);
  private pendingRequest: {
    resolve: (value: Buffer) => void;
    reject: (error: Error) => void;
    timeout: NodeJS.Timeout;
  } | null = null;

  constructor(config: UniversalReaderConfig) {
    super();
    this.config = config;
  }

  /**
   * Connect to serial port
   */
  async connect(): Promise<boolean> {
    if (this.isConnected && this.serialPort?.isOpen) {
      return true;
    }

    try {
      this.serialPort = new SerialPort({
        path: this.config.port,
        baudRate: this.config.baudrate,
        dataBits: this.config.dataBits || 8,
        stopBits: this.config.stopBits || 1,
        parity: this.config.parity || 'none',
      });

      // Set up event handlers
      this.serialPort.on('data', this.handleSerialData.bind(this));
      this.serialPort.on('error', this.handleSerialError.bind(this));
      this.serialPort.on('close', this.handleSerialClose.bind(this));

      // Wait for port to open
      await new Promise<void>((resolve, reject) => {
        this.serialPort!.once('open', () => resolve());
        this.serialPort!.once('error', reject);
      });

      this.isConnected = true;
      logger.info({ port: this.config.port, baudrate: this.config.baudrate }, 'Connected to serial port');
      this.emit('connected');

      return true;
    } catch (error) {
      logger.error({ error, port: this.config.port }, 'Failed to connect to serial port');
      this.emit('error', error);
      return false;
    }
  }

  /**
   * Disconnect from serial port
   */
  async disconnect(): Promise<void> {
    if (!this.serialPort) {
      return;
    }

    try {
      // Cancel pending request
      if (this.pendingRequest) {
        clearTimeout(this.pendingRequest.timeout);
        this.pendingRequest.reject(new Error('Connection closing'));
        this.pendingRequest = null;
      }

      // Flush and close
      if (this.serialPort.isOpen) {
        await new Promise<void>((resolve) => {
          this.serialPort!.flush(() => {
            this.serialPort!.close(() => {
              resolve();
            });
          });
        });
      }

      this.serialPort = null;
      this.isConnected = false;
      this.readBuffer = Buffer.alloc(0);

      logger.info({ port: this.config.port }, 'Disconnected from serial port');
      this.emit('disconnected');
    } catch (error) {
      logger.error({ error }, 'Error during disconnect');
    }
  }

  /**
   * Handle incoming serial data
   */
  private handleSerialData(data: Buffer): void {
    // Append to read buffer
    this.readBuffer = Buffer.concat([this.readBuffer, data]);

    // If we have a pending request, check if we have a complete response
    if (this.pendingRequest && this.readBuffer.length >= 5) {
      // Check if we have enough data for complete response
      // Minimum: slave_id (1) + func (1) + byte_count (1) + data + crc (2)
      const byteCount = this.readBuffer.length >= 3 ? this.readBuffer[2] : 0;
      const expectedLength = 3 + byteCount + 2; // Header + data + CRC

      if (this.readBuffer.length >= expectedLength) {
        const response = this.readBuffer.slice(0, expectedLength);
        this.readBuffer = this.readBuffer.slice(expectedLength);

        clearTimeout(this.pendingRequest.timeout);
        this.pendingRequest.resolve(response);
        this.pendingRequest = null;
      }
    }
  }

  /**
   * Handle serial port errors
   */
  private handleSerialError(error: Error): void {
    logger.error({ error }, 'Serial port error');
    this.emit('error', error);

    if (this.pendingRequest) {
      clearTimeout(this.pendingRequest.timeout);
      this.pendingRequest.reject(error);
      this.pendingRequest = null;
    }
  }

  /**
   * Handle serial port close
   */
  private handleSerialClose(): void {
    this.isConnected = false;
    logger.warn('Serial port closed unexpectedly');
    this.emit('disconnected');
  }

  /**
   * Send request and wait for response
   */
  private async sendRequest(request: Buffer): Promise<Buffer> {
    if (!this.serialPort || !this.serialPort.isOpen) {
      throw new Error('Serial port not open');
    }

    // Clear read buffer
    this.readBuffer = Buffer.alloc(0);

    // Write request
    await new Promise<void>((resolve, reject) => {
      this.serialPort!.write(request, (error) => {
        if (error) reject(error);
        else resolve();
      });
    });

    // Wait for response with timeout
    return new Promise<Buffer>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequest = null;
        reject(new Error('Modbus response timeout'));
      }, this.config.timeout);

      this.pendingRequest = { resolve, reject, timeout };
    });
  }

  /**
   * Read holding or input registers
   */
  async readRegisters(
    slaveId: number,
    registerAddress: number,
    count: number,
    registerType: RegisterType = RegisterType.HOLDING
  ): Promise<ReadResult> {
    const timestamp = new Date();

    try {
      // Build request
      const request = buildReadRequest(slaveId, registerAddress, count, registerType);

      logger.debug(
        { slaveId, registerAddress, count, registerType },
        'Sending Modbus read request'
      );

      // Send and wait for response
      const response = await this.sendRequest(request);

      // Verify CRC
      if (!verifyCRC16(response)) {
        logger.warn({ response: response.toString('hex') }, 'Invalid CRC in response');
        return {
          success: false,
          error: 'Invalid CRC',
          timestamp,
        };
      }

      // Parse response
      const parsed = parseReadResponse(response, count);

      if (!parsed) {
        return {
          success: false,
          error: 'Failed to parse response',
          timestamp,
        };
      }

      if (isModbusError(parsed)) {
        logger.warn({ error: parsed }, 'Modbus error response');
        return {
          success: false,
          error: parsed.errorMessage,
          timestamp,
        };
      }

      logger.debug({ slaveId, data: parsed.data }, 'Modbus read successful');

      return {
        success: true,
        data: parsed.data,
        timestamp,
      };
    } catch (error) {
      logger.error({ error, slaveId, registerAddress }, 'Modbus read failed');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp,
      };
    }
  }

  /**
   * Write single register
   */
  async writeSingleRegister(
    slaveId: number,
    registerAddress: number,
    value: number
  ): Promise<WriteResult> {
    const timestamp = new Date();

    try {
      // Build request
      const request = buildWriteSingleRequest(slaveId, registerAddress, value);

      logger.debug({ slaveId, registerAddress, value }, 'Sending Modbus write request');

      // Send and wait for response
      const response = await this.sendRequest(request);

      // Verify CRC
      if (!verifyCRC16(response)) {
        logger.warn({ response: response.toString('hex') }, 'Invalid CRC in write response');
        return {
          success: false,
          error: 'Invalid CRC',
          timestamp,
        };
      }

      // Parse response
      const parsed = parseWriteResponse(response);

      if (!parsed) {
        return {
          success: false,
          error: 'Failed to parse write response',
          timestamp,
        };
      }

      if (isModbusError(parsed)) {
        logger.warn({ error: parsed }, 'Modbus write error response');
        return {
          success: false,
          error: parsed.errorMessage,
          timestamp,
        };
      }

      logger.debug({ slaveId, registerAddress, value }, 'Modbus write successful');

      return {
        success: true,
        timestamp,
      };
    } catch (error) {
      logger.error({ error, slaveId, registerAddress, value }, 'Modbus write failed');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp,
      };
    }
  }

  /**
   * Get connection status
   */
  getStatus(): { connected: boolean; port: string } {
    return {
      connected: this.isConnected,
      port: this.config.port,
    };
  }
}

export default UniversalModbusReader;
