# Quick Start Guide - EDGE Gateway (Node.js)

## Prerequisites

- **Node.js** >= 18.0.0
- **npm** >= 9.0.0
- **RS-485 USB adapter** (for real devices)
- **Git** (for version control)

## Installation

### 1. Navigate to Project Directory

```bash
cd js_new
```

### 2. Install Dependencies

```bash
npm install
```

This will install all required packages (~48 dependencies).

### 3. Create Configuration Files

#### Create `config/` directory:

```bash
mkdir -p config config/secrets storage data logs
```

#### Create `config/app_config.yaml`:

```yaml
system:
  environment: development
  log_level: debug
  offline_mode: true  # Set to true for testing without hardware

rs485:
  port: /dev/ttyUSB0  # Change to your serial port
  baudrate: 9600
  timeout: 5000

modbus_tcp:
  port: 5023
  timeout: 3000
  max_connections: 10

database:
  file: storage/edge_data.db
  commands_db: data/edge_commands.db
  journal_mode: WAL
  synchronous: NORMAL
  timeout: 5000

polling:
  timeout: 30000
  max_retries: 3
  backoff_factor: 10
  backoff_max: 60

services:
  telegram_enabled: false  # Set to true when ready
  websocket_enabled: true
  mqtt_enabled: false
  websocket_port: 8000
```

#### Create `config/devices.yaml`:

```yaml
devices:
  - device_id: 1
    device_type: KUB-1063
    slave_id: 2
    name: "Test Device"
    description: "Poultry climate controller"
    enabled: true
    location: "Test Farm"
    room: "Barn 1"
    poll_interval: 20  # seconds
    priority: HIGH
```

### 4. Build the Project

```bash
npm run build
```

This compiles TypeScript to JavaScript in the `dist/` folder.

### 5. Run in Development Mode

```bash
npm run dev
```

Or run the built version:

```bash
npm start
```

## Configuration

### Environment Variables (Optional)

Create `.env` file (copy from `.env.example`):

```bash
cp .env.example .env
```

Edit `.env`:

```env
# Serial Port
SERIAL_PORT=/dev/ttyUSB0
SERIAL_BAUDRATE=9600

# Services
TELEGRAM_ENABLED=false
WEBSOCKET_ENABLED=true

# Database
DB_PATH=storage/edge_data.db
```

Environment variables override values in YAML config files.

## Testing Without Hardware

### Use Offline Mode

Set in `config/app_config.yaml`:

```yaml
system:
  offline_mode: true
```

### Use Modbus Simulator (TODO)

Python simulator still available:

```bash
cd ../edge_clear_py
python tools/simulators/rtu_bus_sim.py
```

## Verifying Installation

### 1. Check Build

```bash
npm run build
```

Should complete without errors.

### 2. Check Linting

```bash
npm run lint
```

### 3. Run Tests (when available)

```bash
npm test
```

## Common Issues

### Serial Port Access Denied

**Linux:**
```bash
sudo usermod -a -G dialout $USER
# Log out and back in
```

**macOS:**
```bash
ls /dev/tty.usbserial-*
# Use the listed port in config
```

**Windows:**
```
Check Device Manager for COM port number
Use "COM3", "COM4", etc. in config
```

### Database Locked

```bash
# Clear WAL checkpoint
sqlite3 storage/edge_data.db "PRAGMA wal_checkpoint(TRUNCATE);"
```

### TypeScript Errors

```bash
# Clean and rebuild
npm run clean
npm run build
```

### Module Not Found

