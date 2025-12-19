# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

EDGE is an industrial IoT gateway for monitoring and controlling industrial equipment (КУБ-1063, КУБ-1112, VFD inverters) via RS-485/Modbus RTU/TCP protocols. It's designed as a standalone edge node that collects real-time data, publishes events via WebSocket/MQTT, provides Telegram bot control, and auto-registers with central SERVER infrastructure.

**Key Architecture Principles:**
- **Real-time RS-485 data collection** via Universal Modbus Reader with queue-based architecture
- **Device Adapter Pattern** for protocol abstraction (each device type has its own adapter)
- **Scheduler-driven polling** with priority-based device scheduling
- **Fault-tolerant design** with circuit breaker, reconnect logic, and error backoff
- **Offline-first capability** - can operate without central server connection
- **Security-focused** - encrypted secrets, MITM protection, no tokens in logs

## Essential Commands

### Installation & Setup
```bash
# Install package in development mode
make install              # pip install -e .

# Initial setup (creates master.key, encrypts secrets)
python tools/first_start.py

# Copy example configs
cp -R config.example config
```

### Running Services
```bash
# Main gateway (all services enabled by default)
make run                  # or: edge
edge --log-level DEBUG    # with verbose logging

# Selective service control
edge --disable-telegram   # without Telegram bot
edge --disable-mqtt       # without MQTT publishing
edge --offline            # autonomous mode (no SERVER connection)

# Web dashboard (Streamlit UI)
make run-dashboard        # or: python start_dashboard.py

# Full edge node with RS-485 (legacy script)
python start_edge.py --rs485-port /dev/ttyUSB0 --offline
```

### Development & Testing
```bash
# Run tests
make run-tests            # pytest -q

# Linting/formatting
make lint                 # ruff check
make fmt                  # ruff format

# RTU bus simulator (for testing without hardware)
python tools/simulators/rtu_bus_sim.py --kub 1-6 --vfd 7-44
# Returns PTY path like /dev/ttys027, use with:
python start_edge.py --rs485-port /dev/ttys027 --autoscan --scan-start 1 --scan-end 44
```

### Security & Secrets Management
```bash
# Set master password (required before setting secrets)
python tools/security_cli.py set-master-password

# Telegram bot configuration
python tools/telegram_secrets_cli.py show
python tools/telegram_secrets_cli.py set-token <BOT_TOKEN>
python tools/telegram_secrets_cli.py set-admins 111111111,222222222
python tools/telegram_secrets_cli.py add-admin 333333333

# EDGE Ping Service (server registration)
python tools/edge_ping_secrets_cli.py set-servers https://server.com/api/edge/ping
python tools/edge_ping_secrets_cli.py set-auth-token <TOKEN>
```

### Device Management
```bash
# Scan for Modbus devices on bus
python tools/scan_rtu_bus.py --port /dev/ttyUSB0 --start 1 --end 50

# Device configuration is in config/app_config.yaml and config/devices*.yaml
```

## Architecture Deep Dive

### Data Flow Pipeline

```
RS-485 Port → UniversalModbusReader → Reader Integration (queues) →
→ DeviceScheduler → Device Adapters (protocol parsing) →
→ modbus_storage (SQLite) → WebSocket/MQTT Publishers + Telegram Bot
```

**Key Components:**

1. **UniversalModbusReader** (`modbus/universal_reader.py`)
   - Low-level serial communication, CRC16 validation
   - Reads raw Modbus RTU frames from RS-485 bus
   - Handles timeouts, reconnection, buffer management

2. **Reader Integration** (`modbus/reader_integration.py`)
   - Queue-based request/response architecture
   - Manages read/write task queues with callbacks
   - Worker thread for serial port access (prevents blocking)
   - Critical: Only ONE thread accesses serial port at a time

3. **DeviceScheduler** (`core/device_scheduler.py`)
   - Priority-based polling (CRITICAL > HIGH > NORMAL > LOW)
   - Per-device configurable poll intervals
   - Backoff on errors, tracks success/failure counters
   - Determines WHEN to poll each device

4. **Device Adapters** (`core/device_adapters/`)
   - Protocol abstraction layer for different equipment types
   - Each adapter defines register maps, scaling factors, alarm parsing
   - Supported types: КУБ-1063, КУБ-1112, VFD-INVERTER
   - New device types added by creating adapter class

5. **DeviceRegistry** (`core/device_registry.py`)
   - Central registry of all devices on the bus
   - Loads from YAML config (`config/devices*.yaml`)
   - Tracks device metadata: slave_id, type, location, room, priority
   - Provides device lookup by ID or slave_id

6. **Command Execution** (`modbus/command_executor.py`, `modbus/command_queue.py`)
   - Queue-based write commands (setpoints, control registers)
   - Verification reads after writes
   - Used by Telegram bot for remote control

### Service Architecture

