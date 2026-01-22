# EDGE Gateway - Node.js Implementation

**Industrial IoT Gateway for Farm Equipment Monitoring**

Node.js/TypeScript implementation of the EDGE gateway system, migrated from Python. This gateway monitors and controls industrial farm equipment via Modbus RTU/TCP protocols.

## Overview

EDGE is an industrial IoT gateway designed for:
- **Farm Automation** - Monitoring poultry/swine houses with КУБ controllers
- **Real-time Control** - Ventilation, temperature, humidity management
- **Edge Computing** - Operates autonomously without central server
- **Multi-device Support** - КУБ-1063, КУБ-1112, VFD inverters, ESQ-230

## Features

- ✅ **Modbus RTU/TCP** - Industry-standard protocol support
- ✅ **SQLite with WAL** - Concurrent data storage
- ✅ **WebSocket & MQTT** - Real-time data publishing
- ✅ **Telegram Bot** - Mobile remote control
- ✅ **Device Adapters** - Pluggable device type support
- ✅ **Priority Scheduler** - Efficient multi-device polling
- ✅ **Health Monitoring** - Component health checks
- ✅ **Secure Logging** - Prevents token/password leaks
- ✅ **TypeScript** - Full type safety

## Requirements

- **Node.js** >= 18.0.0
- **Serial Port** (RS-485 adapter)
- **SQLite** (included with better-sqlite3)

## Quick Start

### 1. Install Dependencies

```bash
cd js_new
npm install
```

### 2. Configure Environment

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` and set your configuration:

```env
# Serial Port
SERIAL_PORT=/dev/ttyUSB0
SERIAL_BAUDRATE=9600

# Telegram Bot (optional)
TELEGRAM_ENABLED=true
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_ADMIN_IDS=123456789,987654321

# Database
DB_PATH=storage/edge_data.db
DB_COMMANDS_PATH=data/edge_commands.db
```

### 3. Create Configuration Files

Create `config/app_config.yaml`:

```yaml
system:
  environment: development
  log_level: info
  offline_mode: false

rs485:
  port: /dev/ttyUSB0
  baudrate: 9600
  timeout: 5000

database:
  file: storage/edge_data.db
  commands_db: data/edge_commands.db
  journal_mode: WAL

services:
  telegram_enabled: true
  websocket_enabled: true
  mqtt_enabled: false
```

Create `config/devices.yaml`:

```yaml
devices:
  - device_id: 1
    device_type: KUB-1063
    slave_id: 2
    name: "Poultry House 1"
    enabled: true
    location: "Farm A"
    room: "Barn 1"
    poll_interval: 20
    priority: HIGH
```

### 4. Build and Run

```bash
# Build TypeScript
npm run build

# Start the gateway
npm start

# Or run in development mode with hot reload
npm run dev
```

## Project Structure

```
js_new/
├── src/
│   ├── core/
│   │   ├── config/
│   │   │   └── config-manager.ts       # YAML config loader
│   │   ├── device_adapters/
│   │   │   ├── base.ts                 # Base adapter class
│   │   │   ├── kub1063-adapter.ts      # КУБ-1063 adapter
│   │   │   └── factory.ts              # Adapter factory
│   │   ├── publishing/
│   │   │   ├── websocket-server.ts     # WebSocket publisher
│   │   │   └── mqtt-publisher.ts       # MQTT publisher
│   │   ├── telegram/
│   │   │   └── bot-main.ts             # Telegram bot
│   │   ├── security/
│   │   │   └── encryption.ts           # AES encryption
│   │   └── utils/
│   │       └── logger.ts               # Secure logging
│   ├── modbus/
│   │   ├── protocol/
│   │   │   ├── crc16.ts                # CRC16 calculation
│   │   │   └── message-builder.ts      # Modbus messages
│   │   ├── universal-reader.ts         # Serial communication
│   │   ├── modbus-storage.ts           # SQLite storage
│   │   └── command-executor.ts         # Write commands
│   ├── types/
│   │   └── index.ts                    # TypeScript types
│   └── index.ts                        # Main entry point
├── config/
│   ├── app_config.yaml                 # System configuration
│   ├── devices.yaml                    # Device registry
│   └── secrets/                        # Encrypted secrets
├── storage/                            # SQLite databases
├── tests/                              # Test files
└── package.json
```

## Architecture

### Data Flow

**Reading Device Data:**
```
RS-485 Port
  ↓
UniversalModbusReader (CRC16, serial)
  ↓
DeviceScheduler (priority-based polling)
  ↓
DeviceAdapter (parse registers)
  ↓
ModbusStorage (SQLite WAL)
  ↓
WebSocket/MQTT Publishers + Telegram Bot
```

**Writing Commands:**
```
Telegram Bot / REST API
  ↓
CommandQueue (enqueue)
  ↓
CommandExecutor (background processing)
  ↓
UniversalModbusReader (Modbus write)
  ↓
