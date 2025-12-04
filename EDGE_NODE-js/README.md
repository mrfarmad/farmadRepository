# EDGE Node (Node.js + React)

Переписанная версия промышленного шлюза EDGE без Python. Проект включает Express-сервер и React-дэшборд для мониторинга устройств, телеметрии и health-check сигналов.

## Структура
- `server/` — API, WebSocket, эмуляция телеметрии, публикация в MQTT.
- `client/` — веб-интерфейс на React + Vite.

## Быстрый старт
1. Установить зависимости:
   ```bash
   cd server && npm install
   cd ../client && npm install
   ```
2. Запустить сервер:
   ```bash
   cd server && npm run start
   ```
3. Запустить фронтенд (dev):
   ```bash
   cd client && npm run dev
   ```

## Переменные окружения (server)
- `PORT` — порт HTTP (по умолчанию 8080).
- `MQTT_URL` — строка подключения к брокеру (если пусто — MQTT отключен).
- `PING_URL` — URL для heartbeat-запросов.
- `TELEMETRY_INTERVAL_MS` — период генерации телеметрии.
- `PING_INTERVAL_MS` — период отправки ping.

## Production-сборка и деплой
1. Собрать фронтенд:
   ```bash
   cd client
   npm install
   npm run build
   ```
   Готовые файлы будут в `client/dist/`.
2. Запустить сервер в прод-окружении (пример):
   ```bash
   cd server
   npm install --production
   PORT=8080 MQTT_URL="mqtt://broker" npm run start
   ```
3. Отдавать статику фронтенда любым веб-сервером (Nginx, S3 и т.д.) из каталога `client/dist/`. В .env для фронтенда можно задать `VITE_API_BASE=http://<host>:8080` перед билдом, если API развернуто отдельно.

## Полезно
- WebSocket подключение идёт к тому же `PORT`, где стартует сервер (Socket.IO на `/ws`).
- Если MQTT не нужен, оставьте `MQTT_URL` пустым — публикации будут отключены, но телеметрия и WebSocket останутся активны.