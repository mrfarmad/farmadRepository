# EDGE Dashboard (React)

Инструкция, как запустить новый SPA-дэшборд и подключить его к сервисам EDGE.

## Требования
- Node.js 18+
- Доступ к health API (`http://localhost:8090/health` по умолчанию) и WebSocket стриму (`ws://localhost:8000`), которые поднимает backend `EDGE_js`.

### Быстрый старт из корня проекта
Из директории `EDGE_js` можно запустить Vite dev-сервер через обертку `start-dashboard.js` (аналог Python `start_dashboard.py`):
```bash
npm run start:dashboard -- --port 8501 --host 0.0.0.0 --health http://localhost:8090/health --ws ws://localhost:8000
```
Если аргументы опущены, по умолчанию используется `port=8501`, `health=http://localhost:8090/health`, `ws=ws://localhost:8000`.

## Переменные окружения
Vite поддерживает `VITE_` переменные. Для смены эндпоинтов создайте `.env.local` рядом с `package.json`:
```
VITE_HEALTH_URL=http://localhost:8090/health
VITE_WS_URL=ws://localhost:8000
```

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
- Tailwind и PostCSS настроены в `tailwind.config.js` и `postcss.config.cjs`.
- Фильтры по зоне/типу и поиск доступны из панели фильтров, данные приходят через WebSocket.