```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

## Project Structure

```
js_new/
├── src/                    # TypeScript source code
│   ├── core/              # Core application logic
│   │   ├── config/        # Configuration management
│   │   ├── device_adapters/ # Device-specific adapters
│   │   └── utils/         # Utilities (logging, etc.)
│   ├── modbus/            # Modbus protocol implementation
│   │   └── protocol/      # Low-level protocol
│   ├── types/             # TypeScript type definitions
│   └── index.ts           # Main entry point
├── config/                # Configuration files (create manually)
│   ├── app_config.yaml
│   ├── devices.yaml
│   └── secrets/           # Encrypted secrets
├── storage/               # SQLite databases (auto-created)
├── dist/                  # Compiled JavaScript (after build)
├── logs/                  # Log files (auto-created)
└── package.json           # Dependencies and scripts
```

## Available Scripts

```bash
npm run build       # Compile TypeScript
npm run dev         # Run in watch mode (auto-reload)
npm start           # Run compiled version
npm test            # Run tests
npm run lint        # Check code style
npm run format      # Format code
npm run clean       # Remove build artifacts
```

## Next Steps

1. ✅ **Install and build** - You should be here now
2. ⏳ **Implement device scheduler** - Connect devices to polling system
3. ⏳ **Add Telegram bot** - Remote monitoring
4. ⏳ **Add WebSocket server** - Real-time data
5. ⏳ **Production deployment** - systemd service, monitoring

## Getting Help

- **README.md** - Full documentation
- **MIGRATION_STATUS.md** - Migration progress
- **Python version** - See `../edge_clear_py/` for reference
- **Issues** - Report bugs on GitHub

## Development Workflow

### 1. Make Changes

Edit files in `src/`:

```typescript
// src/core/new-feature.ts
export class NewFeature {
  // Your code here
}
```

### 2. Build and Test

```bash
npm run build
npm start
```

### 3. Watch Mode (Recommended)

```bash
npm run dev  # Auto-rebuilds on file changes
```

### 4. Commit Changes

```bash
git add .
git commit -m "Add new feature"
```

## Configuration Examples

### Multiple Devices

`config/devices.yaml`:

```yaml
devices:
  - device_id: 1
    device_type: KUB-1063
    slave_id: 2
    name: "Barn 1 Climate"
    enabled: true
    priority: CRITICAL
    poll_interval: 15

  - device_id: 2
    device_type: KUB-1063
    slave_id: 3
    name: "Barn 2 Climate"
    enabled: true
    priority: HIGH
    poll_interval: 20

  - device_id: 3
    device_type: VFD-INVERTER
    slave_id: 10
    name: "Exhaust Fan VFD"
    enabled: true
    priority: NORMAL
    poll_interval: 30
```

### Production Settings

`config/app_config.yaml`:

```yaml
system:
  environment: production
  log_level: info
  offline_mode: false

rs485:
  port: /dev/ttyUSB0
  baudrate: 9600

database:
  journal_mode: WAL
  synchronous: FULL  # More data safety

polling:
  max_retries: 5
  backoff_max: 120

services:
  telegram_enabled: true
  websocket_enabled: true
  mqtt_enabled: true
```

## Monitoring

### View Logs

```bash
tail -f logs/edge-gateway.log
```

### Check Database

```bash
sqlite3 storage/edge_data.db

# SQL commands:
.tables
SELECT * FROM device_data LIMIT 10;
SELECT COUNT(*) FROM commands WHERE status='pending';
```

### Health Check (when API is implemented)

```bash
curl http://localhost:8090/health
```

## Production Deployment

### Using PM2

```bash
npm install -g pm2

# Start
pm2 start dist/index.js --name edge-gateway

# Monitor
pm2 logs edge-gateway
pm2 monit

# Auto-start on boot
pm2 startup
pm2 save
```

### Using systemd

Create `/etc/systemd/system/edge-gateway.service`:

```ini
[Unit]
Description=EDGE Industrial IoT Gateway
After=network.target

[Service]
Type=simple
User=edge
WorkingDirectory=/opt/edge-gateway/js_new
ExecStart=/usr/bin/node dist/index.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl enable edge-gateway
sudo systemctl start edge-gateway
sudo systemctl status edge-gateway
```

## Resources

- **Node.js Docs**: https://nodejs.org/docs
- **TypeScript**: https://www.typescriptlang.org/docs
- **Modbus Protocol**: https://www.modbus.org/specs.php
- **Better-SQLite3**: https://github.com/WiseLibs/better-sqlite3

## Support

For issues or questions:
- Check `README.md` for detailed docs
- See `MIGRATION_STATUS.md` for known issues
- Compare with Python version in `../edge_clear_py/`

---

**Ready to Go! 🚀**

You should now have a working development environment. Start implementing the remaining features based on the migration roadmap.
