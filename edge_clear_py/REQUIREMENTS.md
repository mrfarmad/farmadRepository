# 💻 Системные требования EDGE

Детальные требования к аппаратному и программному обеспечению для запуска EDGE Gateway.

---

## 📋 Краткая версия

| Компонент | Минимум | Рекомендовано |
|-----------|---------|---------------|
| **CPU** | 1 ядро, 1 GHz | 2+ ядра, 2+ GHz |
| **RAM** | 512 MB | 2 GB+ |
| **Диск** | 1 GB | 5 GB+ (SSD) |
| **Python** | 3.10 | 3.11+ |
| **ОС** | Linux, macOS, Windows | Linux (Ubuntu 20.04+) |
| **RS-485** | Опционально | USB-RS485 адаптер |

---

## 🖥️ Операционные системы

### ✅ Linux (рекомендовано для production)

**Протестировано на:**
- Ubuntu 20.04 LTS, 22.04 LTS
- Debian 11, 12
- Raspberry Pi OS (Bullseye)
- CentOS 8+, Rocky Linux 8+

**Требования:**
- Kernel 4.x или новее
- systemd для автозапуска (опционально)
- Права доступа к `/dev/ttyUSB*` или `/dev/ttyACM*` (для RS-485)

**Настройка прав для serial портов:**
```bash
# Добавить пользователя в группу dialout
sudo usermod -aG dialout $USER

# Перелогиниться для применения
# или
newgrp dialout
```

### ✅ macOS

**Протестировано на:**
- macOS 11 (Big Sur)
- macOS 12 (Monterey)
- macOS 13 (Ventura)
- macOS 14 (Sonoma)

**Архитектуры:**
- Intel (x86_64)
- Apple Silicon (arm64/M1/M2/M3)

**Особенности:**
- Serial порты: `/dev/tty.usbserial-*`, `/dev/cu.usbserial-*`
- Homebrew рекомендуется для установки зависимостей
- XCode Command Line Tools требуются для некоторых пакетов

### ⚠️ Windows

**Протестировано на:**
- Windows 10 (1909+)
- Windows 11

**Требования:**
- Windows Terminal (рекомендовано)
- PowerShell 5.1+ или PowerShell Core 7+
- Python установленный через официальный installer (не из Microsoft Store)

**Особенности:**
- Serial порты: `COM1`, `COM2`, ..., `COM256`
- Может потребоваться запуск от администратора для доступа к портам
- ANSI цвета в терминале поддерживаются (Windows 10 1909+)

**Рекомендация:** Для production используйте Linux или запускайте в WSL2.

---

## 🐍 Python

### Минимальная версия: **Python 3.10**

**Зависимости от версии:**
- Python 3.10+ - обязательно (используется `match/case`, новый синтаксис typing)
- Python 3.11+ - рекомендовано (лучше производительность, улучшенные error messages)
- Python 3.12+ - поддерживается

**Проверка версии:**
```bash
python3 --version
# или
python --version
```

