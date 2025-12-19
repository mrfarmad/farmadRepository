#!/usr/bin/env node
/**
 * Launcher for the React dashboard (replacement for Python start_dashboard.py).
 * Starts Vite dev server (or preview) and wires VITE_* endpoints to backend services.
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { Command } = require('commander');

const ROOT = __dirname;
const UI_DIR = path.join(ROOT, 'dashboard', 'ui');
const PKG_JSON = path.join(UI_DIR, 'package.json');

const program = new Command();
program
  .option('-p, --port <port>', 'Порт dev-сервера (по умолчанию 8501)', (val) => parseInt(val, 10), 8501)
  .option('--host <host>', 'Адрес для прослушивания', '0.0.0.0')
  .option('--mode <mode>', 'Режим Vite: dev или preview', 'dev')
  .option('--health <url>', 'URL health API', process.env.VITE_HEALTH_URL || 'http://localhost:8090/health')
  .option('--ws <url>', 'WebSocket endpoint', process.env.VITE_WS_URL || 'ws://localhost:8000')
  .parse(process.argv);

const opts = program.opts();

function ensureDashboardExists() {
  if (!fs.existsSync(PKG_JSON)) {
    console.error(`❌ Dashboard UI не найден: ${PKG_JSON}`);
    process.exit(1);
  }
}

function runDashboard() {
  ensureDashboardExists();

  const env = {
    ...process.env,
    VITE_HEALTH_URL: opts.health,
    VITE_WS_URL: opts.ws,
  };

  const mode = opts.mode.toLowerCase();
  if (!['dev', 'preview'].includes(mode)) {
    console.error('❌ Некорректный mode. Используйте "dev" или "preview".');
    process.exit(1);
  }

  const command = mode === 'preview'
    ? ['run', 'preview', '--', '--host', opts.host, '--port', String(opts.port)]
    : ['run', 'dev', '--', '--host', opts.host, '--port', String(opts.port)];

  console.log('🚀 Запуск EDGE Dashboard (React/Vite)');
  console.log(`   Путь: ${UI_DIR}`);
  console.log(`   Режим: ${mode}`);
  console.log(`   URL: http://${opts.host}:${opts.port}`);
  console.log(`   Health API: ${env.VITE_HEALTH_URL}`);
  console.log(`   WebSocket: ${env.VITE_WS_URL}`);
  console.log('   Ctrl+C для остановки');

  const child = spawn('npm', command, {
    cwd: UI_DIR,
    env,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });

  child.on('exit', (code) => {
    if (code === 0) {
      console.log('\n🛑 Dashboard остановлен');
    } else {
      console.error(`\n❌ Dashboard завершился с кодом ${code}`);
    }
    process.exit(code);
  });
}

runDashboard();
