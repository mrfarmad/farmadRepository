# EDGE_js

Node.js port of the EDGE industrial IoT stack. This scaffold mirrors the Python project layout and provides modular services for Modbus, MQTT, WebSocket streaming, Telegram notifications, and health monitoring.

## Getting started

```bash
npm install
node start.js
```

Environment variables can be set in `.env`. Configuration is loaded from `config/app_config.yaml` and `config/devices.yaml`.
