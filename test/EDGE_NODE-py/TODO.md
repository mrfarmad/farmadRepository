# TODO: EDGE Production Readiness Tasks

Список задач по результатам технического аудита проекта EDGE.

---

## 🔴 КРИТИЧНЫЕ ЗАДАЧИ (MUST FIX перед production)

### 1. Добавить watchdog для worker threads с auto-restart
**Приоритет:** 🔴 ВЫСОКИЙ
**Время:** 1-2 дня
**Файлы:** `modbus/reader_integration.py`, `start.py`

**Проблема:**
- Worker thread помечен как `daemon=True`
- Если поток падает (exception) → молча умирает, никто не уведомлён
- Нет автоматического перезапуска

**Решение:**
- Добавить `threading.Thread.is_alive()` проверки в scheduler
- Автоматический restart worker'а при падении
- Alerting в Telegram при падении потока
- Логирование причины падения

**Acceptance criteria:**
- [ ] Worker thread автоматически перезапускается при падении
- [ ] Alert в Telegram при падении worker'а
- [ ] Health API показывает статус worker threads
- [ ] Логируется stack trace при падении

---

### 2. Реализовать Prometheus metrics (latency, throughput, errors, queue depth)
**Приоритет:** 🔴 ВЫСОКИЙ
**Время:** 2-3 дня
**Файлы:** `modbus/universal_reader.py`, `modbus/reader_integration.py`, `core/health_api.py`

**Проблема:**
- Нет метрик производительности (observability)
- Невозможно диагностировать деградацию сети
- Нельзя детектировать "медленное устройство" автоматически

**Решение:**
Добавить Prometheus metrics (уже есть `prometheus-client` в deps!):
- `modbus_requests_total{device_id, status}` — счётчик запросов
- `modbus_request_duration_seconds{device_id}` — histogram latency
- `modbus_crc_errors_total{device_id}` — CRC ошибки
- `modbus_queue_depth` — gauge очереди
- `modbus_device_response_time{device_id}` — summary

**Acceptance criteria:**
- [ ] Метрики экспортируются на `/metrics` endpoint
- [ ] Grafana dashboard пример в `docs/grafana/`
- [ ] Документация по метрикам в README
- [ ] Alerts примеры (high error rate, slow response)

---

### 3. Оптимизировать time.sleep() - сделать конфигурируемым, использовать serial.timeout
**Приоритет:** 🔴 ВЫСОКИЙ
**Время:** 1 день
**Файлы:** `modbus/universal_reader.py`

**Проблема:**
```python
# modbus/universal_reader.py:226
self.serial_connection.write(request)
time.sleep(0.05)  # ⚠️ BLOCKING весь поток
response = self.serial_connection.read(100)
```
- Worker thread блокируется на `time.sleep`
- При 10 устройствах, каждое читается 20 регистров → 4+ секунды простоя
- Неприемлемо для real-time систем

**Решение:**
- Использовать `serial.timeout` вместо hard sleep
- Сделать задержки конфигурируемыми через `app_config.yaml`:
  ```yaml
  rs485:
    inter_frame_delay_ms: 50  # между запросом и ответом
    inter_batch_delay_ms: 20  # между пакетами регистров
    inter_device_delay_ms: 100  # между устройствами
  ```
- Минимизировать задержки (тестировать на реальном железе)

**Acceptance criteria:**
- [ ] Все `time.sleep` в `universal_reader.py` конфигурируемые
- [ ] Использовать `serial.timeout` для ожидания ответа
- [ ] Документация по настройке задержек
- [ ] Benchmark до/после оптимизации

---

### 4. Создать systemd unit файл с autostart и restart policy ✅
**Статус:** ✅ Выполнено (см. каталог `systemd/`)
**Артефакты:**
- `systemd/cube-edge.service`, `cube-edge-backup.service`, `cube-edge-monitor.service`
- `systemd/install_services.sh` — создаёт пользователя, каталоги, копирует unit‑файлы, включает сервисы и настраивает logrotate.
- README включает раздел “Systemd deployment” с командами установки.

**Проверено:** автозапуск работает, services enable/start через systemd, логическое покрытие выполнено.

---

## 🟠 СРЕДНИЕ ЗАДАЧИ (SHOULD FIX)

### 5. Добавить ring buffer и frame detection для robust framing
**Приоритет:** 🟠 СРЕДНИЙ
**Время:** 3-4 дня
**Файлы:** `modbus/universal_reader.py`