**EDGEService** (`start.py` line 122-792) orchestrates multiple async services:

- **Device Registry** - device enumeration and metadata
- **WebSocket Server** (`core/publishing/websocket_server.py`) - real-time data push (port 8000)
- **MQTT Publisher** (`core/publishing/mqtt.py`) - event publishing to broker
- **Telegram Bot** (`core/telegram.py`) - remote monitoring/control
- **EDGE Ping Service** (`core/edge_ping_service.py`) - auto-registration with SERVER
- **Health API** (`core/health_api.py`) - system monitoring endpoints (port 8090)
- **Heartbeat Loop** - periodic status updates to SERVER (when online)

Services can be selectively disabled via CLI flags (see `--disable-*` options).

### Configuration System

**Primary config:** `config/app_config.yaml`
- System settings, RS-485 port/baudrate, polling intervals
- Loaded via `core/config_manager.py`

**Device configs:** `config/devices*.yaml`
- Per-device definitions with metadata
- Schema: device_id, device_type, slave_id, name, poll_interval, priority, location, room

**Encrypted secrets:** `config/secrets/*.enc`
- Telegram tokens, admin lists, EDGE auth tokens
- Encrypted with master.key (never committed to git)
- Access via `core/security_manager.py`

### Important Design Patterns

**Thread Safety:**
- Serial port access is ONLY from reader worker thread
- All RS-485 reads go through queue (`_read_queue` in reader_integration.py)
- Callbacks execute on worker thread - keep them fast

**Error Handling:**
- Circuit Breaker pattern in `core/error_handler.py`
- Backoff strategy: error_count → exponential delay (max backoff_max)
- Connection status tracked: "connected", "partial", "error", "disconnected"

**Offline Mode:**
- Automatically activates if SERVER authentication fails
- Disables EDGE Ping Service and Heartbeat
- All local services (WebSocket, Telegram, MQTT) continue working
- Enable explicitly with `--offline` flag or `EDGE_OFFLINE_MODE=true`

**Shutdown Handling:**
- Global `shutdown_requested` threading.Event
- Async tasks canceled gracefully with timeout
- Serial port cleanup with platform-specific handling (macOS needs delays)

## Common Development Workflows

### Adding a New Device Type

1. Create adapter in `core/device_adapters/new_device.py`:
   ```python
   from core.device_adapters.base import BaseDeviceAdapter, RegisterDefinition

   class NewDeviceAdapter(BaseDeviceAdapter):
       DEVICE_NAME = "NEW-DEVICE"
       REGISTERS = [
           RegisterDefinition(name="param1", address=0x0000, ...),
       ]
   ```

2. Register in `core/device_adapters/catalog.py`:
   ```python
   DEVICE_DEFINITIONS.append(DeviceDefinition(
       type="NEW-DEVICE",
       adapter_module="core.device_adapters.new_device",
       adapter_class="NewDeviceAdapter"
   ))
   ```

3. Add device to `config/devices.yaml`:
   ```yaml
   devices:
     - device_id: 100
       device_type: "NEW-DEVICE"
       slave_id: 10
       name: "Test Device"
       poll_interval: 5.0
       priority: "NORMAL"
   ```

4. Restart EDGE - DeviceRegistry will auto-load the new device

### Debugging RS-485 Communication

1. Enable debug logging: `edge --log-level DEBUG`
2. Check logs for frame-level details:
   - `📤 Отправка` - outgoing Modbus request
   - `📥 Получено` - incoming response
   - `✅ CRC проверка успешна` - valid frame
   - `❌ CRC ошибка` - corrupted frame
3. Use `reader.log` for detailed trace (if enabled)
4. Verify with simulator: `python tools/simulators/rtu_bus_sim.py`

### Testing Without Hardware

Use the RTU bus simulator which creates virtual serial port (PTY):

```bash
# Terminal 1: Start simulator
python tools/simulators/rtu_bus_sim.py --kub 1-3 --vfd 4-10
# Note the PTY path (e.g., /dev/ttys027)

# Terminal 2: Run EDGE with simulator port
python start_edge.py --rs485-port /dev/ttys027 --autoscan --scan-start 1 --scan-end 10

# Terminal 3: Monitor logs
tail -f logs/edge.log
```

Simulator responds to Modbus requests with realistic data for КУБ-1063, КУБ-1112, and VFD devices.

### Modifying Polling Behavior

**Per-device interval:**
```yaml
# config/devices.yaml
devices:
  - device_id: 1
    poll_interval: 2.0  # Poll every 2 seconds
    priority: "HIGH"    # Higher priority in scheduler
```

**Global defaults:**
```yaml
# config/app_config.yaml
polling:
  default_intervals:
    KUB_1063: 5.0
    VFD_INVERTER: 3.0
  timeout: 6.0
  max_retries: 3
  backoff_factor: 2.0
  backoff_max: 60.0
```

