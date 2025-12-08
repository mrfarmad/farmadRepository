# EDGE Dashboard (React)

Инструкция, как запустить новый SPA-дэшборд и подключить его к сервисам EDGE.

## Требования
- Node.js 18+
- Доступ к health API (`http://localhost:8090/health`) и WebSocket стриму (`ws://localhost:8000`), которые поднимает backend `EDGE_js`.

## Установка и запуск (dev)
```bash
cd EDGE_js/dashboard/ui
npm install
npm run dev -- --host # по умолчанию порт 5173
```
После старта Vite покажет URL (например, `http://localhost:5173`). Откройте его в браузере.

## Сборка production
```bash
npm run build
npm run preview # локальная проверка собранной версии
```

## Настройки
- Порты и хосты health/WebSocket можно поменять в `services/api.js` и `services/websocket.js`.
- Tailwind и PostCSS настроены в `tailwind.config.js` и `postcss.config.cjs`.
