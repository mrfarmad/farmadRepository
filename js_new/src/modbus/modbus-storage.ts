import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { DeviceData, ModbusCommand, Priority } from '../types/index.js';
import { logger } from '../core/utils/logger.js';

export class ModbusStorage {
  private dataDb: Database.Database;
  private commandsDb: Database.Database;

  constructor(dataDbPath: string, commandsDbPath: string) {
    // Ensure directories exist
    this.ensureDirectoryExists(dataDbPath);
    this.ensureDirectoryExists(commandsDbPath);

    // Initialize databases with WAL mode for concurrent access
    this.dataDb = new Database(dataDbPath);
    this.commandsDb = new Database(commandsDbPath);

    this.configureDatabase(this.dataDb, 'data');
    this.configureDatabase(this.commandsDb, 'commands');

    this.initializeTables();

    logger.info({ dataDbPath, commandsDbPath }, 'ModbusStorage initialized successfully');
  }

  private ensureDirectoryExists(filePath: string): void {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  private configureDatabase(db: Database.Database, name: string): void {
    // Enable WAL mode for better concurrent access
    db.pragma('journal_mode = WAL');
    db.pragma('synchronous = NORMAL');
    db.pragma('cache_size = -64000'); // 64MB cache
    db.pragma('temp_store = memory');
    db.pragma('mmap_size = 30000000000');
    db.pragma('busy_timeout = 5000');

    logger.debug({ database: name }, 'Database configured with WAL mode');
  }

  private initializeTables(): void {
    // Device data table
    this.dataDb.exec(`
      CREATE TABLE IF NOT EXISTS device_data (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        device_id INTEGER NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        data TEXT NOT NULL,
        status TEXT DEFAULT 'online',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(device_id, timestamp)
      );

      CREATE INDEX IF NOT EXISTS idx_device_data_device_id ON device_data(device_id);
      CREATE INDEX IF NOT EXISTS idx_device_data_timestamp ON device_data(timestamp);
    `);

    // Alarms table
    this.dataDb.exec(`
      CREATE TABLE IF NOT EXISTS alarms (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        device_id INTEGER NOT NULL,
        alarm_type TEXT NOT NULL,
        message TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        acknowledged BOOLEAN DEFAULT 0,
        acknowledged_at DATETIME,
        acknowledged_by INTEGER
      );

      CREATE INDEX IF NOT EXISTS idx_alarms_device_id ON alarms(device_id);
      CREATE INDEX IF NOT EXISTS idx_alarms_timestamp ON alarms(timestamp);
    `);

    // Commands table
    this.commandsDb.exec(`
      CREATE TABLE IF NOT EXISTS commands (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        device_id INTEGER NOT NULL,
        slave_id INTEGER NOT NULL,
        register_address INTEGER NOT NULL,
        value INTEGER NOT NULL,
        priority TEXT DEFAULT 'NORMAL',
        status TEXT DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        executed_at DATETIME,
        error_message TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_commands_status ON commands(status);
      CREATE INDEX IF NOT EXISTS idx_commands_device_id ON commands(device_id);
      CREATE INDEX IF NOT EXISTS idx_commands_priority ON commands(priority);
    `);

    logger.info('Database tables initialized successfully');
  }

  /**
   * Store device data
   */
  updateData(deviceData: DeviceData): void {
    try {
      const stmt = this.dataDb.prepare(`
        INSERT OR REPLACE INTO device_data (device_id, timestamp, data, status)
        VALUES (?, ?, ?, ?)
      `);

      stmt.run(
        deviceData.device_id,
        deviceData.timestamp.toISOString(),
        JSON.stringify(deviceData.data),
        deviceData.status
      );

      // Store alarms if any
      if (deviceData.alarms && deviceData.alarms.length > 0) {
        this.storeAlarms(deviceData.device_id, deviceData.alarms, 'alarm');
      }

      // Store warnings if any
      if (deviceData.warnings && deviceData.warnings.length > 0) {
        this.storeAlarms(deviceData.device_id, deviceData.warnings, 'warning');
      }

      logger.debug({ device_id: deviceData.device_id }, 'Device data stored successfully');
    } catch (error) {
      logger.error({ error, deviceData }, 'Failed to store device data');
      throw error;
    }
  }

  /**
   * Store alarms/warnings
   */
  private storeAlarms(deviceId: number, messages: string[], alarmType: string): void {
    const stmt = this.dataDb.prepare(`
      INSERT INTO alarms (device_id, alarm_type, message)
      VALUES (?, ?, ?)
    `);

    for (const message of messages) {
      stmt.run(deviceId, alarmType, message);
    }
  }

  /**
   * Get latest device data
   */
  getLatestData(deviceId: number): DeviceData | null {
    try {
      const stmt = this.dataDb.prepare(`
        SELECT * FROM device_data
        WHERE device_id = ?
        ORDER BY timestamp DESC
        LIMIT 1
      `);

      const row = stmt.get(deviceId) as {
        device_id: number;
        timestamp: string;
        data: string;
        status: string;
      } | undefined;

      if (!row) return null;

      return {
        device_id: row.device_id,
        timestamp: new Date(row.timestamp),
        data: JSON.parse(row.data),
        status: row.status as 'online' | 'offline' | 'error',
      };
    } catch (error) {
      logger.error({ error, deviceId }, 'Failed to retrieve device data');
      return null;
    }
  }

  /**
   * Get all device data (latest for each device)
   */
  getAllLatestData(): DeviceData[] {
    try {
      const stmt = this.dataDb.prepare(`
        SELECT dd.* FROM device_data dd
        INNER JOIN (
          SELECT device_id, MAX(timestamp) as max_timestamp
          FROM device_data
          GROUP BY device_id
        ) latest ON dd.device_id = latest.device_id AND dd.timestamp = latest.max_timestamp
      `);

      const rows = stmt.all() as Array<{
        device_id: number;
        timestamp: string;
        data: string;
        status: string;
      }>;

      return rows.map((row) => ({
        device_id: row.device_id,
        timestamp: new Date(row.timestamp),
        data: JSON.parse(row.data),
        status: row.status as 'online' | 'offline' | 'error',
      }));
    } catch (error) {
      logger.error({ error }, 'Failed to retrieve all device data');
      return [];
    }
  }

  /**
   * Enqueue a register write command
   */
  enqueueCommand(command: Omit<ModbusCommand, 'id' | 'created_at' | 'executed_at' | 'status'>): number {
    try {
      const stmt = this.commandsDb.prepare(`
        INSERT INTO commands (device_id, slave_id, register_address, value, priority, status)
        VALUES (?, ?, ?, ?, ?, 'pending')
      `);

      const result = stmt.run(
        command.device_id,
        command.slave_id,
        command.register_address,
        command.value,
        command.priority
      );

      logger.info({ commandId: result.lastInsertRowid, command }, 'Command enqueued successfully');
      return result.lastInsertRowid as number;
    } catch (error) {
      logger.error({ error, command }, 'Failed to enqueue command');
      throw error;
    }
  }

  /**
   * Get pending commands (ordered by priority and creation time)
   */
  getPendingCommands(limit = 10): ModbusCommand[] {
    try {
      const stmt = this.commandsDb.prepare(`
        SELECT * FROM commands
        WHERE status = 'pending'
        ORDER BY
          CASE priority
            WHEN 'CRITICAL' THEN 1
            WHEN 'HIGH' THEN 2
            WHEN 'NORMAL' THEN 3
            WHEN 'LOW' THEN 4
          END,
          created_at ASC
        LIMIT ?
      `);

      const rows = stmt.all(limit) as Array<{
        id: number;
        device_id: number;
        slave_id: number;
        register_address: number;
        value: number;
        priority: string;
        status: string;
        created_at: string;
        executed_at: string | null;
        error_message: string | null;
      }>;

      return rows.map((row) => ({
        id: row.id,
        device_id: row.device_id,
        slave_id: row.slave_id,
        register_address: row.register_address,
        value: row.value,
        priority: row.priority as Priority,
        status: row.status as 'pending' | 'executing' | 'completed' | 'failed',
        created_at: new Date(row.created_at),
        executed_at: row.executed_at ? new Date(row.executed_at) : undefined,
        error_message: row.error_message || undefined,
      }));
    } catch (error) {
      logger.error({ error }, 'Failed to retrieve pending commands');
      return [];
    }
  }

  /**
   * Update command status
   */
  updateCommandStatus(commandId: number, status: 'executing' | 'completed' | 'failed', errorMessage?: string): void {
    try {
      const stmt = this.commandsDb.prepare(`
        UPDATE commands
        SET status = ?, executed_at = CURRENT_TIMESTAMP, error_message = ?
        WHERE id = ?
      `);

      stmt.run(status, errorMessage || null, commandId);
      logger.debug({ commandId, status }, 'Command status updated');
    } catch (error) {
      logger.error({ error, commandId, status }, 'Failed to update command status');
      throw error;
    }
  }

  /**
   * Clean up old data (retention policy)
   */
  cleanupOldData(retentionDays = 30): void {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      const dataStmt = this.dataDb.prepare(`
        DELETE FROM device_data
        WHERE timestamp < ?
      `);

      const alarmsStmt = this.dataDb.prepare(`
        DELETE FROM alarms
        WHERE timestamp < ? AND acknowledged = 1
      `);

      const commandsStmt = this.commandsDb.prepare(`
        DELETE FROM commands
        WHERE created_at < ? AND status IN ('completed', 'failed')
      `);

      const dataResult = dataStmt.run(cutoffDate.toISOString());
      const alarmsResult = alarmsStmt.run(cutoffDate.toISOString());
      const commandsResult = commandsStmt.run(cutoffDate.toISOString());

      logger.info(
        {
          dataDeleted: dataResult.changes,
          alarmsDeleted: alarmsResult.changes,
          commandsDeleted: commandsResult.changes,
          retentionDays,
        },
        'Old data cleaned up successfully'
      );
    } catch (error) {
      logger.error({ error, retentionDays }, 'Failed to clean up old data');
    }
  }

  /**
   * Close database connections
   */
  close(): void {
    this.dataDb.close();
    this.commandsDb.close();
    logger.info('ModbusStorage connections closed');
  }

  /**
   * Get database statistics
   */
  getStats(): {
    dataRecords: number;
    alarmRecords: number;
    pendingCommands: number;
    totalCommands: number;
  } {
    const dataCount = this.dataDb.prepare('SELECT COUNT(*) as count FROM device_data').get() as { count: number };
    const alarmCount = this.dataDb.prepare('SELECT COUNT(*) as count FROM alarms').get() as { count: number };
    const pendingCount = this.commandsDb.prepare("SELECT COUNT(*) as count FROM commands WHERE status = 'pending'").get() as { count: number };
    const totalCommands = this.commandsDb.prepare('SELECT COUNT(*) as count FROM commands').get() as { count: number };

    return {
      dataRecords: dataCount.count,
      alarmRecords: alarmCount.count,
      pendingCommands: pendingCount.count,
      totalCommands: totalCommands.count,
    };
  }
}

export default ModbusStorage;
