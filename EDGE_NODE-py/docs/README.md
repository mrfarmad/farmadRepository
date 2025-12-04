# EDGE Documentation Index

Полная документация проекта EDGE - Industrial IoT Gateway.

---

## 📚 Для разных аудиторий

### Для разработчиков GUI / Интеграторов
- **[GUI Integration Guide](GUI_INTEGRATION_GUIDE.md)** ⭐ **ГЛАВНЫЙ ДОКУМЕНТ**
  - API Reference (WebSocket, REST, Database)
  - Точки интеграции и форматы данных
  - Примеры кода (JS, Python, React, Vue)
  - Best practices и troubleshooting

### Для операторов / Техников
- **[User Guide](USER_GUIDE.md)**
  - Работа с веб-дашбордом
  - Telegram бот команды
  - Интерпретация аварий
  - FAQ и troubleshooting

### Для разработчиков EDGE Core
- **[CLAUDE.md](../CLAUDE.md)**
  - Архитектура системы
  - Команды разработки
  - Структура кода
  - Создание Device Adapters

### Для DevOps / SysAdmin
- **[Deployment Guide](DEPLOYMENT.md)** (TODO)
  - Установка и настройка
  - Systemd service
  - Мониторинг и логи
  - Backup и recovery

---

## 🎯 Быстрые ссылки

### API Endpoints
- **WebSocket:** `ws://EDGE_HOST:8000` — Real-time данные
- **Health API:** `http://EDGE_HOST:8090` — Системные метрики
- **Database:** `storage/kub_data.db` — SQLite read-only

### Примеры кода
- [Python WebSocket Client](../examples/gui_integration/python_client.py)
- [MQTT Subscriber](../examples/gui_integration/mqtt_subscriber.py)
- [React Dashboard](../examples/gui_integration/react_monitor/) (TODO)
- [Simple HTML Example](../examples/gui_integration/simple_dashboard.html) (TODO)

---

## 📖 Документы проекта

### Технические отчёты
- **[Code Integrity Report](../CODE_INTEGRITY_REPORT.md)**
  - Результаты аудита кода
  - Импорты и зависимости
  - Статистика и рекомендации

- **[TODO.md](../TODO.md)**
  - Roadmap развития
  - Production readiness tasks
  - Приоритеты и оценки

### Конфигурация
- [config.example/](../config.example/) — Шаблоны конфигураций
  - `app_config.yaml` — Основные настройки
  - `devices*.yaml` — Реестр устройств
  - `mitm_config.yaml` — Настройки безопасности

### Утилиты и инструменты
- [tools/](../tools/) — CLI утилиты
  - `first_start.py` — Первичная настройка
  - `telegram_secrets_cli.py` — Управление Telegram секретами
  - `scan_rtu_bus.py` — Сканирование RS-485 шины
  - `security_cli.py` — Управление шифрованием

- [tools/simulators/](../tools/simulators/) — Симуляторы для тестирования
  - `rtu_bus_sim.py` — Эмулятор RS-485 шины
  - `rtu_vfd_sim.py` — Эмулятор VFD инверторов

---

## 🏗️ Архитектура системы

```
┌─────────────────────────────────────────────────────────┐
│                    EDGE Gateway                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  RS-485/Modbus RTU → Universal Reader → Device Adapters│
│         ↓                                               │
│  Device Scheduler (Priority Polling)                    │
│         ↓                                               │
│  SQLite Storage (WAL mode)                              │
│         ↓                                               │
│  ┌──────────┬───────────┬──────────┬──────────┐        │
│  │WebSocket │ Health API│   MQTT   │ Telegram │        │
│  │  :8000   │   :8090   │Publisher │   Bot    │        │
│  └──────────┴───────────┴──────────┴──────────┘        │
└─────────────────────────────────────────────────────────┘
```

**Подробнее:** [CLAUDE.md - Architecture Deep Dive](../CLAUDE.md#architecture-deep-dive)

---

## 🚀 Quick Start

### Для GUI разработчика

1. **Подключиться к WebSocket:**
   ```javascript
   const ws = new WebSocket('ws://edge.local:8000');
   ws.onmessage = (event) => {
     const data = JSON.parse(event.data);
     console.log('Device data:', data);
   };
   ```

2. **Проверить здоровье системы:**
   ```bash
   curl http://edge.local:8090/health
   ```

3. **Получить данные из БД:**
   ```python
   import sqlite3
   conn = sqlite3.connect('storage/kub_data.db')
   cursor = conn.execute("SELECT * FROM latest_data")
   devices = cursor.fetchall()
   ```

**Полная документация:** [GUI Integration Guide](GUI_INTEGRATION_GUIDE.md)

---

## 🔧 Разработка

### Локальный запуск

```bash
# Установка
make install

# Запуск EDGE
make run

# Запуск dashboard
make run-dashboard

# Тесты
make run-tests
```

### Симулятор для разработки

```bash
# Терминал 1: RTU bus simulator
python tools/simulators/rtu_bus_sim.py --kub 1-6 --vfd 7-10

# Терминал 2: EDGE с симулятором
python start_edge.py --rs485-port /dev/ttys027 --offline
```

**Подробнее:** [CLAUDE.md - Common Development Workflows](../CLAUDE.md#common-development-workflows)

---

## 📞 Поддержка

- **GitHub Issues:** [https://github.com/YOUR_ORG/edge-gateway/issues](https://github.com/YOUR_ORG/edge-gateway/issues)
- **Email:** support@edge-gateway.local
- **Documentation:** [https://docs.edge-gateway.local](https://docs.edge-gateway.local)

---

## 📝 Лицензия

CUBE_RS EDGE - закрытый программный продукт для промышленного использования.

---

**Версия документации:** 1.0
**Дата обновления:** 2025-12-02
**Авторы:** EDGE Full-Stack RS485 Senior Engineering Team
