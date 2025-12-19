# GUI Integration Guide - EDGE Industrial IoT Gateway

**Версия документа:** 1.0
**Дата:** 2025-12-02
**Для:** Разработчиков GUI / Frontend / Интеграторов

---

## Введение

Этот документ описывает **как интегрировать собственный GUI** с EDGE шлюзом для промышленного мониторинга RS-485/Modbus устройств.

EDGE предоставляет **несколько точек интеграции**:
1. **WebSocket** — real-time поток данных устройств
2. **REST API** (Health API) — состояние системы и метрики
3. **SQLite Database** — прямой доступ к данным (read-only)
4. **MQTT Publisher** — публикация событий в broker
5. **Command Queue** — отправка команд устройствам

---

## Содержание

1. [Архитектура EDGE](#архитектура-edge)
2. [WebSocket API](#websocket-api)
3. [REST Health API](#rest-health-api)
4. [Database Schema](#database-schema)
5. [MQTT Integration](#mqtt-integration)
6. [Command Execution](#command-execution)
7. [Примеры интеграции](#примеры-интеграции)
8. [Best Practices](#best-practices)
9. [Troubleshooting](#troubleshooting)
10. [Edge Data API](#edge-data-api)

---

## Архитектура EDGE

### Общая схема

```
┌────────────────────────────────────────────────────────────┐
│                      EDGE Gateway                          │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  ┌──────────────┐      ┌──────────────┐                  │
│  │ RS-485 Port  │─────▶│ Universal    │                  │
│  │ /dev/ttyUSB0 │      │ Modbus Reader│                  │
│  └──────────────┘      └──────┬───────┘                  │
│                               │                           │
│                               ▼                           │
│  ┌────────────────────────────────────────┐              │
│  │      Device Scheduler                  │              │
│  │  (Priority-based polling)              │              │
│  └────────────┬───────────────────────────┘              │
│               │                                           │
│               ▼                                           │
│  ┌────────────────────────────────────────┐              │
│  │     Device Adapters (Protocol)         │              │
│  │  КУБ-1063 | КУБ-1112 | VFD-INVERTER   │              │
│  └────────────┬───────────────────────────┘              │
│               │                                           │
│               ▼                                           │
│  ┌────────────────────────────────────────┐              │
│  │       SQLite Storage                   │              │
│  │    storage/kub_data.db (WAL mode)      │              │
│  └────────────┬───────────────────────────┘              │
│               │                                           │
│        ┌──────┴──────┬──────────┬──────────┐            │
│        │             │          │          │            │
│        ▼             ▼          ▼          ▼            │
│  ┌──────────┐ ┌──────────┐ ┌────────┐ ┌────────┐      │
│  │WebSocket │ │ Health   │ │ MQTT   │ │Telegram│      │
│  │  :8000   │ │   :8090  │ │Publisher│ │  Bot   │      │
│  └──────────┘ └──────────┘ └────────┘ └────────┘      │
│                                                         │
└────────────────────────────────────────────────────────┘
         │              │           │           │
         │              │           │           │
         ▼              ▼           ▼           ▼
    ┌─────────┐   ┌─────────┐ ┌─────────┐ ┌─────────┐
    │Your GUI │   │Monitoring│ │ MQTT    │ │ Mobile  │
    │(Browser)│   │Dashboard │ │Consumers│ │  App    │
    └─────────┘   └─────────┘ └─────────┘ └─────────┘
```

### Ключевые компоненты для интеграции

| Компонент | Порт | Протокол | Назначение |
|-----------|------|----------|------------|
| **WebSocket Server** | 8000 | WebSocket | Real-time данные устройств |
| **Health API** | 8090 | HTTP REST | Системные метрики, health checks |
| **SQLite Database** | — | File | Исторические данные, текущее состояние |
| **MQTT Publisher** | 1883* | MQTT | Pub/Sub события устройств |
| **Command Queue** | — | Database | Очередь команд для устройств |

*Порт MQTT брокера конфигурируется через `MQTT_BROKER_PORT`

---

## WebSocket API

### Подключение

**URL:** `ws://EDGE_HOST:8000`

**Протокол:** JSON messages

### Формат данных

EDGE отправляет данные устройств в JSON формате каждые 10 секунд (конфигурируемо).

#### Структура сообщения (КУБ-1063)

```json
{
  "device_id": 1,
  "device_type": "КУБ-1063",
  "slave_id": 1,
  "timestamp": "2025-12-02T15:30:45.123456",
  "connection_status": "connected",

  "temp_inside": 23.5,
  "temp_outside": -5.2,
  "humidity": 65.3,
  "co2": 850,
  "nh3": 12,
  "pressure": 1013.25,

  "ventilation_level": 45,
  "ventilation_target": 50,
  "heating_level": 30,

  "active_alarms": 0,
  "registered_alarms": 0,
  "active_warnings": 1,
  "warnings": ["HIGH_HUMIDITY"],

  "day_counter": 15,
  "software_version": "2.1.5",
  "device_uid": "A1B2C3D4E5F6"
}
```

#### Структура сообщения (VFD Inverter)

```json
{
  "device_id": 10,
  "device_type": "VFD-INVERTER",
  "slave_id": 10,
  "timestamp": "2025-12-02T15:30:45.123456",
  "connection_status": "connected",

  "running_state": "running",
  "running_frequency": 48.5,
  "running_speed": 1455,
  "output_voltage": 380,
  "output_current": 12.5,
  "output_power": 6.8,

  "motor_temperature": 45,
  "igbt_temperature": 38,

  "fault_code": 0,
  "alarms": []
}
```

#### Connection Status Values

| Значение | Описание |
|----------|----------|
| `connected` | Устройство отвечает, данные актуальные |
| `partial` | Частичный ответ, некоторые регистры недоступны |
| `error` | Ошибка чтения, устройство не отвечает |
| `disconnected` | Устройство отключено |

### Клиентские команды

#### Запрос текущих данных

```json
{
  "cmd": "get"
}
```

**Ответ:** Немедленная отправка последних данных всех устройств.

#### Подписка на устройство

```json
{
  "cmd": "subscribe",
  "device_id": 1
}
```

**Ответ:** Клиент будет получать только данные указанного устройства.

#### Отписка

```json
{
  "cmd": "unsubscribe"
}
```

**Ответ:** Клиент снова получает данные всех устройств.

### Пример кода (JavaScript)

```javascript
// Подключение к WebSocket
const ws = new WebSocket('ws://edge.local:8000');

ws.onopen = () => {
  console.log('Connected to EDGE WebSocket');

  // Запрос текущих данных
  ws.send(JSON.stringify({ cmd: 'get' }));
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);

  console.log('Device data:', data);

  // Обновление UI
  updateTemperature(data.temp_inside);
  updateHumidity(data.humidity);
  updateAlarms(data.alarms);
};

ws.onerror = (error) => {
  console.error('WebSocket error:', error);
};

ws.onclose = () => {
  console.log('Disconnected from EDGE');
  // Переподключение через 5 секунд
  setTimeout(() => location.reload(), 5000);
};
```

### Пример кода (Python)

```python
import asyncio
import websockets
import json

async def connect_to_edge():
    uri = "ws://edge.local:8000"

    async with websockets.connect(uri) as websocket:
        print("Connected to EDGE")

        # Запрос данных
        await websocket.send(json.dumps({"cmd": "get"}))

        # Получение данных
        while True:
            message = await websocket.recv()
            data = json.loads(message)

            print(f"Device {data['device_id']}: "
                  f"Temp={data.get('temp_inside')}°C, "
                  f"Status={data['connection_status']}")

asyncio.run(connect_to_edge())
```

---

## REST Health API

**Base URL:** `http://EDGE_HOST:8090`

### Endpoints

#### GET /health

Общее состояние системы.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-12-02T15:30:45.123456",
  "uptime_seconds": 86400,
  "health_percentage": 95.5,
  "components": {
    "total": 6,
    "healthy": 6,
    "degraded": 0,
    "unhealthy": 0
  },
  "checks": [
    {
      "service_name": "database",
      "status": "healthy",
      "details": "Tables: 5, Size: 12.3MB, WAL: true",
      "response_time_ms": 5.2
    },
    {
      "service_name": "modbus_client",
      "status": "healthy",
      "details": "Processes: 1, Active connections: 3",
      "response_time_ms": 10.1
    }
  ],
  "system_metrics": {
    "cpu_percent": 15.2,
    "memory_percent": 45.8,
    "disk_percent": 32.1,
    "uptime_seconds": 86400,
    "process_count": 127,
    "load_average": [0.5, 0.6, 0.7]
  }
}
```

**Status values:**
- `healthy` — все компоненты работают
- `degraded` — некоторые компоненты в деградированном состоянии
- `unhealthy` — критические ошибки

#### GET /health/{component}

Состояние конкретного компонента.

**Components:**
- `database`
- `modbus_client`
- `telegram_bot`
- `api_gateway`
- `system`
- `network`

**Example:**
```bash
curl http://edge.local:8090/health/database
```

**Response:**
```json
{
  "service_name": "database",
  "status": "healthy",
  "details": "Tables: 5, Size: 12.3MB, WAL: true",
  "response_time_ms": 5.2,
  "timestamp": "2025-12-02T15:30:45.123456"
}
```

#### GET /metrics

Системные метрики (совместимо с Prometheus).

**Response:**
```json
{
  "cpu_percent": 15.2,
  "memory_percent": 45.8,
  "memory_used_mb": 512,
  "memory_total_mb": 1024,
  "disk_percent": 32.1,
  "disk_used_gb": 10.5,
  "disk_total_gb": 32.0,
  "uptime_seconds": 86400,
  "process_count": 127,
  "load_average": [0.5, 0.6, 0.7],
  "network": {
    "tcp_connections": 15,
    "listening_ports": [8000, 8090, 8501]
  }
}
```

#### GET /errors

Статистика ошибок.

**Response:**
```json
{
  "total_errors": 5,
  "recent_errors": 2,
  "error_counts": {
    "modbus_client:ModbusError": 3,
    "device_registry:ConnectionError": 2
  },
  "circuit_breakers": {
    "modbus_client:ModbusError": {
      "failures": 0,
      "state": "closed"
    }
  },
  "errors_by_severity": {
    "low": 0,
    "medium": 2,
    "high": 0,
    "critical": 0
  },
  "errors_by_category": {
    "modbus": 3,
    "network": 2,
    "database": 0
  }
}
```

### Пример кода (JavaScript)

```javascript
async function checkEDGEHealth() {
  const response = await fetch('http://edge.local:8090/health');
  const health = await response.json();

  if (health.status === 'healthy') {
    console.log('✅ EDGE is healthy');
    console.log(`Uptime: ${health.uptime_seconds}s`);
    console.log(`CPU: ${health.system_metrics.cpu_percent}%`);
  } else {
    console.warn('⚠️ EDGE has issues:', health.critical_issues);
  }
}

// Проверка каждые 30 секунд
setInterval(checkEDGEHealth, 30000);
```

---

## Database Schema

### Прямой доступ к SQLite

**Файл:** `storage/kub_data.db`
**Режим:** WAL (Write-Ahead Logging)
**Рекомендация:** Read-only доступ из GUI

### Таблица: latest_data

Текущие данные всех устройств (одна строка на устройство).

**Schema:**
```sql
CREATE TABLE latest_data (
    device_id INTEGER PRIMARY KEY,
    slave_id INTEGER,
    device_type TEXT,
    connection_status TEXT,
    last_error TEXT,
    updated_at TEXT,

    -- Sensor readings (КУБ-1063)
    temp_inside REAL,
    temp_outside REAL,
    humidity REAL,
    co2 INTEGER,
    nh3 INTEGER,
    pressure REAL,

    -- Control values
    ventilation_level INTEGER,
    heating_level INTEGER,

    -- Alarms/Warnings
    active_alarms INTEGER,
    registered_alarms INTEGER,
    active_warnings INTEGER,

    -- VFD fields (for inverters)
    running_frequency REAL,
    running_speed INTEGER,
    output_current REAL,
    output_power REAL,
    motor_temperature INTEGER,

    -- JSON blob для дополнительных полей
    registers TEXT  -- JSON: {"field_name": value, ...}
);
```

### Таблица: device_history

Исторические данные (опционально, если включен history logging).

**Schema:**
```sql
CREATE TABLE device_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id INTEGER,
    timestamp TEXT,
    temp_inside REAL,
    humidity REAL,
    co2 INTEGER,
    alarms TEXT,  -- JSON array
    FOREIGN KEY (device_id) REFERENCES latest_data(device_id)
);
CREATE INDEX idx_history_device_time ON device_history(device_id, timestamp);
```

### Примеры запросов

#### Получить все устройства

```sql
SELECT
    device_id,
    device_type,
    connection_status,
    temp_inside,
    humidity,
    active_alarms,
    updated_at
FROM latest_data
WHERE connection_status = 'connected'
ORDER BY device_id;
```

#### Устройства с авариями

```sql
SELECT
    device_id,
    device_type,
    active_alarms,
    last_error
FROM latest_data
WHERE active_alarms > 0 OR connection_status = 'error';
```

#### История устройства за последние 24 часа

```sql
SELECT
    timestamp,
    temp_inside,
    humidity,
    co2
FROM device_history
WHERE device_id = 1
  AND timestamp > datetime('now', '-24 hours')
ORDER BY timestamp DESC;
```

### Пример кода (Python)

```python
import sqlite3
from pathlib import Path

DB_PATH = Path('/opt/edge/storage/kub_data.db')

def get_all_devices():
    """Получить данные всех устройств"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row

    cursor = conn.execute("""
        SELECT
            device_id,
            device_type,
            connection_status,
            temp_inside,
            humidity,
            active_alarms,
            updated_at
        FROM latest_data
    """)

    devices = [dict(row) for row in cursor.fetchall()]
    conn.close()

    return devices

# Использование
devices = get_all_devices()
for device in devices:
    print(f"Device {device['device_id']}: "
          f"Temp={device['temp_inside']}°C, "
          f"Status={device['connection_status']}")
```

---

## MQTT Integration

### Конфигурация

EDGE публикует события в MQTT broker (опционально).

**Environment variables:**
```bash
MQTT_BROKER_HOST=localhost
MQTT_BROKER_PORT=1883
MQTT_TOPIC_PREFIX=cube_rs
MQTT_USERNAME=edge_user  # optional
MQTT_PASSWORD=secret     # optional
```

### Топики

#### Данные устройства

**Topic pattern:** `{prefix}/devices/{device_id}/data`

**Example:** `cube_rs/devices/1/data`

**Payload:**
```json
{
  "device_id": 1,
  "timestamp": "2025-12-02T15:30:45.123456",
  "temp_inside": 23.5,
  "humidity": 65.3,
  "connection_status": "connected"
}
```

#### Аварии

**Topic pattern:** `{prefix}/devices/{device_id}/alarms`

**Example:** `cube_rs/devices/1/alarms`

**Payload:**
```json
{
  "device_id": 1,
  "timestamp": "2025-12-02T15:30:45.123456",
  "active_alarms": 1,
  "alarms": ["TEMP_HIGH"],
  "severity": "critical"
}
```

#### Статус системы

**Topic:** `{prefix}/system/status`

**Payload:**
```json
{
  "timestamp": "2025-12-02T15:30:45.123456",
  "status": "healthy",
  "devices_online": 5,
  "devices_total": 6,
  "uptime_seconds": 86400
}
```

### Пример кода (Python - MQTT Subscriber)

```python
import paho.mqtt.client as mqtt
import json

def on_connect(client, userdata, flags, rc):
    print(f"Connected to MQTT broker: {rc}")

    # Подписка на все устройства
    client.subscribe("cube_rs/devices/+/data")
    client.subscribe("cube_rs/devices/+/alarms")

def on_message(client, userdata, msg):
    topic = msg.topic
    payload = json.loads(msg.payload)

    if '/data' in topic:
        device_id = payload['device_id']
        temp = payload.get('temp_inside')
        print(f"Device {device_id}: Temp={temp}°C")

    elif '/alarms' in topic:
        device_id = payload['device_id']
        alarms = payload.get('alarms', [])
        print(f"⚠️ Device {device_id} alarms: {alarms}")

client = mqtt.Client()
client.on_connect = on_connect
client.on_message = on_message

client.connect("edge.local", 1883, 60)
client.loop_forever()
```

---

## Command Execution

### Отправка команд устройствам

EDGE поддерживает отправку команд через **Command Queue** (SQLite database).

### Таблица: write_commands

**Schema:**
```sql
CREATE TABLE write_commands (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id INTEGER,
    slave_id INTEGER,
    register INTEGER NOT NULL,
    value INTEGER NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    executed_at TEXT,
    error TEXT,
    user_info TEXT,
    source TEXT,
    max_attempts INTEGER DEFAULT 3,
    attempts INTEGER DEFAULT 0
);
```

### Status values

- `pending` — команда в очереди
- `executing` — выполняется сейчас
- `completed` — успешно выполнена
- `failed` — ошибка выполнения

### Отправка команды (Python)

```python
import sqlite3
from datetime import datetime

COMMANDS_DB = '/opt/edge/data/kub_commands.db'

def send_command(device_id, register, value, user_info="GUI"):
    """
    Отправить команду устройству

    Args:
        device_id: ID устройства
        register: Адрес регистра (hex)
        value: Значение для записи
        user_info: Информация о пользователе
    """
    conn = sqlite3.connect(COMMANDS_DB)

    cursor = conn.execute("""
        INSERT INTO write_commands
        (device_id, register, value, user_info, source)
        VALUES (?, ?, ?, ?, 'custom_gui')
    """, (device_id, register, value, user_info))

    command_id = cursor.lastrowid
    conn.commit()
    conn.close()

    print(f"✅ Command {command_id} queued for device {device_id}")
    return command_id

# Пример: установить target temperature = 25°C
# Register 0x00D4 (TEMP_TARGET) на КУБ-1063
send_command(
    device_id=1,
    register=0x00D4,
    value=250,  # 25.0°C * 10
    user_info="operator@gui"
)
```

### Проверка статуса команды

```python
def check_command_status(command_id):
    """Проверить статус команды"""
    conn = sqlite3.connect(COMMANDS_DB)
    conn.row_factory = sqlite3.Row

    cursor = conn.execute("""
        SELECT status, executed_at, error
        FROM write_commands
        WHERE id = ?
    """, (command_id,))

    row = cursor.fetchone()
    conn.close()

    if row:
        return dict(row)
    return None

# Использование
status = check_command_status(123)
if status['status'] == 'completed':
    print(f"✅ Command completed at {status['executed_at']}")
elif status['status'] == 'failed':
    print(f"❌ Command failed: {status['error']}")
```

### Важные регистры для записи (КУБ-1063)

| Параметр | Регистр | Формат | Описание |
|----------|---------|--------|----------|
| Target Temperature | 0x00D4 | int16 * 10 | Целевая температура (°C * 10) |
| Ventilation Level | 0x00D1 | uint16 | Уровень вентиляции (0-100%) |
| Ventilation Target | 0x00D0 | uint16 | Целевой уровень вентиляции |
| Heating Level | 0x00E0 | uint16 | Уровень нагрева (0-100%) |

**Пример:**
Установить температуру 23.5°C → записать `235` в регистр `0x00D4`

---

## Примеры интеграции

### React Dashboard

```jsx
import React, { useState, useEffect } from 'react';

function EDGEDashboard() {
  const [devices, setDevices] = useState([]);
  const [ws, setWs] = useState(null);

  useEffect(() => {
    // WebSocket connection
    const websocket = new WebSocket('ws://edge.local:8000');

    websocket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setDevices(prev => {
        const index = prev.findIndex(d => d.device_id === data.device_id);
        if (index >= 0) {
          const updated = [...prev];
          updated[index] = data;
          return updated;
        }
        return [...prev, data];
      });
    };

    setWs(websocket);

    return () => websocket.close();
  }, []);

  return (
    <div>
      <h1>EDGE Device Monitor</h1>
      {devices.map(device => (
        <DeviceCard key={device.device_id} device={device} />
      ))}
    </div>
  );
}

function DeviceCard({ device }) {
  const statusColor = {
    'connected': 'green',
    'error': 'red',
    'disconnected': 'gray'
  }[device.connection_status];

  return (
    <div style={{ border: `2px solid ${statusColor}`, padding: '10px' }}>
      <h3>{device.device_type} #{device.device_id}</h3>
      <p>Temperature: {device.temp_inside}°C</p>
      <p>Humidity: {device.humidity}%</p>
      {device.active_alarms > 0 && (
        <div style={{ color: 'red' }}>
          ⚠️ Alarms: {device.alarms?.join(', ')}
        </div>
      )}
    </div>
  );
}
```

### Vue.js Integration

```vue
<template>
  <div id="edge-monitor">
    <h1>EDGE Monitoring</h1>
    <div v-for="device in devices" :key="device.device_id"
         :class="['device-card', device.connection_status]">
      <h3>{{ device.device_type }} #{{ device.device_id }}</h3>
      <p>Status: {{ device.connection_status }}</p>
      <p>Temperature: {{ device.temp_inside }}°C</p>
      <p>Humidity: {{ device.humidity }}%</p>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      devices: [],
      ws: null
    }
  },
  mounted() {
    this.connectWebSocket();
  },
  methods: {
    connectWebSocket() {
      this.ws = new WebSocket('ws://edge.local:8000');

      this.ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        const index = this.devices.findIndex(d => d.device_id === data.device_id);

        if (index >= 0) {
          this.$set(this.devices, index, data);
        } else {
          this.devices.push(data);
        }
      };
    }
  },
  beforeDestroy() {
    if (this.ws) {
      this.ws.close();
    }
  }
}
</script>

<style scoped>
.device-card {
  border: 2px solid;
  padding: 15px;
  margin: 10px;
}
.device-card.connected { border-color: green; }
.device-card.error { border-color: red; }
</style>
```

### Python Grafana Data Source

```python
from flask import Flask, jsonify, request
import sqlite3
from datetime import datetime, timedelta

app = Flask(__name__)
DB_PATH = '/opt/edge/storage/kub_data.db'

@app.route('/search', methods=['POST'])
def search():
    """Grafana search endpoint - список метрик"""
    return jsonify([
        'temperature',
        'humidity',
        'co2',
        'ventilation_level'
    ])

@app.route('/query', methods=['POST'])
def query():
    """Grafana query endpoint - данные для графиков"""
    data = request.get_json()
    targets = data.get('targets', [])
    time_range = data.get('range', {})

    results = []

    for target in targets:
        metric = target.get('target')
        datapoints = get_metric_data(
            metric,
            time_range.get('from'),
            time_range.get('to')
        )

        results.append({
            'target': metric,
            'datapoints': datapoints
        })

    return jsonify(results)

def get_metric_data(metric, start_time, end_time):
    """Получить данные метрики из БД"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.execute(f"""
        SELECT {metric}, updated_at
        FROM device_history
        WHERE updated_at BETWEEN ? AND ?
        ORDER BY updated_at
    """, (start_time, end_time))

    datapoints = [
        [row[0], int(datetime.fromisoformat(row[1]).timestamp() * 1000)]
        for row in cursor.fetchall()
    ]

    conn.close()
    return datapoints

if __name__ == '__main__':
    app.run(port=5000)
```

---

## Best Practices

### 1. **WebSocket Reconnection**

Всегда реализуйте автоматическое переподключение:

```javascript
function connectWebSocket() {
  const ws = new WebSocket('ws://edge.local:8000');

  ws.onclose = () => {
    console.log('WebSocket closed, reconnecting in 5s...');
    setTimeout(connectWebSocket, 5000);
  };

  ws.onerror = (error) => {
    console.error('WebSocket error:', error);
    ws.close();
  };

  return ws;
}
```

### 2. **Rate Limiting**

Не перегружайте систему частыми запросами:

- **WebSocket:** EDGE шлёт данные каждые 10 секунд
- **REST API:** Не чаще 1 запроса в 5 секунд
- **Command Queue:** Batch commands, не более 10/минуту

### 3. **Error Handling**

Всегда проверяйте `connection_status`:

```javascript
function isDeviceHealthy(device) {
  if (device.connection_status === 'error') {
    console.warn(`Device ${device.device_id} is offline`);
    return false;
  }

  if (device.active_alarms > 0) {
    console.warn(`Device ${device.device_id} has alarms:`, device.alarms);
    return false;
  }

  return true;
}
```

### 4. **Data Validation**

Проверяйте типы данных:

```javascript
function parseDeviceData(raw) {
  return {
    device_id: parseInt(raw.device_id),
    temp_inside: parseFloat(raw.temp_inside) || null,
    humidity: parseFloat(raw.humidity) || null,
    timestamp: new Date(raw.timestamp)
  };
}
```

### 5. **Caching**

Кэшируйте данные локально:

```javascript
class DeviceCache {
  constructor(ttl = 60000) {
    this.cache = new Map();
    this.ttl = ttl;
  }

  set(deviceId, data) {
    this.cache.set(deviceId, {
      data,
      timestamp: Date.now()
    });
  }

  get(deviceId) {
    const entry = this.cache.get(deviceId);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(deviceId);
      return null;
    }

    return entry.data;
  }
}
```

### 6. **Security**

- Используйте HTTPS/WSS в production
- Валидируйте user input перед отправкой команд
- Логируйте все команды с user_info
- Ограничивайте доступ к критичным регистрам

---

## Troubleshooting

### WebSocket не подключается

**Проверки:**
```bash
# 1. EDGE запущен?
systemctl status edge

# 2. Порт открыт?
netstat -tlnp | grep 8000

# 3. Firewall?
sudo ufw allow 8000/tcp

# 4. Логи
tail -f /opt/edge/logs/edge.log | grep WebSocket
```

### Данные не обновляются

**Причины:**
- RS-485 устройства отключены
- Modbus reader упал (проверить `/health`)
- Очередь чтения забита (проверить метрики)

**Диагностика:**
```bash
curl http://edge.local:8090/health/modbus_client
curl http://edge.local:8090/errors
```

### Команды не выполняются

**Проверки:**
```sql
-- Посмотреть failed команды
SELECT * FROM write_commands
WHERE status = 'failed'
ORDER BY created_at DESC
LIMIT 10;

-- Проверить очередь
SELECT COUNT(*) FROM write_commands
WHERE status = 'pending';
```

**Частые проблемы:**
- Неправильный адрес регистра
- Некорректное значение (вне диапазона)
- Устройство не отвечает
- Превышено max_attempts

### Performance Issues

**Оптимизация:**
1. Уменьшить частоту WebSocket broadcast (в коде EDGE)
2. Использовать SQLite read-only режим
3. Добавить индексы в device_history
4. Включить connection pooling

---

## Приложение: Полный пример GUI

### HTML + JavaScript (Minimal Dashboard)

```html
<!DOCTYPE html>
<html>
<head>
    <title>EDGE Monitor</title>
    <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        .device {
            border: 2px solid #ddd;
            border-radius: 5px;
            padding: 15px;
            margin: 10px 0;
        }
        .device.connected { border-color: green; }
        .device.error { border-color: red; }
        .alarm { color: red; font-weight: bold; }
        .value { font-size: 1.2em; margin: 5px 0; }
    </style>
</head>
<body>
    <h1>EDGE Device Monitor</h1>
    <div id="status">Connecting...</div>
    <div id="devices"></div>

    <script>
        let ws;
        const devicesMap = new Map();

        function connect() {
            ws = new WebSocket('ws://localhost:8000');

            ws.onopen = () => {
                document.getElementById('status').textContent = '✅ Connected';
                ws.send(JSON.stringify({ cmd: 'get' }));
            };

            ws.onmessage = (event) => {
                const device = JSON.parse(event.data);
                updateDevice(device);
            };

            ws.onerror = () => {
                document.getElementById('status').textContent = '❌ Connection Error';
            };

            ws.onclose = () => {
                document.getElementById('status').textContent = '🔄 Reconnecting...';
                setTimeout(connect, 5000);
            };
        }

        function updateDevice(device) {
            devicesMap.set(device.device_id, device);
            renderDevices();
        }

        function renderDevices() {
            const container = document.getElementById('devices');
            container.innerHTML = '';

            for (const [id, device] of devicesMap) {
                const div = document.createElement('div');
                div.className = `device ${device.connection_status}`;
                div.innerHTML = `
                    <h3>${device.device_type} #${device.device_id}</h3>
                    <div class="value">🌡️ Temperature: ${device.temp_inside || 'N/A'}°C</div>
                    <div class="value">💧 Humidity: ${device.humidity || 'N/A'}%</div>
                    <div class="value">🌀 CO2: ${device.co2 || 'N/A'} ppm</div>
                    ${device.active_alarms > 0 ?
                        `<div class="alarm">⚠️ Alarms: ${device.alarms?.join(', ')}</div>` : ''}
                    <small>Updated: ${new Date(device.timestamp).toLocaleTimeString()}</small>
                `;
                container.appendChild(div);
            }
        }

        // Start connection
        connect();
    </script>
</body>
</html>
```

---

**Контакты для поддержки:**
- GitHub Issues: https://github.com/YOUR_ORG/edge-gateway/issues
- Documentation: https://docs.edge-gateway.local

**Версия EDGE:** 0.1.0
**Дата обновления:** 2025-12-02
## Edge Data API

Для разработчиков, предпочитающих REST/HTTP, в репозитории есть готовый сервис `core/edge_data_api.py`. Он разворачивает Flask‑приложение и отдаёт те же payload, что описаны в этой инструкции (данные берутся из `storage/kub_data.db`).

**Запуск:**
```bash
python -m core.edge_data_api
# по умолчанию слушает 0.0.0.0:8080, маршруты:
#   GET /api/devices
#   GET /api/devices/status
#   GET /api/device/<id>
#   GET /api/alarms
#   GET /api/health
```

**Особенности:**
- Возвращает “сырые” payload адаптеров: любые новые поля появляются автоматически.
- Использует CORS (см. `security.cors_allowed_origins` в конфиге) для ограничений.
- Может разворачиваться отдельно и/или проксироваться через Tailscale/tunnel system.

Таким образом REST‑клиенты (React, мобильные) могут либо подключаться к WebSocket (описан выше), либо использовать Edge Data API, сохраняя единый контракт.
