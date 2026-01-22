# config

Рабочие конфигурации (app_config.yaml, devices.yaml, секреты) живут внутри этого каталога. В публичном репозитории файлы `config/` должны появляться только после локальной инициализации и **не попадают в git** (см. `.gitignore`).

## Как подготовить конфигурацию после `git clone`

1. Скопируйте шаблоны:
   ```bash
   cp -R config.example config
   ```
2. Отредактируйте `config/app_config.yaml`, `config/devices.yaml`, `config/devices/*.yaml` под конкретную ферму и RS-485 топологию.
3. Запустите мастер для генерации секретов и ключей:
   ```bash
   python tools/first_start.py
   ```
   Он создаст `config/secrets/master.key`, зашифрует токен Telegram и удалит `dev_password.txt`.

> Эталонные/примерные настройки лежат в `config.example/` (копия бывшего `examples/config`). Любые изменения в рабочих файлах `config/` остаются только на локальной машине.
