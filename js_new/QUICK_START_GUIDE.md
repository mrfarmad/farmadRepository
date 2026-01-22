# Quick Start Guide - EDGE Gateway with Dashboard

## Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- Windows/Linux/macOS

## First Time Setup

### 1. Install Backend Dependencies

```bash
cd js_new
npm install
```

### 2. Install Dashboard Dependencies

The dashboard dependencies will be **automatically installed** when you run `start-dashboard.js` for the first time. Or you can install manually:

```bash
cd dashboard
npm install
cd ..
```

### 3. Build the Backend

```bash
npm run build
```

## Running the System

### Start Backend Gateway

**Terminal 1:**

```bash
cd js_new

# Option 1: Full mode (requires RS-485 hardware)
node start.js

# Option 2: Offline mode (no hardware needed, for testing)
node start.js --offline

# Option 3: Custom options
node start.js --offline --disable-websocket
```

**Expected Output:**
```
🚀 Starting EDGE Gateway...
📴 Running in OFFLINE mode
   Health API:    http://localhost:8090
   WebSocket:     ws://localhost:8000
   Press Ctrl+C to stop

[Logs will appear here...]
```

### Start Dashboard

**Terminal 2:**

```bash
cd js_new
node start-dashboard.js
```

**Expected Output:**
```
🚀 Starting EDGE Dashboard...
   Dashboard: http://localhost:3000
   API: http://localhost:8090
   WebSocket: ws://localhost:8000
   Press Ctrl+C to stop

  ▲ Next.js 14.2.35
  - Local:        http://localhost:3000

 ✓ Ready in 2.3s
```

### Access the Dashboard

Open your browser to: **http://localhost:3000**

## Available Endpoints

| Service | URL | Description |
|---------|-----|-------------|
| Dashboard | http://localhost:3000 | Web UI for monitoring and control |
| Health API | http://localhost:8090 | REST API for system health |
| WebSocket | ws://localhost:8000 | Real-time data streaming |

## Testing Without Hardware

To test the system without physical RS-485 devices:

```bash
# Terminal 1: Start backend in offline mode
node start.js --offline

# Terminal 2: Start dashboard
node start-dashboard.js

# Browser: Open http://localhost:3000
```

The dashboard will show an empty state with "No devices connected" - this is expected in offline mode.

## Command-Line Options

### Backend (start.js)

```bash
node start.js [options]

Options:
  --offline              Run without Modbus hardware
  --offline-mode         Same as --offline
  --disable-telegram     Disable Telegram bot (future feature)
  --disable-websocket    Disable WebSocket server
  --help, -h            Show help message

Examples:
  node start.js                          # Full system
  node start.js --offline                # Offline mode
  node start.js --offline --disable-websocket
```

### Dashboard (start-dashboard.js)

```bash
node start-dashboard.js

# No options needed - automatically:
# - Checks for dashboard directory
# - Installs dependencies if missing
# - Starts Next.js dev server on port 3000
```

## Stopping the Services

Press **Ctrl+C** in each terminal to stop the services gracefully.

## Troubleshooting

### "next" command not found

**Problem:** Dashboard shows error about `next` not being a recognized command.

**Solution:**
```bash
cd js_new/dashboard
rm -rf node_modules package-lock.json
npm install
cd ..
node start-dashboard.js
```

### Port already in use

**Problem:** Error: "Port 3000 is already in use"

**Solution:**
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Linux/macOS
lsof -ti:3000 | xargs kill -9
```

### Backend won't start

**Problem:** Error when starting backend

**Solution:**
```bash
cd js_new
npm run clean
npm install
npm run build
node start.js --offline
```

### Dashboard dependencies installation failed

**Problem:** npm install fails in dashboard directory

**Solution:**
```bash
cd js_new/dashboard
npm cache clean --force
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps
```

## Development Mode

For active development with auto-reload:

```bash
# Backend (TypeScript watch mode)
cd js_new
npm run dev

# Dashboard (Next.js dev mode)
cd js_new
node start-dashboard.js  # Already runs in dev mode
```

## Production Build

For production deployment:

```bash
# Backend
cd js_new
npm run build
npm start

# Dashboard
cd dashboard
npm run build
npm start
```

## Configuration Files

### System Configuration
- `js_new/config/app_config.yaml` - System settings
- `js_new/config/devices.yaml` - Device definitions

### Dashboard Configuration
- `js_new/dashboard/.env.local` - Environment variables (create from `.env.local.example`)

## Next Steps

1. ✅ Start backend in offline mode
2. ✅ Start dashboard
3. ✅ Access http://localhost:3000
4. 📝 Configure devices in `config/devices.yaml`
5. 🔌 Connect RS-485 adapter
6. 🚀 Run in full mode: `node start.js`

## Getting Help

- **Backend Documentation:** `js_new/README.md`
- **Dashboard Documentation:** `js_new/dashboard/README.md`
- **Migration Status:** `js_new/PROJECT_STATUS.md`
- **Help Command:** `node start.js --help`

## Common Commands Quick Reference

```bash
# Start everything (offline mode)
cd js_new
node start.js --offline          # Terminal 1
node start-dashboard.js          # Terminal 2

# Check health
curl http://localhost:8090/health

# View logs
tail -f logs/edge-gateway.log

# Stop everything
# Press Ctrl+C in both terminals
```

---

**Date:** 2026-01-22
**Version:** 1.0.0
**Status:** ✅ Ready for Use
