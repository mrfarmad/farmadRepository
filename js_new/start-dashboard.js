#!/usr/bin/env node
/**
 * EDGE Dashboard Launcher
 * Starts the Next.js web interface for EDGE gateway monitoring
 */

import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function main() {
  const dashboardPath = path.join(__dirname, 'dashboard');

  // Check if dashboard directory exists
  if (!fs.existsSync(dashboardPath)) {
    console.error('❌ Dashboard directory not found:', dashboardPath);
    console.log('Run: cd js_new/dashboard && npm install');
    process.exit(1);
  }

  // Check if node_modules exists
  const nodeModulesPath = path.join(dashboardPath, 'node_modules');
  if (!fs.existsSync(nodeModulesPath)) {
    console.log('📦 Installing dashboard dependencies...');
    console.log('This may take a few minutes...');

    const install = spawn('npm', ['install'], {
      cwd: dashboardPath,
      stdio: 'inherit',
      shell: true,
    });

    install.on('close', (code) => {
      if (code !== 0) {
        console.error('❌ Failed to install dependencies');
        process.exit(1);
      }
      startDashboard();
    });
  } else {
    startDashboard();
  }
}

function startDashboard() {
  console.log('🚀 Starting EDGE Dashboard...');
  console.log('   Dashboard: http://localhost:3000');
  console.log('   API: http://localhost:8090');
  console.log('   WebSocket: ws://localhost:8000');
  console.log('   Press Ctrl+C to stop');
  console.log('');

  const dashboardPath = path.join(__dirname, 'dashboard');

  // Start Next.js development server
  const dashboard = spawn('npm', ['run', 'dev'], {
    cwd: dashboardPath,
    stdio: 'inherit',
    shell: true,
  });

  // Handle Ctrl+C
  process.on('SIGINT', () => {
    console.log('\n🛑 Stopping dashboard...');
    dashboard.kill('SIGINT');
    process.exit(0);
  });

  // Handle process errors
  dashboard.on('error', (error) => {
    console.error('❌ Dashboard error:', error);
    process.exit(1);
  });

  dashboard.on('close', (code) => {
    if (code !== 0 && code !== null) {
      console.error(`❌ Dashboard exited with code ${code}`);
      process.exit(code);
    }
  });
}

// Run main (check if this file is being run directly)
if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  main();
}

export { main };
