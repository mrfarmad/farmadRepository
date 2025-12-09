# EDGE_js (Node.js + React)

Полная миграция промышленного IoT-проекта EDGE с Python/Streamlit на Node.js/React. Репозиторий включает Modbus-читатель, MQTT/WebSocket публикацию, Telegram-уведомления, health API, CLI-утилиты и новый React SPA-дэшборд.

## Структура
```
EDGE_js/
├── start.js                # точка входа backend
├── config/                 # YAML-конфиги (app_config.yaml, devices.yaml)
├── core/                   # менеджеры конфигурации, реестр устройств, планировщик
├── modbus/                 # читатель, очередь/исполнитель команд, хранилище
├── services/               # WebSocket, MQTT, Telegram, health, edge-ping
├── tools/                  # CLI и симуляторы (RTU, scan-rtu, security-cli и т.д.)
├── dashboard/              # UI и API для дашборда
│   └── ui/                 # React SPA (Vite + Tailwind)
├── storage/                # БД SQLite (kub_data.db)
├── logs/                   # логи выполнения
├── .env                    # пример переменных окружения
└── package.json            # зависимости backend
```

## Быстрый старт backend
1. Установите зависимости: `npm install`
2. При необходимости отредактируйте `.env` или `config/app_config.yaml` / `config/devices.yaml`.
3. Запустите: `npm start`

### Переменные окружения (backend)
- `RS485_PORT`, `RS485_BAUD`, `RS485_TIMEOUT` — настройки Modbus RTU
- `WEBSOCKET_PORT`, `HEALTH_API_PORT` — сетевые сервисы
- `TELEGRAM_BOT_TOKEN` — токен Telegram-бота
- `MQTT_URL`, `MQTT_USERNAME`, `MQTT_PASSWORD` — параметры MQTT брокера

### Запуск вспомогательных утилит
- Симулятор шины RTU: `node tools/rtu-simulator.js --kub 1-3 --vfd 4-5`
- Сканирование устройств: `node tools/scan-rtu-bus.js`
- Проверка/создание секретов: `node tools/security-cli.js`
- Первая инициализация/валидация: `node tools/first-start.js`, `node tools/validate-setup.js`
- Edge ping: `node tools/edge-ping-cli.js`

## Дашборд (React SPA)
Директория `dashboard/ui` использует Vite + Tailwind.

### Быстрый запуск через стартовый скрипт
```bash
cd EDGE_js
npm run start:dashboard                # dev-сервер Vite на порту 8501
# или указать хост/порт и endpoints
npm run start:dashboard -- --port 8501 --host 0.0.0.0 --health http://localhost:8090/health --ws ws://localhost:8000
```
Скрипт `start-dashboard.js` заменяет Python `start_dashboard.py`: проверяет наличие UI, пробрасывает `VITE_HEALTH_URL` и `VITE_WS_URL` в Vite и показывает итоговый URL.

### Установка и dev-режим
```bash
cd dashboard/ui
npm install
npm run dev -- --host   # по умолчанию http://localhost:5173
```
Health API по умолчанию: `http://localhost:8090/health`, WebSocket: `ws://localhost:8000`.

### Production сборка
```bash
npm run build
npm run preview  # локальная проверка собранной версии
```

### Настройка эндпоинтов UI
Создайте `.env.local` рядом с `dashboard/ui/package.json`:
```
VITE_HEALTH_URL=http://localhost:8090/health
VITE_WS_URL=ws://localhost:8000
```

## Потоки данных и функции
- **Modbus**: `modbus/universal-reader.js` читает регистры и складывает в SQLite (`storage/kub_data.db`), очереди обрабатываются `command-queue.js`/`command-executor.js`.
- **Планировщик устройств**: `core/device-scheduler.js` опрашивает реестр (`core/device-registry.js`) с интервалом из конфигурации.
- **Публикация**: WebSocket (`services/websocket-server.js`) и MQTT (`services/mqtt-publisher.js`) рассылают свежие показания.
- **Оповещения**: `services/telegram-bot.js` отправляет уведомления, `services/edge-ping.js` пингует внешние контрольные точки.
- **Мониторинг**: `core/health-api.js` поднимает REST `/health`, который использует UI.
- **UI**: React-компоненты в `dashboard/ui/components` показывают карточки устройств, графики телеметрии (Recharts), список тревог и фильтры по зонам/типам.

## Развертывание
- Backend можно запускать как systemd-сервис или через Docker (добавьте Dockerfile/compose по своим требованиям).
- UI собирается `npm run build`; статику можно раздавать любым веб-сервером (Nginx, Caddy). Настройте прокси для WebSocket и health API.
- Логи сохраняются в `logs/`, база — в `storage/`.

## Отладка
- Используйте симулятор RTU (`tools/rtu-simulator.js`) для тестов без реального оборудования.
- Health API отвечает `200`/`status: ok` при успешной инициализации сервисов.
- В UI отображается статус подключения WebSocket и фильтры для быстрого поиска проблемных устройств.
