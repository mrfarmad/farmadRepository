import fs from 'fs/promises';
import path from 'path';
import yaml from 'js-yaml';
import dotenv from 'dotenv';
import { SystemConfig, SystemConfigSchema, DeviceConfig, DeviceConfigSchema } from '../../types/index.js';
import { logger } from '../utils/logger.js';

// Load environment variables
dotenv.config();

export class ConfigManager {
  private static instance: ConfigManager;
  private systemConfig: SystemConfig | null = null;
  private devices: DeviceConfig[] = [];
  private configPath: string;

  private constructor(configPath = 'config') {
    this.configPath = configPath;
  }

  static getInstance(configPath?: string): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager(configPath);
    }
    return ConfigManager.instance;
  }

  /**
   * Load system configuration from YAML file with environment variable overrides
   */
  async loadSystemConfig(filePath = 'app_config.yaml'): Promise<SystemConfig> {
    try {
      const fullPath = path.join(this.configPath, filePath);
      const fileContents = await fs.readFile(fullPath, 'utf8');
      const rawConfig = yaml.load(fileContents) as unknown;

      // Merge with environment variables
      const config = this.mergeWithEnv(rawConfig);

      // Validate with Zod schema
      this.systemConfig = SystemConfigSchema.parse(config);

      logger.info({ config: this.systemConfig }, 'System configuration loaded successfully');
      return this.systemConfig;
    } catch (error) {
      logger.error({ error, filePath }, 'Failed to load system configuration');
      throw new Error(`Configuration loading failed: ${error}`);
    }
  }

  /**
   * Load device configurations from YAML file
   */
  async loadDevices(filePath = 'devices.yaml'): Promise<DeviceConfig[]> {
    try {
      const fullPath = path.join(this.configPath, filePath);
      const fileContents = await fs.readFile(fullPath, 'utf8');
      const rawData = yaml.load(fileContents) as { devices: unknown[] };

      if (!rawData?.devices || !Array.isArray(rawData.devices)) {
        throw new Error('Invalid devices configuration: missing or invalid "devices" array');
      }

      // Validate each device with Zod schema
      this.devices = rawData.devices.map((device, index) => {
        try {
          return DeviceConfigSchema.parse(device);
        } catch (error) {
          logger.error({ error, index, device }, 'Invalid device configuration');
          throw new Error(`Device ${index} validation failed: ${error}`);
        }
      });

      logger.info({ count: this.devices.length }, 'Device configurations loaded successfully');
      return this.devices;
    } catch (error) {
      logger.error({ error, filePath }, 'Failed to load device configurations');
      throw new Error(`Device configuration loading failed: ${error}`);
    }
  }

  /**
   * Merge configuration with environment variables
   * Environment variables take precedence over file-based config
   */
  private mergeWithEnv(config: unknown): unknown {
    const envOverrides: Record<string, Record<string, unknown>> = {};
    const configObj = typeof config === 'object' && config !== null ? (config as Record<string, unknown>) : {};

    // System overrides
    if (process.env.NODE_ENV || process.env.LOG_LEVEL || process.env.OFFLINE_MODE) {
      const systemConfig = ('system' in configObj && typeof configObj.system === 'object' && configObj.system !== null)
        ? configObj.system as Record<string, unknown>
        : {};

      envOverrides.system = {
        ...systemConfig,
        ...(process.env.NODE_ENV && { environment: process.env.NODE_ENV }),
        ...(process.env.LOG_LEVEL && { log_level: process.env.LOG_LEVEL }),
        ...(process.env.OFFLINE_MODE && { offline_mode: process.env.OFFLINE_MODE === 'true' }),
      };
    }

    // RS485 overrides
    if (process.env.SERIAL_PORT || process.env.SERIAL_BAUDRATE) {
      const rs485Config = ('rs485' in configObj && typeof configObj.rs485 === 'object' && configObj.rs485 !== null)
        ? configObj.rs485 as Record<string, unknown>
        : {};

      envOverrides.rs485 = {
        ...rs485Config,
        ...(process.env.SERIAL_PORT && { port: process.env.SERIAL_PORT }),
        ...(process.env.SERIAL_BAUDRATE && { baudrate: parseInt(process.env.SERIAL_BAUDRATE, 10) }),
        ...(process.env.SERIAL_TIMEOUT && { timeout: parseInt(process.env.SERIAL_TIMEOUT, 10) }),
      };
    }

    // Database overrides
    if (process.env.DB_PATH || process.env.DB_COMMANDS_PATH) {
      const dbConfig = ('database' in configObj && typeof configObj.database === 'object' && configObj.database !== null)
        ? configObj.database as Record<string, unknown>
        : {};

      envOverrides.database = {
        ...dbConfig,
        ...(process.env.DB_PATH && { file: process.env.DB_PATH }),
        ...(process.env.DB_COMMANDS_PATH && { commands_db: process.env.DB_COMMANDS_PATH }),
        ...(process.env.DB_JOURNAL_MODE && { journal_mode: process.env.DB_JOURNAL_MODE }),
      };
    }

    // Services overrides
    if (process.env.TELEGRAM_ENABLED || process.env.WEBSOCKET_ENABLED) {
      const servicesConfig = ('services' in configObj && typeof configObj.services === 'object' && configObj.services !== null)
        ? configObj.services as Record<string, unknown>
        : {};

      envOverrides.services = {
        ...servicesConfig,
        ...(process.env.TELEGRAM_ENABLED && { telegram_enabled: process.env.TELEGRAM_ENABLED === 'true' }),
        ...(process.env.WEBSOCKET_ENABLED && { websocket_enabled: process.env.WEBSOCKET_ENABLED === 'true' }),
        ...(process.env.MQTT_ENABLED && { mqtt_enabled: process.env.MQTT_ENABLED === 'true' }),
        ...(process.env.WEBSOCKET_PORT && { websocket_port: parseInt(process.env.WEBSOCKET_PORT, 10) }),
      };
    }

    return {
      ...configObj,
      ...envOverrides,
    };
  }

  /**
   * Get current system configuration
   */
  getSystemConfig(): SystemConfig {
    if (!this.systemConfig) {
      throw new Error('System configuration not loaded. Call loadSystemConfig() first.');
    }
    return this.systemConfig;
  }

  /**
   * Get all device configurations
   */
  getDevices(): DeviceConfig[] {
    return this.devices;
  }

  /**
   * Get device by ID
   */
  getDevice(deviceId: number): DeviceConfig | undefined {
    return this.devices.find((d) => d.device_id === deviceId);
  }

  /**
   * Get enabled devices only
   */
  getEnabledDevices(): DeviceConfig[] {
    return this.devices.filter((d) => d.enabled);
  }

  /**
   * Save system configuration to file
   */
  async saveSystemConfig(filePath = 'app_config.yaml'): Promise<void> {
    if (!this.systemConfig) {
      throw new Error('No system configuration to save');
    }

    try {
      const fullPath = path.join(this.configPath, filePath);
      const yamlContent = yaml.dump(this.systemConfig);
      await fs.writeFile(fullPath, yamlContent, 'utf8');
      logger.info({ filePath: fullPath }, 'System configuration saved successfully');
    } catch (error) {
      logger.error({ error, filePath }, 'Failed to save system configuration');
      throw new Error(`Configuration save failed: ${error}`);
    }
  }

  /**
   * Reload all configurations
   */
  async reloadAll(): Promise<void> {
    await this.loadSystemConfig();
    await this.loadDevices();
    logger.info('All configurations reloaded successfully');
  }
}

// Export singleton instance
export const configManager = ConfigManager.getInstance();
export default configManager;
