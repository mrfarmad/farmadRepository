#!/usr/bin/env node
/**
 * EDGE_js startup entrypoint.
 * Mirrors Python start.py: loads config, initializes Modbus reader, device registry,
 * schedulers, and optional services (MQTT, WebSocket, Telegram, health API).
 */

const path = require('path');
const { Command } = require('commander');
const dotenv = require('dotenv');
const { loadConfig } = require('./core/config-manager');
const { DeviceRegistry } = require('./core/device-registry');
const { DeviceScheduler } = require('./core/device-scheduler');
const { setupErrorHandling } = require('./core/error-handler');
const { SecurityManager } = require('./core/security-manager');
const { startHealthApi } = require('./core/health-api');
const { WebSocketService } = require('./services/websocket-server');
const { MqttPublisher } = require('./services/mqtt-publisher');
const { TelegramBotService } = require('./services/telegram-bot');
const { EdgePingService } = require('./services/edge-ping');
const { initializeReader } = require('./modbus/reader-integration');
const { CommandExecutor } = require('./modbus/command-executor');
const { CommandQueue } = require('./modbus/command-queue');
const { ModbusStorage } = require('./modbus/modbus-storage');

const EDGE_DIR = __dirname;
const PROJECT_ROOT = EDGE_DIR;

dotenv.config({ path: path.join(PROJECT_ROOT, '.env') });

const program = new Command();
program
  .option('--disable-telegram', 'Disable Telegram bot')
  .option('--disable-websocket', 'Disable WebSocket server')
  .option('--disable-mqtt', 'Disable MQTT publisher')
  .option('--health-port <port>', 'Health API port override', parseInt)
  .option('--offline', 'Run without cloud features')
  .parse(process.argv);

const options = program.opts();

async function main() {
  setupErrorHandling();

  const config = loadConfig({ root: PROJECT_ROOT, overrideHealthPort: options.healthPort });
  const security = new SecurityManager(config.security);
  const registry = new DeviceRegistry(config.devices);
  const queue = new CommandQueue();
  const storage = new ModbusStorage(path.join(PROJECT_ROOT, 'storage', 'kub_data.db'));

  const reader = await initializeReader({
    port: process.env.RS485_PORT || config.rs485.port,
    baudRate: Number(process.env.RS485_BAUD) || config.rs485.baudrate,
    timeout: Number(process.env.RS485_TIMEOUT) || config.rs485.timeout,
  });

  const executor = new CommandExecutor({ registry, queue, reader, storage });
  const interval = config.scheduler?.interval_ms || 1000;
  const scheduler = new DeviceScheduler({ registry, executor, intervalMs: interval });

  const services = [];
  if (!options.disableWebsocket) {
    const wsCfg = config.websocket || { port: process.env.WEBSOCKET_PORT };
    const ws = new WebSocketService({ port: wsCfg.port, registry });
    services.push(ws);
  }
  if (!options.disableMqtt) {
    const mqttCfg = config.mqtt || {};
    const mqtt = new MqttPublisher({
      url: process.env.MQTT_URL || mqttCfg.url,
      username: process.env.MQTT_USERNAME || mqttCfg.username,
      password: process.env.MQTT_PASSWORD || mqttCfg.password,
      registry,
    });
    services.push(mqtt);
  }
  if (!options.disableTelegram) {
    const bot = new TelegramBotService({ token: process.env.TELEGRAM_BOT_TOKEN, registry });
    services.push(bot);
  }

  const ping = new EdgePingService({ endpoint: config.edge_ping?.endpoint });
  const health = startHealthApi({ port: options.healthPort || config.health_api?.port || 8088, registry, scheduler });

  await security.initialize();
  await reader.start();
  scheduler.start();
  await Promise.all(services.map((svc) => svc.start?.()));
  await ping.start();

  console.log('✅ EDGE_js services started');

  const shutdown = async () => {
    console.log('\n⏻ Stopping EDGE_js...');
    scheduler.stop();
    await Promise.all(services.map((svc) => svc.stop?.()))
      .catch((err) => console.error('Service stop error', err));
    await reader.stop();
    await ping.stop();
    await health?.stop?.();
    storage.close();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

if (require.main === module) {
  main().catch((err) => {
    console.error('Fatal startup error', err);
    process.exit(1);
  });
}

module.exports = { main };
