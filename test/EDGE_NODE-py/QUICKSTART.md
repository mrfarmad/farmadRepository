# 🚀 EDGE Quick Start Guide

Пошаговая инструкция для первого запуска EDGE Gateway за 5 минут.

---

## 📋 Что нужно перед началом

### Минимальные требования

| Компонент | Требование |
|-----------|------------|
| **Python** | 3.10+ ([скачать](https://www.python.org/downloads/)) |
| **Git** | Любая версия ([скачать](https://git-scm.com/downloads)) |
| **ОС** | Linux, macOS, Windows |
| **RAM** | 512 MB (рекомендовано 2 GB) |
| **Диск** | 1 GB свободного места |
| **RS-485** | ❌ Не обязательно (есть Simulation Mode) |

### Проверка перед установкой

```bash
# Проверка Python
python3 --version  # Должно быть 3.10 или выше

# Проверка Git
git --version

# Проверка свободного места
df -h .  # Linux/macOS
```

**Не волнуйтесь!** Если у вас нет RS-485 адаптера, вы можете запустить EDGE в **Simulation Mode** для тестирования.

📄 **Детальные требования:** [REQUIREMENTS.md](REQUIREMENTS.md)

---

## 🎯 Шаг 1: Клонирование и установка

Откройте терминал и выполните:

```bash
# Клонируйте репозиторий
git clone https://github.com/MikeVances/EDGE_NODE.git
cd EDGE_NODE

# Установите зависимости
pip install -e .
```

**Ожидайте:** установка займёт 1-2 минуты.

---

## 🔍 Шаг 2: Проверка окружения

Проверьте что всё установлено корректно:

```bash
python tools/validate_setup.py
```

**Что проверяется:**
- ✅ Python версия (≥ 3.10)
- ✅ Установленные зависимости
- ✅ Доступные RS-485 порты
- ✅ SQLite база данных
- ✅ Права доступа

**Пример вывода:**
```
============================================================
🔍 EDGE Environment Validation
============================================================

✅ Python версия
   Python 3.11.4

✅ Все зависимости установлены

⚠️  RS-485/Serial порты
   Не найдены (можно использовать симулятор)

✅ RTU Simulator
   Симулятор найден: rtu_bus_sim.py

🚀 Система готова к запуску EDGE!
```

---

## ⚙️ Шаг 3: Интерактивная настройка

Запустите мастер первого запуска:

```bash
python tools/first_start.py
```

**Мастер проведёт через:**

### 3.1 Проверка окружения
Автоматически запустится `validate_setup.py`

### 3.2 Выбор режима работы

Вам будет предложен выбор:

**Вариант A: Real Hardware** (если у вас есть RS-485 адаптер)
```
✅ Найдены RS-485 порты:
   1. /dev/ttyUSB0
   2. /dev/cu.usbserial-xxx

Выберите режим работы:
  → 1. Real Hardware - работа с реальными устройствами
    2. Simulation Mode - виртуальные устройства
```

**Вариант B: Simulation Mode** (тестирование без оборудования)
```
⚠️  RS-485/Serial порты не найдены

Будет использован Simulation Mode
(Виртуальные устройства для тестирования без реального оборудования)
```

### 3.3 Настройка config/

Мастер автоматически:
- Скопирует `config.example/` → `config/`
- Настроит RS-485 порт (для Real Hardware)
- Включит offline mode (для Simulation)

### 3.4 Опциональные настройки

**Мастер-пароль** (для шифрования секретов):
```
Настроить мастер-пароль для шифрования секретов? [y/N]
```
👉 Можно пропустить, настроите позже

**Telegram бот** (для удалённого управления):
```
Настроить Telegram бота сейчас? [y/N]
```
👉 Можно пропустить, настроите позже

**Сканирование устройств** (только для Real Hardware):
```
Запустить сканирование RS-485 шины? [Y/n]
```
👉 Рекомендуется для автоматического обнаружения устройств

---

## 🚀 Шаг 4: Запуск EDGE

После завершения мастера вы увидите инструкции по запуску:

### Вариант A: Real Hardware

```bash
python start.py
```

### Вариант B: Simulation Mode

**Терминал 1** (запуск симулятора):
```bash
python tools/simulators/rtu_bus_sim.py --kub 1-2 --vfd 3-4
```

Вы увидите:
```
Modbus RTU Bus Simulator
Slave PTY created: /dev/ttys027  ← запомните этот путь

Simulating devices:
  - КУБ-1063 IDs: 1, 2
  - VFD IDs: 3, 4

Listening for Modbus requests...
```

**Терминал 2** (запуск EDGE):
```bash
# Обновите config/app_config.yaml с путём к PTY:
# rs485:
#   port: /dev/ttys027  # путь из симулятора

python start.py --offline
```

---

## 📊 Шаг 5: Откройте Dashboard

В отдельном терминале:

```bash
python start_dashboard.py
```

Dashboard автоматически откроется в браузере:
👉 [http://localhost:8501](http://localhost:8501)

**Что вы увидите:**
- 📈 Графики данных устройств в реальном времени
- 🔔 Активные аварии и предупреждения
- ⚙️ Управление устройствами
- 📊 История данных

---

## ✅ Проверка что всё работает

### 1. Проверьте логи
```bash
# EDGE логи
tail -f logs/edge.log

# Логи reader'а
tail -f reader.log
```

### 2. Проверьте Health API
```bash
curl http://localhost:8090/health
```

Ответ:
```json
{
  "status": "healthy",
  "timestamp": "2025-12-02T12:00:00",
  "components": {
    "database": "healthy",
    "modbus": "healthy",
    "websocket": "healthy"
  }
}
```

### 3. Проверьте WebSocket
Откройте browser console:
```javascript
const ws = new WebSocket('ws://localhost:8000');
ws.onmessage = (event) => console.log(JSON.parse(event.data));
```

Вы увидите данные устройств в реальном времени!

---

## 🛠️ Полезные команды

Вместо запуска вручную, используйте Makefile:

```bash
make help          # показать все команды
make validate      # проверить окружение
make setup         # запустить мастер настройки
make run           # запустить EDGE
make run-dashboard # запустить Dashboard
make demo-sim      # запустить симулятор
make test          # запустить тесты
```

---

## ❓ Частые вопросы

### Q: У меня нет RS-485 адаптера, могу ли я попробовать EDGE?
**A:** Да! Используйте Simulation Mode. Мастер автоматически настроит симуляцию.

### Q: Где хранятся данные?
**A:** SQLite база данных в `storage/kub_data.db`

### Q: Как настроить Telegram бота?
**A:**
```bash
# 1. Создайте бота через @BotFather в Telegram
# 2. Получите token
# 3. Настройте:
python tools/telegram_secrets_cli.py set-token YOUR_TOKEN
```

### Q: Как добавить новое устройство?
**A:** Отредактируйте `config/devices.yaml`:
```yaml
devices:
  - device_id: 3
    device_type: KUB-1063
    slave_id: 3
    name: "КУБ-1063 #3"
    enabled: true
```

### Q: EDGE не видит устройства
**A:** Проверьте:
1. RS-485 порт корректно настроен в `config/app_config.yaml`
2. Устройства включены и подключены к RS-485 шине
3. Slave ID совпадают с конфигурацией
4. Запустите сканирование: `python tools/scan_rtu_bus.py`

### Q: Ошибка "Port already in use"
**A:** Другой процесс использует порт. Остановите старый процесс:
```bash
# Найти процесс
lsof -i :8090  # для Health API
lsof -i :8000  # для WebSocket

# Остановить
kill -9 PID
```

---

## 📚 Дополнительная документация

- **[README.md](README.md)** - полная документация проекта
- **[docs/USER_GUIDE.md](docs/USER_GUIDE.md)** - руководство пользователя
- **[docs/GUI_INTEGRATION_GUIDE.md](docs/GUI_INTEGRATION_GUIDE.md)** - для разработчиков GUI
- **[CLAUDE.md](CLAUDE.md)** - техническая архитектура для разработчиков

---

## 🎯 Следующие шаги

После успешного запуска:

1. **Изучите Dashboard** - познакомьтесь с интерфейсом
2. **Настройте Telegram** - для удалённого мониторинга
3. **Добавьте устройства** - подключите реальное оборудование
4. **Настройте аварии** - получайте уведомления о проблемах
5. **Интегрируйте с вашей системой** - используйте WebSocket/MQTT API

---

## 🆘 Нужна помощь?

- 📖 Прочитайте [docs/USER_GUIDE.md](docs/USER_GUIDE.md)
- 🐛 Создайте [Issue на GitHub](https://github.com/MikeVances/EDGE_NODE/issues)
- 💬 Свяжитесь с разработчиками

---

**Поздравляем! EDGE Gateway успешно запущен! 🎉**

Теперь вы можете мониторить и управлять промышленным оборудованием в реальном времени.
