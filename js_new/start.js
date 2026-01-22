#!/usr/bin/env node
/**
 * EDGE Gateway - Universal Launcher
 * Starts EDGE services with optional configurations
 */

import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function parseArgs() {
  const args = process.argv.slice(2);

  const config = {
    offline: args.includes('--offline') || args.includes('--offline-mode'),
    disableTelegram: args.includes('--disable-telegram') || args.includes('--no-telegram'),
    disableWebSocket: args.includes('--disable-websocket') || args.includes('--no-websocket'),
    help: args.includes('--help') || args.includes('-h'),
  };

  return config;
}

function showHelp() {
  console.log(`
EDGE Gateway - Universal Launcher

Usage:
  node start.js [options]

Options:
  --offline, --offline-mode     Run in offline mode (no Modbus hardware)
  --disable-telegram            Disable Telegram bot
  --disable-websocket           Disable WebSocket server
  --help, -h                    Show this help message

Examples:
  node start.js                          # Start all services
  node start.js --offline                # Offline mode (no hardware)
  node start.js --disable-telegram       # Without Telegram bot

Environment Variables:
  See .env.example for all available environment variables

Services Started:
  ✓ Configuration loader
  ✓ Device registry
  ✓ Device scheduler (if not offline)
  ✓ Modbus reader (if not offline)
  ✓ Command executor (if not offline)
  ✓ WebSocket server (if enabled)
  ✓ Health API (always)

Endpoints:
  Health API:    http://localhost:8090
  WebSocket:     ws://localhost:8000
  Dashboard:     Run 'node start-dashboard.js'

Logs:
  Location:      logs/edge-gateway.log
  View:          tail -f logs/edge-gateway.log
`);
}

function main() {
  const config = parseArgs();

  if (config.help) {
    showHelp();
    process.exit(0);
  }

  // Check if built
  const distPath = path.join(__dirname, 'dist');
  if (!fs.existsSync(distPath)) {
    console.log('📦 Building project...');
    console.log('Run: npm run build');

    const build = spawn('npm', ['run', 'build'], {
      cwd: __dirname,
      stdio: 'inherit',
      shell: true,
    });

    build.on('close', (code) => {
      if (code !== 0) {
        console.error('❌ Build failed');
        process.exit(1);
      }
      startGateway(config);
    });
  } else {
    startGateway(config);
  }
}

function startGateway(config) {
  console.log('🚀 Starting EDGE Gateway...');

  if (config.offline) {
    console.log('📴 Running in OFFLINE mode');
  }

  // Build command arguments
  const args = ['dist/index.js'];

  if (config.offline) args.push('--offline');
  if (config.disableTelegram) args.push('--disable-telegram');
  if (config.disableWebSocket) args.push('--disable-websocket');

  console.log('   Health API:    http://localhost:8090');
  if (!config.disableWebSocket) {
    console.log('   WebSocket:     ws://localhost:8000');
  }
  console.log('   Press Ctrl+C to stop');
  console.log('');

  // Start EDGE Gateway
  const gateway = spawn('node', args, {
    cwd: __dirname,
    stdio: 'inherit',
    shell: true,
  });

  // Handle Ctrl+C
  process.on('SIGINT', () => {
    console.log('\n🛑 Stopping EDGE Gateway...');
    gateway.kill('SIGINT');
  });

  // Handle process errors
  gateway.on('error', (error) => {
    console.error('❌ Gateway error:', error);
    process.exit(1);
  });

  gateway.on('close', (code) => {
    if (code !== 0 && code !== null) {
      console.error(`❌ Gateway exited with code ${code}`);
      process.exit(code);
    } else {
      console.log('✅ Gateway stopped gracefully');
      process.exit(0);
    }
  });
}

// Run main (check if this file is being run directly)
if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  main();
}

export { main, parseArgs };
