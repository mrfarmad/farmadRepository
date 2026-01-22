---
name: Async/Await Refactoring
about: Refactor blocking operations to async/await for better performance
title: '[ENHANCEMENT] Refactor blocking operations to async/await'
labels: enhancement, performance, refactoring
assignees: ''
---

## 🎯 Goal

Refactor synchronous blocking operations (`time.sleep()`, blocking I/O) to async/await pattern for improved concurrency and performance.

## 📊 Current State

**Problem:**
The current implementation uses blocking operations that prevent efficient concurrent processing:

```python
# modbus/universal_reader.py:226
self.serial_connection.write(request)
time.sleep(0.05)  # ⚠️ BLOCKS entire thread
response = self.serial_connection.read(100)
```

**Impact:**
- Worker threads are blocked during I/O operations
- With 10 devices, each reading 20 registers → 4+ seconds wasted
- Cannot efficiently scale to 50+ devices
- Unacceptable for real-time systems

**Current architecture:**
- Threading-based with `threading.Thread`
- Synchronous serial I/O with `pyserial`
- `time.sleep()` for delays between operations
- Queue-based task distribution

## 🎯 Desired State

**Solution:**
Migrate to async/await architecture:

```python
# Future implementation
async def read_device(self, device: DeviceInfo):
    await self.serial_connection.write(request)
    await asyncio.sleep(0.05)  # Non-blocking
    response = await self.serial_connection.read(100)
```

**Benefits:**
- Single event loop handles multiple devices concurrently
- No thread blocking during I/O waits
- Better resource utilization (less overhead than threads)
- Easier to reason about concurrency
- Can scale to 100+ devices on single core

## 📋 Implementation Plan

### Phase 1: Core Infrastructure (Week 1-2)
- [ ] Evaluate async serial libraries:
  - `aioserial` (async wrapper for pyserial)
  - `serial-asyncio` (official asyncio integration)
  - Custom implementation with `asyncio.create_subprocess_exec`
- [ ] Create `AsyncUniversalModbusReader` prototype
- [ ] Benchmark: sync vs async (1 device, 10 devices, 50 devices)
- [ ] Document performance improvements

### Phase 2: Reader Layer (Week 3-4)
- [ ] Refactor `modbus/universal_reader.py`:
  - `async def read_holding_registers()`
  - `async def write_single_register()`
  - `async def _read_frame()`
- [ ] Refactor `modbus/reader_integration.py`:
  - Replace `queue.Queue` with `asyncio.Queue`
  - Replace `threading.Thread` with `asyncio.Task`
  - `async def request_universal_read()`
- [ ] Update all `time.sleep()` → `asyncio.sleep()`

### Phase 3: Integration (Week 5-6)
- [ ] Refactor `start.py`:
  - Convert `reader_worker()` to `async def reader_worker()`
  - Use `asyncio.create_task()` instead of `threading.Thread()`
  - Integrate with existing asyncio services (Telegram, WebSocket)
- [ ] Refactor `modbus/command_executor.py`:
  - `async def execute_command()`
  - Non-blocking command queue processing
- [ ] Update `core/device_scheduler.py`:
  - `async def get_devices_to_poll()`
  - Async-aware scheduling
- [ ] Refactor `modbus/modbus_storage.py`:
  - Already uses `aiosqlite` (good!)
  - Consider connection pooling with async
  - **Future:** Migrate to PostgreSQL with `asyncpg` for better concurrency

### Phase 4: Testing & Migration (Week 7-8)
- [ ] Unit tests for async components
- [ ] Integration tests: end-to-end async flow
- [ ] Load testing: 1, 10, 50, 100 devices
- [ ] Migration guide for existing deployments
- [ ] Backward compatibility layer (optional)
- [ ] Documentation updates

## 🔍 Technical Considerations

### Async Serial I/O Options

**Option 1: aioserial**
```python
import aioserial

async def read_modbus():
    async with aioserial.AioSerial(port='/dev/ttyUSB0') as ser:
        await ser.write(request)
        response = await ser.read(100)
```
✅ Pros: Drop-in replacement for pyserial
❌ Cons: Less maintained, limited platform support

**Option 2: serial-asyncio (pyserial-asyncio)**
```python
import serial_asyncio

class ModbusProtocol(asyncio.Protocol):
    def data_received(self, data):
        self.handle_response(data)

transport, protocol = await serial_asyncio.create_serial_connection(
    loop, ModbusProtocol, '/dev/ttyUSB0'
)
```
✅ Pros: Official asyncio integration
❌ Cons: Requires protocol implementation (more complex)

**Option 3: Custom with asyncio subprocess**
```python
import asyncio

proc = await asyncio.create_subprocess_exec(
    'socat', '-', f'file:{port},raw,echo=0',
    stdin=asyncio.subprocess.PIPE,
    stdout=asyncio.subprocess.PIPE
)
```
✅ Pros: Full control, portable
❌ Cons: External dependency (socat)

**Recommended:** Start with `aioserial` for prototype, migrate to `serial-asyncio` for production.

### Event Loop Integration

Current EDGE architecture already uses asyncio for:
- Telegram bot (`python-telegram-bot` v20+ is async)
- WebSocket server (`websockets` library)
- MQTT publisher (can be async with `asyncio-mqtt`)