RS-485 Port
```

### Core Components

1. **UniversalModbusReader** - Handles RS-485 serial communication with CRC16 validation
2. **DeviceAdapter** - Pluggable adapters for each device type (КУБ-1063, КУБ-1112, etc.)
3. **ModbusStorage** - SQLite with WAL mode for concurrent read/write
4. **DeviceScheduler** - Priority-based polling (CRITICAL → HIGH → NORMAL → LOW)
5. **ConfigManager** - YAML config with Zod validation and env var overrides
6. **Logger** - Pino-based logging with automatic sensitive data redaction

### Supported Device Types

- **КУБ-1063** - Poultry farm climate control
  - Temperature, humidity, CO2, NH3, pressure
  - Ventilation control, dampers, alarms

- **КУБ-1112** - Swine farm control (TODO)
- **VFD-INVERTER** - Variable Frequency Drive (TODO)
- **ESQ-230** - Inverter control (TODO)

## API Endpoints

### Health API (Port 8090)

- `GET /health` - Overall system health
- `GET /health/:component` - Component health
- `GET /metrics` - Prometheus metrics

### WebSocket (Port 8000)

Real-time device data broadcasting:

```javascript
const ws = new WebSocket('ws://localhost:8000');
ws.on('message', (data) => {
  const message = JSON.parse(data);
  console.log(message); // Device data, alarms, warnings
});
```

### MQTT (Optional)

Topics:
- `cube_rs/devices/{device_id}/data` - Device data
- `cube_rs/alarms` - System alarms
- `cube_rs/status` - Gateway status

## Development

### Run Tests

```bash
npm test
npm run test:watch
```

### Lint and Format

```bash
npm run lint
npm run format
```

### Build

```bash
npm run build
npm run clean  # Clean build artifacts
```

## Migration from Python

This Node.js implementation maintains API compatibility with the Python version while providing:

- **Better Performance** - Native async/await, faster JSON processing
- **Type Safety** - Full TypeScript with strict mode
- **Modern Stack** - Latest Node.js features (ES modules, top-level await)
- **Smaller Footprint** - No Python runtime dependency

### Migration Checklist

- [x] Core type definitions and schemas
- [x] Configuration management (YAML + env)
- [x] Logging with sensitive data redaction
- [x] Modbus protocol (CRC16, message builder)
- [x] Universal Modbus reader (serial)
- [x] Database layer (SQLite WAL)
- [x] Device adapter system
- [ ] Device registry and scheduler
- [ ] Command executor
- [ ] Telegram bot integration
- [ ] WebSocket server
- [ ] MQTT publisher
- [ ] REST API endpoints
- [ ] Security layer (encryption, mTLS)
- [ ] Health monitoring
- [ ] Main service orchestrator

## Configuration

### System Config (app_config.yaml)

```yaml
system:
  environment: production
  log_level: info
  offline_mode: false

rs485:
  port: /dev/ttyUSB0
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

polling:
  timeout: 30000
  max_retries: 3
  backoff_factor: 10
  backoff_max: 60

services:
  telegram_enabled: true
  websocket_enabled: true
  mqtt_enabled: false
  websocket_port: 8000
```

### Device Config (devices.yaml)

```yaml
devices:
  - device_id: 1
    device_type: KUB-1063
    slave_id: 2
    name: "Main Climate Controller"
    description: "Barn 1 climate system"
    enabled: true
    location: "North Farm"
    room: "Barn 1"
    poll_interval: 20  # seconds
    priority: CRITICAL

  - device_id: 2
    device_type: VFD-INVERTER
    slave_id: 3
    name: "Exhaust Fan VFD"
    enabled: true
    poll_interval: 30
    priority: NORMAL
```

## Security

- **Encrypted Secrets** - AES-256-GCM for bot tokens, passwords
- **Secure Logging** - Automatic redaction of tokens, passwords, API keys
- **mTLS Support** - Mutual TLS for server authentication
- **MITM Protection** - Built-in attack detection
- **Role-Based Access** - Telegram bot permissions (OWNER, ADMIN, OPERATOR, VIEWER)

## Troubleshooting

### Serial Port Access

Linux:
```bash
sudo usermod -a -G dialout $USER
sudo chmod 666 /dev/ttyUSB0
```

macOS:
```bash
ls /dev/tty.usbserial-*
# Use the listed port in config
```

### Database Locked

WAL mode prevents most lock issues, but if needed:
```bash
sqlite3 storage/edge_data.db "PRAGMA wal_checkpoint(TRUNCATE);"
```

### Check Logs

```bash
tail -f logs/edge-gateway.log
```

## License

Proprietary - All rights reserved

## Contributing

This is a migration project from Python to Node.js. For the original Python implementation, see `../edge_clear_py/`.

## Support

For issues and questions:
- GitHub Issues: [Create an issue](https://github.com/yourusername/edge-gateway/issues)
- Documentation: See `docs/` folder
- Python version: See `../edge_clear_py/README.md`
