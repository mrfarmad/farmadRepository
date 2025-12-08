# EDGE_js

Node.js port of the EDGE industrial IoT stack. This scaffold mirrors the Python project layout and provides modular services for Modbus, MQTT, WebSocket streaming, Telegram notifications, and health monitoring.

## Getting started

```bash
npm install
node start.js
```

Environment variables can be set in `.env`. Configuration is loaded from `config/app_config.yaml` and `config/devices.yaml`.

## Dashboard UI
The React dashboard lives in `dashboard/ui` and runs via Vite:

```bash
cd dashboard/ui
npm install
npm run dev -- --host # defaults to http://localhost:5173
```

Health API (default `http://localhost:8090/health`) and WebSocket stream (`ws://localhost:8000`) are consumed by the UI; adjust endpoints in `dashboard/ui/services/api.js` and `dashboard/ui/services/websocket.js` if needed.