**Проблема:**
```python
response = self.serial_connection.read(100)  # Читаем "максимум 100 байт"
```
- Нет детекции начала/конца фрейма
- Если в линии шум → `read(100)` может схватить мусор
- В промышленных сетях: EMI, переотражения, collisions — обычное дело

**Решение:**
- Добавить `_find_frame_boundary()` метод
- Использовать state machine для frame detection:
  1. Поиск slave_id
  2. Валидация function_code
  3. Определение длины фрейма
  4. Чтение до конца + CRC
- Ring buffer для накопления данных до полного фрейма

**Acceptance criteria:**
- [ ] Реализован `RingBuffer` класс
- [ ] State machine для frame detection
- [ ] Тесты на корявых данных (partial frames, noise)
- [ ] Документация алгоритма

---

### 6. Реализовать connection pooling для SQLite
**Приоритет:** 🟠 СРЕДНИЙ
**Время:** 1-2 дня
**Файлы:** `modbus/modbus_storage.py`

**Проблема:**
```python
async with aiosqlite.connect(db_path, timeout=5) as conn:
    # Каждый раз новое соединение
```
- При высокой нагрузке (50 устройств, poll_interval=1s) → 50 conn/s
- SQLite не любит частые open/close

**Решение:**
- Connection pool через обёртку над `aiosqlite`
- Или одно долгоживущее соединение на поток
- Для production: рассмотреть PostgreSQL/TimescaleDB

**Acceptance criteria:**
- [ ] Connection pool реализован
- [ ] Benchmark до/после (latency, throughput)
- [ ] Graceful shutdown соединений
- [ ] Документация по настройке pool size

---

### 7. Рефакторинг глобальных переменных reader'а в класс ReaderIntegrationManager
**Приоритет:** 🟡 НИЗКИЙ
**Время:** 2-3 дня
**Файлы:** `modbus/reader_integration.py`, `start.py`

**Проблема:**
```python
_global_reader: Optional[UniversalModbusReader] = None
_read_queue: "queue.Queue[_ReadTask]" = queue.Queue()
_worker_thread: Optional[threading.Thread] = None
```
- Невозможно создать несколько инстансов (2 RS-485 порта)
- Затрудняет тестирование (нужны моки глобалов)
- Race conditions при reinit

**Решение:**
- Обернуть в класс `ReaderIntegrationManager`
- Инициализировать в `EDGEService.__init__`
- Передавать инстанс через DI

**Acceptance criteria:**
- [ ] Класс `ReaderIntegrationManager` создан
- [ ] Глобальные переменные удалены
- [ ] Тесты обновлены (моки упростились)
- [ ] Backward compatibility с legacy API

---

### 8. Добавить версионирование протоколов в Device Adapters
**Приоритет:** 🟡 СРЕДНИЙ
**Время:** 2-3 дня
**Файлы:** `core/device_adapters/`, `core/device_registry.py`

**Проблема:**
- Если производитель обновит firmware → регистры могут поменяться
- Нет способа определить версию протокола устройства
- Нет миграций между версиями адаптеров

**Решение:**
- Добавить `adapter_version` в DeviceInfo
- Детектить версию firmware через magic registers
- Поддерживать несколько версий одного адаптера:
  ```python
  core/device_adapters/kub1063_v1.py
  core/device_adapters/kub1063_v2.py
  ```
- Version detection при первом подключении

**Acceptance criteria:**
- [ ] Поле `adapter_version` в DeviceInfo
- [ ] Auto-detection версии протокола
- [ ] Пример: KUB1063 v1 и v2 адаптеры
- [ ] Документация по созданию версионированных адаптеров

---

## 🟡 НИЗКИЕ ЗАДАЧИ (Код качество)

### 9. Удалить DEBUG логи из production кода (bot_main.py:1422-1425) ✅
**Статус:** выполнено (строки переведены на `logger.debug`, проверка `rg "DEBUG:" core/ modbus/` даёт 0 попаданий).

---

### 10. Edge Data API (бывший Remote Dashboard)
**Статус:** ✅ API синхронизирован с `storage/kub_data.db` и GUI Integration Guide.

### 15. Tunnel Integration (Tailscale + API proxy)
**Приоритет:** 🟠 СРЕДНИЙ
**Файлы:** `core/tunnel_integration.py`, `core/tailscale_integration.py`, `tunnel_system/`

**Проблема:**
- Переход на новое Edge Data API произошёл, но слой туннелирования содержит legacy TODO (особенно в tailscale_integration).
- Нужно определить, какие endpoints проксируются и в каком виде, как синхронизировать с Edge Data API и Health API.

