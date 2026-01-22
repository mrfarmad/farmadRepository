#!/usr/bin/env node
/**
 * EDGE Gateway - Main Entry Point
 * Industrial IoT Gateway for Farm Equipment Monitoring
 */

import { logger } from './core/utils/logger.js';
import { EDGEService } from './core/edge-service.js';

/**
 * Parse command line arguments
 */
function parseArgs(): {
  offlineMode: boolean;
  disableTelegram: boolean;
  disableWebSocket: boolean;
} {
  const args = process.argv.slice(2);

  return {
    offlineMode: args.includes('--offline') || args.includes('--offline-mode'),
    disableTelegram: args.includes('--disable-telegram') || args.includes('--no-telegram'),
    disableWebSocket: args.includes('--disable-websocket') || args.includes('--no-websocket'),
  };
}

/**
 * Main application entry point
 */
async function main() {
  let edgeService: EDGEService | null = null;

  try {
    // Parse command line arguments
    const args = parseArgs();

    logger.info('🚀 Starting EDGE Gateway...');

    if (args.offlineMode) {
      logger.info('📴 Running in OFFLINE mode');
    }

    // Create and initialize EDGE service
    edgeService = new EDGEService({
      offlineMode: args.offlineMode,
      disableTelegram: args.disableTelegram,
      disableWebSocket: args.disableWebSocket,
    });

    // Initialize components
    await edgeService.initialize();

    // Start all services
    await edgeService.start();

    logger.info('✅ EDGE Gateway started successfully');

    // Log status
    const status = edgeService.getStatus();
    logger.info(
      {
        devices: `${status.devices.enabled}/${status.devices.total}`,
        modbus: status.modbusConnected ? 'connected' : 'offline',
        websocket: status.websocketRunning ? 'running' : 'disabled',
        healthAPI: status.healthAPIRunning ? 'running' : 'disabled',
      },
      '📊 System Status'
    );

    // Setup graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info({ signal }, 'Received shutdown signal, stopping services...');

      try {
        if (edgeService) {
          await edgeService.stop();
        }

        logger.info('✅ All services stopped gracefully');
        process.exit(0);
      } catch (error) {
        logger.error({ error }, 'Error during shutdown');
        process.exit(1);
      }
    };

    // Register signal handlers
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));

    // Keep process alive
    await new Promise(() => {});
  } catch (error) {
    logger.error({ error }, '❌ Fatal error during startup');

    // Attempt cleanup
    if (edgeService) {
      try {
        await edgeService.stop();
      } catch (cleanupError) {
        logger.error({ error: cleanupError }, 'Error during cleanup');
      }
    }

    process.exit(1);
  }
}

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error({ reason, promise }, 'Unhandled Promise Rejection');
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error({ error }, 'Uncaught Exception');
  process.exit(1);
});

// Display usage
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
EDGE Gateway - Industrial IoT Gateway for Farm Equipment Monitoring

Usage:
  node dist/index.js [options]

Options:
  --offline, --offline-mode     Run in offline mode (no Modbus connection)
  --disable-telegram            Disable Telegram bot
  --disable-websocket           Disable WebSocket server
  --help, -h                    Show this help message

Examples:
  node dist/index.js                          # Run with all services
  node dist/index.js --offline                # Run without Modbus
  node dist/index.js --disable-telegram       # Run without Telegram bot

Environment Variables:
  See .env.example for all available environment variables
  `);
  process.exit(0);
}

// Run main function
main();