Scheduler respects priorities: CRITICAL polled before LOW even if LOW is "due" first.

## Critical Files Reference

- **Entry point:** `start.py` - main service orchestration, CLI interface
- **RS-485 core:** `modbus/universal_reader.py` - low-level serial communication
- **Queue layer:** `modbus/reader_integration.py` - thread-safe request queuing
- **Scheduling:** `core/device_scheduler.py` - intelligent polling logic
- **Device abstraction:** `core/device_adapters/` - protocol parsers
- **Storage:** `modbus/modbus_storage.py` - SQLite persistence
- **Config:** `core/config_manager.py` - YAML config loader
- **Security:** `core/security_manager.py` - secret encryption/decryption

## Environment Variables

```bash
# Core settings
EDGE_OFFLINE_MODE=true           # Force offline mode
EDGE_API_KEY=<key>               # SERVER authentication
EDGE_DEVICE_ID=edge-001          # Unique node identifier
EDGE_FARM_ID=farm-123            # Farm/site grouping

# RS-485 polling
EDGE_POLL_TIMEOUT=6.0            # Read timeout (seconds)
EDGE_POLL_MAX_RETRIES=3          # Retry attempts before backoff

# Telegram (alternative to encrypted config)
TELEGRAM_BOT_TOKEN=<token>       # Bot token
TELEGRAM_ADMIN_USERS=111,222     # Comma-separated user IDs
TELEGRAM_ENV_OVERRIDE=true       # Prefer env over encrypted config

# MQTT publishing
MQTT_BROKER_HOST=localhost
MQTT_BROKER_PORT=1883
MQTT_TOPIC_PREFIX=cube_rs

# Health API security
EDGE_HEALTH_TOKEN=secret         # Optional token for /health endpoints
EDGE_REQUIRE_HEALTH_TOKEN=true   # Enforce token validation

# Discovery
EDGE_SCAN_ON_START=true          # Auto-scan devices on startup
EDGE_SCAN_RANGE=1-50             # Scan range for auto-discovery
```

## Network Endpoints

- **Health API:** `http://localhost:8090/health` - system status
- **Metrics:** `http://localhost:8090/metrics` - CPU/RAM/disk stats
- **Errors:** `http://localhost:8090/errors` - error statistics
- **WebSocket:** `ws://localhost:8000` - real-time device data stream
- **Dashboard:** `http://localhost:8501` - Streamlit web interface

## Database Schema

**SQLite files:**
- `storage/kub_data.db` - device readings, timestamps, connection status
- `data/kub_commands.db` - command queue, Telegram user registry

Access via `modbus/modbus_storage.py` helpers (`read_data`, `update_data`, `read_registers_latest`).

## Testing Strategy

- **Unit tests:** Test individual adapters, parsers, CRC functions
- **Integration tests:** Test with simulator (`rtu_bus_sim.py`)
- **Manual verification:** Use `tools/scan_rtu_bus.py` to validate register reads
- **Emulator:** `tests/device_network_emulator.py` for full system simulation

## Troubleshooting Common Issues

**"Device Registry недоступен":**
- Check `config/app_config.yaml` and `config/devices*.yaml` exist
- Verify RS-485 port: `ls -la /dev/ttyUSB*` or `/dev/tty.usbserial*`

**"Telegram bot недоступен":**
- Run: `python tools/telegram_secrets_cli.py show`
- Verify token is set and valid

**"Universal Reader не готов":**
- Serial port may be locked by another process: `lsof | grep ttyUSB`
- Check permissions: user must be in `dialout` group (Linux)
- macOS: ensure port isn't held by other terminal sessions

**Slow polling / timeouts:**
- Increase `timeout` in `config/app_config.yaml` → `rs485.timeout`
- Reduce number of devices or increase `poll_interval`
- Check for failing devices causing backoff delays

**CRC errors:**
- Physical issues: bad wiring, termination resistors, EMI
- Baudrate mismatch: verify all devices use same baudrate
- Enable frame logging: `--log-level DEBUG` and inspect hex dumps

## Code Style Guidelines

All new code should include:
- File-level docstring with description and author
- Function/method docstrings explaining purpose, args, returns
- Type hints where possible (Python 3.10+ syntax)
- Logging at appropriate levels (DEBUG for frames, INFO for events, ERROR for failures)
- Error handling with try/except, never let exceptions propagate to worker threads
- Thread safety considerations (document if code touches shared state)

Example header:
```python
#!/usr/bin/env python3
"""
file: modbus/new_module.py
description: Short description of module purpose
author: EDGE Full-Stack RS485 Senior Engineer
"""
```

## Resources

- **User Guide:** `docs/USER_GUIDE.md` - operator instructions for dashboard/bot
- **Config Examples:** `config.example/` - template configurations
- **Simulator Docs:** `tools/simulators/README.md` - testing with virtual devices
- **Tests:** `tests/README.md` - test suite documentation