**Решение:**
- Пересмотреть `core/tunnel_integration.py` и `core/tailscale_integration.py`, обеспечить их совместимость с Edge Data API.
- Документировать процедуру запуска/конфигурации tunnel_system (broker, клиент).
- Обновить README/TODO после реализации.

**Acceptance criteria:**
- [ ] Прокси-сервис корректно транслирует `/api/devices`, `/api/device/<id>`, `/api/health`.
- [ ] Документация по туннелированию (Tailscale + EDGETunnelClient) добавлена в README или отдельный документ.
- [ ] Отсутствуют устаревшие TODO в `tunnel_integration`/`tailscale_integration`.

---

### 11. Сделать verify_after_write опциональным для некритичных команд ✅
**Статус:** добавлен флаг `verify` в `WriteCommand` (SQLite столбец + CLI/Executor). `command_executor.verify_after_write` остаётся глобальным дефолтом, каждая команда может его отключать.

---

## 🟢 NICE-TO-HAVE (Развитие проекта)

### 12. Создать Docker контейнеризацию
**Приоритет:** 🟢 NICE-TO-HAVE
**Время:** 2-3 дня
**Файлы:** `Dockerfile`, `docker-compose.yml`, `docs/DOCKER.md`

**Решение:**
```dockerfile
FROM python:3.10-slim
RUN apt-get update && apt-get install -y gcc
WORKDIR /app
COPY . .
RUN pip install -e .
CMD ["edge", "--log-level", "INFO"]
```

**Acceptance criteria:**
- [ ] Multi-stage Dockerfile (builder + runtime)
- [ ] docker-compose.yml с volume mounts для config
- [ ] Документация по Docker deployment
- [ ] GitHub Actions для build образов

---

### 13. Настроить Grafana dashboard для визуализации метрик
**Приоритет:** 🟢 NICE-TO-HAVE
**Время:** 1-2 дня
**Файлы:** `docs/grafana/edge_dashboard.json`

**Требует:** Задача #2 (Prometheus metrics)

**Решение:**
- Создать Grafana dashboard с панелями:
  - Device response time (по устройствам)
  - CRC error rate
  - Queue depth
  - System metrics (CPU, RAM)
- Export JSON в `docs/grafana/`

**Acceptance criteria:**
- [ ] Dashboard JSON экспортирован
- [ ] Screenshot dashboard'а в README
- [ ] docker-compose с Prometheus + Grafana

---

### 14. Провести load testing на реальном железе (>30 устройств)
**Приоритет:** 🟢 NICE-TO-HAVE
**Время:** 3-5 дней
**Файлы:** `tests/load_test_production.py`, `docs/PERFORMANCE.md`

**Цель:**
- Протестировать на реальной сети с 30+ устройствами
- Измерить latency p50/p95/p99
- Найти bottlenecks
- Определить максимальную нагрузку

**Acceptance criteria:**
- [ ] Load test script с результатами
- [ ] Документация по производительности
- [ ] Рекомендации по scaling (сколько устройств на 1 EDGE)

---

## 📊 Трекинг прогресса

**Критичные:** 0/4 completed
**Средние:** 0/4 completed
**Низкие:** 0/3 completed
**Nice-to-have:** 0/3 completed

**Общий прогресс:** 0/14 (0%)

---

## 🎯 Рекомендуемая последовательность (Sprint Plan)

### Sprint 1: Критичные safety nets (1 неделя)
1. Watchdog для worker threads (#1)
2. Prometheus metrics (#2)
3. Оптимизация time.sleep (#3)
4. Systemd unit (#4)

**Результат:** Система готова к production с мониторингом

### Sprint 2: Stability & Performance (2-3 недели)
5. Ring buffer + frame detection (#5)
6. Connection pooling SQLite (#6)
7. Рефакторинг глобальных переменных (#7)
8. Версионирование протоколов (#8)

**Результат:** Стабильная работа в сложных условиях

### Sprint 3: Code quality (1 неделя)
9-11. Cleanup задачи (#9, #10, #11)

**Результат:** Чистый production-ready код

### Sprint 4: Infrastructure (опционально)
12-14. Docker, Grafana, Load testing (#12, #13, #14)

**Результат:** Полноценная production инфраструктура

---

**Создано:** 2025-12-02
**Последнее обновление:** 2025-12-02
**Автор:** EDGE Full-Stack RS485 Senior Engineer (Technical Audit)
