# EDGE — Промышленный IoT Gateway

[![Python 3.10+](https://img.shields.io/badge/python-3.10+-blue.svg)](https://www.python.org/downloads/)
[![License: Proprietary](https://img.shields.io/badge/license-Proprietary-red.svg)](LICENSE)
[![Code style: ruff](https://img.shields.io/badge/code%20style-ruff-000000.svg)](https://github.com/astral-sh/ruff)

EDGE-узел системы CUBE_RS для мониторинга и управления промышленным оборудованием КУБ-1063 и КУБ-1112 на фермах.

> 📘 **Новый пользователь?** Начните с [QUICKSTART.md](QUICKSTART.md) — пошаговая инструкция на 5 минут!

## 💻 Системные требования

| Компонент | Минимум | Рекомендовано |
|-----------|---------|---------------|
| **Python** | 3.10+ | 3.11+ |
| **ОС** | Linux, macOS, Windows | Linux (Ubuntu 20.04+) |
| **RAM** | 512 MB | 2 GB+ |
| **CPU** | 1 ядро, 1 GHz | 2+ ядра, 2+ GHz |
| **Диск** | 1 GB | 5 GB+ (SSD) |
| **RS-485** | Опционально | USB-RS485 адаптер (или Simulation Mode) |

**Быстрая проверка:** `python tools/validate_setup.py`

📄 Подробнее: [REQUIREMENTS.md](REQUIREMENTS.md)

## 🏗️ Архитектура

EDGE — это автономный промышленный шлюз, который:

- собирает данные с устройств КУБ через Modbus RTU/TCP;
- публикует данные в реальном времени (WebSocket, MQTT);
- предоставляет Telegram-бота для удалённого мониторинга и команд;
- автоматически регистрируется на SERVER через EDGE Ping Service;
- предоставляет веб-интерфейс мониторинга и health-checks.

## 📋 Компоненты системы

### Основные сервисы

- **Device Registry** — управление множественными устройствами;
- **WebSocket Server** — real-time данные (порт `8000`);
- **MQTT Publisher** — публикация в MQTT-брокер;
- **Telegram Bot** — удалённое управление и мониторинг;
- **EDGE Ping Service** — автоматическая регистрация на SERVER;
- **Health API** — мониторинг состояния системы (порт `8090`);
- **Streamlit Dashboard** — веб-интерфейс (порт `8501`).

### Система мониторинга

- **Error Handler** — централизованная обработка ошибок с Circuit Breaker;
- **Health Checker** — мониторинг компонентов и системных ресурсов;
- **Security Manager** — шифрование конфигурации и секретов;
- **MITM Protection** — защита от атак типа «человек-в-середине».

## 🚀 Быстрый запуск

### Для новых пользователей (первый запуск)

```bash
# 1. Клонирование репозитория
git clone https://github.com/MikeVances/EDGE_NODE.git
cd EDGE_NODE

# 2. Установка зависимостей
pip install -e .

# 3. Проверка окружения (опционально)
python tools/validate_setup.py

# 4. Интерактивная настройка
python tools/first_start.py
```

**Мастер `first_start.py` проведёт через:**
- ✅ Проверку Python и зависимостей
- 🎛️ Выбор режима: Real Hardware или Simulation
- 📁 Автоматическую настройку config/
- 🔐 Настройку секретов и Telegram (опционально)
- 🔍 Сканирование RS-485 устройств (опционально)

### Режимы запуска

**С реальным оборудованием (RS-485):**
```bash
python start.py
```

**Без оборудования (Simulation Mode):**
```bash
# Терминал 1: запуск симулятора
python tools/simulators/rtu_bus_sim.py --kub 1-2 --vfd 3-4

# Терминал 2: запуск EDGE
python start.py --offline
```

**Через Makefile:**
```bash
make validate    # проверка окружения
make setup       # запуск wizard
make run         # запуск EDGE
make demo        # demo режим с симуляцией
```

### CLI опции

```bash
edge --help
edge --disable-telegram
edge --offline
edge --log-level DEBUG
```

### Дополнительные сценарии

```bash
# Запуск без отдельных сервисов
edge --disable-telegram --disable-mqtt --disable-edge-ping

# Dashboard
make run-dashboard
python start_dashboard.py

# Работа с RTU BUS-симулятором
python tools/simulators/rtu_bus_sim.py --kub 1-6 --vfd 7-44
python start_edge.py --autoscan --rs485-port /dev/ttys027 --scan-start 1 --scan-end 44
tail -f reader.log
```

## ⚙️ Управление сервисами

| Параметр | Описание | По умолчанию |
|----------|----------|--------------|
| `--disable-telegram` | Отключить Telegram | Включен |
| `--disable-websocket` | Отключить WebSocket | Включен |
| `--disable-mqtt` | Отключить MQTT | Включен |
| `--disable-edge-ping` | Отключить EDGE Ping | Включен |
| `--disable-health-api` | Отключить Health API | Включен |
| `--log-level` | Уровень логирования | INFO |

## 🌐 Сетевые эндпоинты

### Health API (порт `8090`)
- `/health`
- `/health/{component}`
- `/metrics`
- `/errors`

### WebSocket (порт `8000`)
`ws://localhost:8000`

### Dashboard (порт `8501`)
`http://localhost:8501`

### MQTT
- `MQTT_BROKER_HOST`
- `MQTT_BROKER_PORT`
- `MQTT_TOPIC_PREFIX`

## 🔐 Конфигурация безопасности

### Telegram Bot

```bash
python tools/security_cli.py set-master-password
python tools/telegram_secrets_cli.py set-token <token>
python tools/telegram_secrets_cli.py set-admins 111111111,222222222
```

### EDGE Ping

```bash
export EDGE_PING_SERVERS="https://server/api/edge/ping"
python tools/edge_ping_secrets_cli.py set-servers https://server/api/edge/ping
```

## 📊 Конфигурация устройств

```yaml
devices:
  - device_id: "КУБ-1063-001"
    device_type: "КУБ-1063"
    connection:
      type: "modbus_rtu"
      port: "/dev/ttyUSB0"
      baudrate: 9600
      slave_id: 1
```

## 📁 Структура проекта

```
.
├── start.py
├── start_edge.py
├── start_dashboard.py
├── config/
├── config.example/
├── core/
├── modbus/
├── web_dashboard/
├── docs/
├── examples/
├── tools/
├── storage/
├── data/
├── pyproject.toml
└── requirements.txt
```

## 🔧 Разработка и отладка

```bash
edge --log-level DEBUG
python start_dashboard.py
curl http://localhost:8090/health
```

### Systemd deployment

В каталоге `systemd/` есть готовые unit-файлы и скрипт установки:

```bash
cd systemd
sudo ./install_services.sh
sudo systemctl enable cube-edge
sudo systemctl start cube-edge
```

Скрипт создаёт пользователя `cube_edge`, необходимые директории (`/opt/cube_edge`, `/var/log/cube_edge`, `/etc/cube_edge`), копирует `cube-edge.service`, таймер резервного бэкапа и мониторинг, настраивает logrotate и включает автозапуск. После выполнения EDGE автоматически стартует и перезапускается через systemd.

## 🗄️ База данных

- `storage/kub_data.db`
- `data/kub_commands.db`

## 📝 Логирование

- `logs/`
- `config/logs/security.log`
- `config/logs/telegram.log`

## 🚨 Мониторинг и alerting

- CPU, RAM, диск  
- DB checks  
- Modbus activity  
- Telegram status  
- API Gateway  
- Network interfaces  

## ⚠️ Troubleshooting

```bash
cat config/app_config.yaml
python tools/telegram_secrets_cli.py show
tail -f logs/edge.log
```

## 📚 Документация

Для разных типов пользователей:

| Документ | Описание | Аудитория |
|----------|----------|-----------|
| **[QUICKSTART.md](QUICKSTART.md)** | 🚀 Быстрый старт за 5 минут | Новые пользователи |
| **[REQUIREMENTS.md](REQUIREMENTS.md)** | 💻 Системные требования | Все |
| [docs/USER_GUIDE.md](docs/USER_GUIDE.md) | Полное руководство пользователя | Операторы |
| [docs/GUI_INTEGRATION_GUIDE.md](docs/GUI_INTEGRATION_GUIDE.md) | API и интеграция | GUI разработчики |
| [CLAUDE.md](CLAUDE.md) | Техническая архитектура | EDGE разработчики |
| [docs/README.md](docs/README.md) | Индекс всей документации | Все |

## 🔮 Roadmap

- Watchdog для потоков
- Prometheus-метрики
- Docker контейнеризация
- Grafana dashboard
- OPC UA

## 📄 Лицензия

CUBE_RS EDGE — закрытый программный продукт для промышленного использования.
