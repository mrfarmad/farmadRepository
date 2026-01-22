import { z } from 'zod';

// Device Types
export enum DeviceType {
  KUB_1063 = 'KUB-1063',
  KUB_1112 = 'KUB-1112',
  VFD_INVERTER = 'VFD-INVERTER',
  ESQ_230 = 'ESQ-230',
  VARIABLE_SYSTEM = 'VARIABLE-SYSTEM',
}

// Priority Levels
export enum Priority {
  CRITICAL = 'CRITICAL',
  HIGH = 'HIGH',
  NORMAL = 'NORMAL',
  LOW = 'LOW',
}

// User Roles
export enum UserRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  OPERATOR = 'OPERATOR',
  VIEWER = 'VIEWER',
}

// Device Configuration Schema
export const DeviceConfigSchema = z.object({
  device_id: z.number(),
  device_type: z.nativeEnum(DeviceType),
  slave_id: z.number().min(1).max(247),
  name: z.string(),
  description: z.string().optional(),
  enabled: z.boolean().default(true),
  location: z.string().optional(),
  room: z.string().optional(),
  poll_interval: z.number().positive().optional(),
  priority: z.nativeEnum(Priority).optional().default(Priority.NORMAL),
});

export type DeviceConfig = z.infer<typeof DeviceConfigSchema>;

// System Configuration Schema
export const SystemConfigSchema = z.object({
  system: z.object({
    environment: z.enum(['development', 'production']).default('development'),
    log_level: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
    offline_mode: z.boolean().default(false),
    startup_timeout: z.number().default(30),
    shutdown_timeout: z.number().default(10),
  }),
  rs485: z.object({
    port: z.string(),
    baudrate: z.number().default(9600),
    timeout: z.number().default(5000),
    slave_id: z.number().default(1),
    window_duration: z.number().default(5),
    cooldown_duration: z.number().default(10),
  }),
  modbus_tcp: z.object({
    port: z.number().default(5023),
    timeout: z.number().default(3000),
    max_connections: z.number().default(10),
  }),
  database: z.object({
    file: z.string().default('storage/edge_data.db'),
    commands_db: z.string().default('data/edge_commands.db'),
    journal_mode: z.enum(['WAL', 'DELETE', 'TRUNCATE']).default('WAL'),
    synchronous: z.enum(['OFF', 'NORMAL', 'FULL']).default('NORMAL'),
    timeout: z.number().default(5000),
  }),
  polling: z.object({
    timeout: z.number().default(30000),
    max_retries: z.number().default(3),
    backoff_factor: z.number().default(10),
    backoff_max: z.number().default(60),
    default_intervals: z.record(z.number()).optional(),
  }),
  services: z.object({
    telegram_enabled: z.boolean().default(false),
    websocket_enabled: z.boolean().default(true),
    mqtt_enabled: z.boolean().default(false),
    gateway_enabled: z.boolean().default(true),
    dashboard_enabled: z.boolean().default(false),
    dashboard_port: z.number().default(8501),
    websocket_port: z.number().default(8000),
  }),
});

export type SystemConfig = z.infer<typeof SystemConfigSchema>;

// Modbus Register Types
export enum RegisterType {
  HOLDING = 'holding',
  INPUT = 'input',
  COIL = 'coil',
  DISCRETE_INPUT = 'discrete_input',
}

// Register Definition
export interface RegisterDefinition {
  address: number;
  type: RegisterType;
  name: string;
  description?: string;
  unit?: string;
  scale?: number;
  offset?: number;
  data_type?: 'uint16' | 'int16' | 'uint32' | 'int32' | 'float32' | 'bool';
  byte_order?: 'big' | 'little';
}

// Device Data
export interface DeviceData {
  device_id: number;
  timestamp: Date;
  data: Record<string, number | boolean | string>;
  alarms?: string[];
  warnings?: string[];
  status: 'online' | 'offline' | 'error';
}

// Modbus Command
export interface ModbusCommand {
  id?: number;
  device_id: number;
  slave_id: number;
  register_address: number;
  value: number;
  priority: Priority;
  created_at?: Date;
  executed_at?: Date;
  status: 'pending' | 'executing' | 'completed' | 'failed';
  error_message?: string;
}

// Health Check Result
export interface HealthCheckResult {
  component: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  message?: string;
  last_check?: Date;
  metrics?: Record<string, number | string>;
}

// System Metrics
export interface SystemMetrics {
  cpu_usage: number;
  memory_usage: number;
  disk_usage: number;
  uptime: number;
  active_devices: number;
  failed_polls: number;
  successful_polls: number;
  pending_commands: number;
}

// Telegram User
export interface TelegramUser {
  user_id: number;
  username?: string;
  first_name?: string;
  last_name?: string;
  role: UserRole;
  enabled: boolean;
  created_at: Date;
  last_seen?: Date;
}

// Error with Circuit Breaker
export interface CircuitBreakerState {
  component: string;
  state: 'closed' | 'open' | 'half-open';
  failure_count: number;
  last_failure?: Date;
  next_retry?: Date;
}

// WebSocket Message
export interface WebSocketMessage {
  type: 'device_data' | 'alarm' | 'warning' | 'command_status' | 'system_status';
  timestamp: Date;
  data: unknown;
}

// MQTT Message
export interface MQTTMessage {
  topic: string;
  payload: unknown;
  qos: 0 | 1 | 2;
  retain: boolean;
}

// Service Status
export interface ServiceStatus {
  name: string;
  running: boolean;
  started_at?: Date;
  error?: string;
}

// Export all schemas for validation
export const Schemas = {
  DeviceConfig: DeviceConfigSchema,
  SystemConfig: SystemConfigSchema,
};