**Integration strategy:**
```python
async def main():
    # Create single event loop for all services
    loop = asyncio.get_running_loop()

    # Start all services concurrently
    await asyncio.gather(
        start_telegram_bot(),
        start_websocket_server(),
        start_mqtt_publisher(),
        start_modbus_reader(),  # NEW: async reader
        start_command_executor(),  # NEW: async executor
    )
```

### Backward Compatibility

Provide compatibility layer for gradual migration:
```python
# Sync wrapper for async functions
def request_universal_read_sync(callback, device_info):
    """Sync wrapper for backward compatibility"""
    loop = asyncio.get_event_loop()
    result = loop.run_until_complete(
        request_universal_read_async(device_info)
    )
    callback(result)
```

## 📊 Expected Performance Improvements

Based on similar refactorings in IoT projects:

| Metric | Current (Threading) | After (Async/Await) | Improvement |
|--------|---------------------|---------------------|-------------|
| **10 devices** | ~4-5s per cycle | ~1-2s per cycle | 2-3x faster |
| **50 devices** | ~20-25s per cycle | ~5-8s per cycle | 3-4x faster |
| **100 devices** | Not feasible (thread limit) | ~10-15s per cycle | Possible! |
| **Memory** | ~50MB per 10 devices | ~20MB per 10 devices | 2.5x less |
| **CPU** | 20-30% (context switching) | 5-10% (event loop) | 3x less |

## 🗄️ Database Migration Opportunity

**Current:** SQLite with `aiosqlite` (async wrapper)
**Problem:**
- SQLite has limited concurrency (WAL mode helps, but...)
- Single writer at a time
- Not ideal for 50+ devices with high write rate

**Future consideration:** PostgreSQL migration
```python
# With asyncpg (fastest PostgreSQL driver for Python)
import asyncpg

async def save_device_data(device_id, data):
    async with pool.acquire() as conn:
        await conn.execute(
            'INSERT INTO device_data VALUES ($1, $2, $3)',
            device_id, data, timestamp
        )
```

**Benefits of PostgreSQL + async:**
- True concurrent writes (100+ devices, no problem)
- Better performance for high-volume deployments
- Advanced features (partitioning, replication, time-series)
- Native `asyncpg` is 3x faster than sync `psycopg2`

**Migration path:**
1. ✅ Phase 1-3: Async/await with SQLite (validate architecture)
2. 📊 Phase 4: Benchmark SQLite limits (how many devices before bottleneck?)
3. 🔄 Phase 5 (optional): PostgreSQL migration
   - Add `asyncpg` support alongside SQLite
   - Config option: `database.type: sqlite | postgresql`
   - Migration script: `tools/migrate_sqlite_to_postgres.py`

**For large deployments (50+ devices):**
Consider TimescaleDB (PostgreSQL extension for time-series):
- Automatic data partitioning by time
- Compression for historical data
- Retention policies (auto-delete old data)
- Optimized for IoT workloads

**Decision criteria:**
- SQLite: < 20 devices, simple deployment, embedded
- PostgreSQL: 20-100 devices, dedicated server
- TimescaleDB: 100+ devices, long-term storage, analytics

## 🚨 Risks & Mitigation

**Risk 1:** Serial port drivers may not work well with async
- **Mitigation:** Extensive testing on target hardware before rollout
- **Fallback:** Keep sync implementation as option in config

**Risk 2:** Complex migration for existing deployments
- **Mitigation:**
  - Provide both sync and async implementations initially
  - Gradual rollout with A/B testing
  - Comprehensive migration guide

**Risk 3:** Community contributions may break async code
- **Mitigation:**
  - Clear async/await guidelines in CONTRIBUTING.md
  - Pre-commit hooks checking for `time.sleep()` in async code
  - CI tests for both sync and async paths

## 📚 References

- [asyncio — Asynchronous I/O](https://docs.python.org/3/library/asyncio.html)
- [pyserial-asyncio documentation](https://pyserial-asyncio.readthedocs.io/)
- [aioserial GitHub](https://github.com/changyuheng/aioserial)
- [Real Python: Async IO in Python](https://realpython.com/async-io-python/)

## 🎯 Success Criteria

- [ ] All blocking I/O operations converted to async
- [ ] No `time.sleep()` in hot paths
- [ ] Performance benchmarks show 2-3x improvement for 10+ devices
- [ ] Memory usage reduced by 30%+
- [ ] All tests passing (unit + integration)
- [ ] Documentation updated
- [ ] Migration guide published
- [ ] Backward compatibility maintained (optional, based on decision)

## 💬 Discussion

Should we:
1. Keep both sync and async implementations?
2. Make it a breaking change (v2.0.0)?
3. Prioritize this over other refactoring work?

Please share your thoughts and concerns!

---

**Related Issues:**
- #3 (time.sleep optimization) - Short-term fix
- #1 (Watchdog) - Should be implemented after async refactor
- #2 (Prometheus) - Async metrics integration

**Labels:** `enhancement`, `performance`, `refactoring`, `breaking-change?`
**Priority:** Medium (after critical watchdog and metrics)
**Effort:** ~8 weeks full-time or ~3 months part-time