**Установка Python:**

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install python3.11 python3.11-venv python3-pip
```

**macOS (Homebrew):**
```bash
brew install python@3.11
```

**Windows:**
Скачайте с [python.org](https://www.python.org/downloads/)

---

## 🔌 Аппаратные требования

### CPU

**Минимум:**
- 1 ядро, 1 GHz
- Архитектура: x86_64, ARM (armv7l, aarch64)

**Рекомендовано:**
- 2+ ядра, 2+ GHz
- Для обработки 10+ устройств: 4+ ядра

**Протестированные платформы:**
- ✅ Обычные ПК/серверы (Intel/AMD)
- ✅ Raspberry Pi 3B+, 4B, 5 (ARM)
- ✅ Apple Silicon M1/M2/M3 (arm64)
- ✅ Industrial SBCs (Orange Pi, Rock Pi)

### RAM

**Минимум:** 512 MB (для 1-5 устройств)

**Рекомендовано:**
- 1 GB - до 10 устройств
- 2 GB - до 50 устройств
- 4 GB+ - 50+ устройств с Dashboard

**Потребление памяти (типично):**
- EDGE core: ~50-100 MB
- Dashboard (Streamlit): ~200-300 MB
- Database cache: ~50-100 MB
- WebSocket connections: ~5-10 MB на 100 клиентов

### Диск

**Минимум:** 1 GB свободного места

**Рекомендовано:**
- 5 GB+ для логов и истории данных
- SSD для production (улучшенная производительность SQLite)

**Потребление диска:**
- Код EDGE: ~50 MB
- Dependencies: ~200-300 MB
- Logs: ~10-100 MB/день (зависит от log level)
- Database: ~1-10 MB/день/устройство (зависит от частоты опроса)

**Расчёт для production:**
```
Пример: 20 устройств, опрос каждые 5 секунд, хранение 30 дней
Database: 20 * 5 MB/день * 30 = 3 GB
Logs: 50 MB/день * 30 = 1.5 GB
Итого: ~5 GB
```

### Сеть

**Для offline mode:** не требуется

**Для online mode:**
- Исходящий порт 443 (HTTPS) для EDGE Ping Service
- Возможность подключения к MQTT broker (если используется)

**Внутренние порты:**
- 8000 - WebSocket Server
- 8090 - Health API
- 8501 - Streamlit Dashboard

---

## 🔌 RS-485/Serial порты

### Аппаратные адаптеры

**Поддерживаются:**
- ✅ USB-RS485 конвертеры (FTDI, CH340, CP210x чипы)
- ✅ Built-in UART на SBC (Raspberry Pi, etc.)
- ✅ PCIe/PCI RS-485 карты
- ✅ Сетевые RS-485 серверы (через TCP gateway)

**Рекомендуемые модели:**
- USB-RS485: с FTDI FT232RL/FT231X чипсетом
- USB-RS485: Waveshare USB TO RS485
- Industrial: MOXA UPort 1110/1130/1150

**Не требуется если:**
- Используется Simulation Mode (для тестирования)
- Используется Modbus TCP (без RTU)

### Драйверы

**Linux:**
- Обычно уже включены в kernel (ftdi_sio, ch341, cp210x)
- Проверка: `lsusb` и `ls -la /dev/ttyUSB*`

**macOS:**
- FTDI - встроенные драйверы
- CH340 - требуется установка драйвера: [github.com/adrianmihalko/ch340g-ch34g-ch34x-mac-os-x-driver](https://github.com/adrianmihalko/ch340g-ch34g-ch34x-mac-os-x-driver)

**Windows:**
- Устанавливаются автоматически через Windows Update
- Или вручную с сайта производителя чипа

---

## 📦 Зависимости Python

### Обязательные (core)

```
fastapi>=0.104.1
uvicorn[standard]>=0.24.0
aiosqlite>=0.19.0
pydantic>=2.5.0
pymodbus>=3.5.0
pyserial>=3.5
pyyaml>=6.0.1
cryptography>=41.0.0
structlog>=23.2.0
websockets>=15.0.1
```

### Опциональные

**Dashboard:**
```
streamlit>=1.28.0
plotly>=5.17.0
pandas>=2.1.0
```

**Telegram:**
```
python-telegram-bot>=20.7
```

**MQTT:**
```
paho-mqtt>=1.6.0
```

**Мониторинг:**
```
prometheus-client>=0.19.0
psutil>=5.9.0
```

### Установка

**Минимальная (только core):**
```bash
pip install pymodbus pyserial pydantic aiosqlite pyyaml
```

**Полная (все зависимости):**
```bash
pip install -e .
```

**Только dashboard:**
```bash
pip install -e ".[dashboard]"
```

**Только telegram:**
```bash
pip install -e ".[telegram]"
```

---

## 💾 База данных

### SQLite (встроенная)

**Версия:** 3.35.0 или новее

**Особенности:**
- WAL mode для concurrent access
- Автоматическое создание schema
- Не требует отдельной установки

**Проверка версии:**
```bash
sqlite3 --version
```

**Обновление (Ubuntu):**
```bash
sudo apt install sqlite3 libsqlite3-dev
```

### Альтернативы (будущие версии)

- PostgreSQL (планируется)
- TimescaleDB (планируется)
- InfluxDB (планируется)

---

## 🌐 Браузеры (для Dashboard)

**Поддерживаются:**
- ✅ Google Chrome 90+
- ✅ Mozilla Firefox 88+
- ✅ Microsoft Edge 90+
- ✅ Safari 14+ (macOS)
- ⚠️ Internet Explorer - **не поддерживается**

**Рекомендовано:** Chrome или Firefox последней версии

---

## 🔒 Безопасность

### Шифрование

**Требования:**
- OpenSSL 1.1.1+ или LibreSSL 3.0+
- Python cryptography package

**Проверка:**
```bash
openssl version
```

### Файловая система

**Права доступа:**
- `config/` - 700 (только владелец)
- `config/secrets/` - 700 (только владелец)
- Секретные файлы - 600 (только владелец)

**Автоматически устанавливаются** при запуске `python tools/first_start.py`

---

## 📊 Рекомендации по производительности

### Для Raspberry Pi

**Raspberry Pi 3B+:**
- ✅ До 10 устройств
- ⚠️ Dashboard может быть медленным
- 💡 Используйте lite OS без GUI

**Raspberry Pi 4 (2GB+):**
- ✅ До 30 устройств
- ✅ Dashboard работает нормально
- 💡 Рекомендуется SSD вместо SD карты

**Raspberry Pi 5:**
- ✅ До 50+ устройств
- ✅ Полная функциональность

### Для production

**Минимальная конфигурация:**
- Intel Celeron / AMD Athlon, 2 ядра
- 2 GB RAM
- 20 GB SSD
- Linux Server (без GUI)

**Оптимальная конфигурация:**
- Intel Core i3 / AMD Ryzen 3, 4 ядра
- 4 GB RAM
- 50 GB SSD
- Ubuntu Server 22.04 LTS

---

## 🧪 Тестовое окружение (Simulation Mode)

**Не требуется:**
- ❌ RS-485 адаптер
- ❌ Реальные устройства
- ❌ Особые права доступа

**Требуется:**
- ✅ Python 3.10+
- ✅ Зависимости из `requirements.txt`
- ✅ 500 MB RAM
- ✅ 500 MB диск

**Идеально для:**
- Разработки
- Тестирования
- Демонстрации
- CI/CD pipeline

---

## ✅ Проверка соответствия требованиям

Запустите скрипт автоматической проверки:

```bash
python tools/validate_setup.py
```

**Скрипт проверит:**
- ✅ Версию Python
- ✅ Установленные зависимости
- ✅ Доступность SQLite
- ✅ RS-485 порты (если есть)
- ✅ Права доступа к файлам
- ✅ Симулятор (для demo режима)

---

## 🆘 Проблемы и решения

### "Permission denied" для serial порта

**Linux:**
```bash
sudo usermod -aG dialout $USER
# Перелогиниться
```

### "Module not found" при импорте

```bash
# Переустановить зависимости
pip install -e . --force-reinstall
```

### Медленная работа на Raspberry Pi

```bash
# Используйте SSD вместо SD
# Отключите GUI
sudo systemctl set-default multi-user.target

# Увеличьте swap
sudo dphys-swapfile swapoff
sudo nano /etc/dphys-swapfile  # CONF_SWAPSIZE=2048
sudo dphys-swapfile setup
sudo dphys-swapfile swapon
```

### SQLite "database is locked"

```bash
# Уже используется WAL mode
# Проверьте что нет других процессов:
lsof storage/kub_data.db
```

---

## 📞 Поддержка

Если у вас проблемы с системными требованиями:

1. Запустите `python tools/validate_setup.py`
2. Проверьте [QUICKSTART.md](QUICKSTART.md)
3. Создайте [Issue на GitHub](https://github.com/MikeVances/EDGE_NODE/issues) с выводом validate_setup

---

**Обновлено:** 2025-12-02
