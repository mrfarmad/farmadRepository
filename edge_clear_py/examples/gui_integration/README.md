# GUI Integration Examples

Примеры интеграции различных frontend frameworks с EDGE Gateway.

## Содержание

- [simple_dashboard.html](simple_dashboard.html) - Минимальный HTML+JS dashboard
- [react_monitor/](react_monitor/) - React.js приложение
- [vue_dashboard/](vue_dashboard/) - Vue.js dashboard
- [python_client.py](python_client.py) - Python WebSocket client
- [grafana_datasource.py](grafana_datasource.py) - Grafana data source
- [mqtt_subscriber.py](mqtt_subscriber.py) - MQTT consumer пример

## Быстрый старт

### 1. Простой HTML Dashboard

```bash
# Откройте simple_dashboard.html в браузере
open examples/gui_integration/simple_dashboard.html

# Или запустите локальный сервер
python -m http.server 8080
# Затем http://localhost:8080/simple_dashboard.html
```

### 2. React Monitor

```bash
cd react_monitor
npm install
npm start
# Откроется http://localhost:3000
```

### 3. Python Client

```bash
pip install websockets
python python_client.py
```

## API Endpoints

**WebSocket:** ws://localhost:8000
**Health API:** http://localhost:8090
**Database:** storage/kub_data.db

См. [GUI_INTEGRATION_GUIDE.md](../../docs/GUI_INTEGRATION_GUIDE.md) для полной документации.
