#!/usr/bin/env python3
"""
Интерактивный мастер первого запуска EDGE.

Проводит пользователя через:
1. Валидацию окружения
2. Выбор режима работы (real hardware / simulation)
3. Копирование конфигураций
4. Настройку секретов (опционально)
5. Сканирование устройств (опционально)
"""

from __future__ import annotations

import getpass
import glob
import os
import platform
import shutil
import subprocess
import sys
from pathlib import Path
from types import SimpleNamespace

EDGE_DIR = Path(__file__).resolve().parent.parent
PROJECT_ROOT = EDGE_DIR.parent
CONFIG_DIR = EDGE_DIR / "config"
CONFIG_EXAMPLE_DIR = EDGE_DIR / "config.example"

sys.path.insert(0, str(EDGE_DIR))

from tools import security_cli, telegram_secrets_cli

# ANSI colors
GREEN = "\033[92m"
YELLOW = "\033[93m"
RED = "\033[91m"
BLUE = "\033[94m"
RESET = "\033[0m"
BOLD = "\033[1m"


def print_header(text: str) -> None:
    """Печать заголовка секции"""
    print(f"\n{BOLD}{BLUE}{'=' * 60}{RESET}")
    print(f"{BOLD}{BLUE}{text}{RESET}")
    print(f"{BOLD}{BLUE}{'=' * 60}{RESET}\n")


def print_step(number: int, title: str) -> None:
    """Печать номера шага"""
    print(f"\n{BOLD}{GREEN}[{number}] {title}{RESET}")
    print(f"{'-' * 60}")


def prompt_bool(message: str, default: bool = True) -> bool:
    """Интерактивный запрос yes/no"""
    suffix = "[Y/n]" if default else "[y/N]"
    while True:
        answer = input(f"{message} {suffix} ").strip().lower()
        if not answer:
            return default
        if answer in {"y", "yes", "д", "да"}:
            return True
        if answer in {"n", "no", "н", "нет"}:
            return False


def prompt_choice(message: str, options: list[str], default: int = 0) -> int:
    """Интерактивный выбор из списка"""
    print(f"\n{message}")
    for i, option in enumerate(options, 1):
        marker = "→" if i - 1 == default else " "
        print(f"  {marker} {i}. {option}")

    while True:
        choice = input(f"\nВыберите вариант [1-{len(options)}] (Enter = {default + 1}): ").strip()
        if not choice:
            return default
        try:
            idx = int(choice) - 1
            if 0 <= idx < len(options):
                return idx
        except ValueError:
            pass
        print(f"{RED}⚠️  Неверный ввод. Введите число от 1 до {len(options)}{RESET}")


def run_validation() -> bool:
    """Запуск валидации окружения"""
    print_step(1, "Проверка окружения")

    validator = EDGE_DIR / "tools" / "validate_setup.py"
    if not validator.exists():
        print(f"{YELLOW}⚠️  Скрипт валидации не найден, пропускаем...{RESET}")
        return True

    try:
        result = subprocess.run([sys.executable, str(validator)], check=False)
        if result.returncode == 0:
            return True
        else:
            print(f"\n{YELLOW}⚠️  Найдены проблемы с окружением{RESET}")
            if not prompt_bool("Продолжить несмотря на проблемы?", default=False):
                return False
            return True
    except Exception as e:
        print(f"{YELLOW}⚠️  Ошибка валидации: {e}{RESET}")
        return True


def detect_serial_ports() -> list[str]:
    """Поиск доступных RS-485/Serial портов"""
    ports = []
    system = platform.system()

    if system == "Linux":
        for pattern in ["/dev/ttyUSB*", "/dev/ttyACM*", "/dev/ttyS*"]:
            ports.extend(glob.glob(pattern))
    elif system == "Darwin":  # macOS
        for pattern in ["/dev/tty.usb*", "/dev/cu.usb*", "/dev/tty.wchusbserial*"]:
            ports.extend(glob.glob(pattern))
    elif system == "Windows":
        try:
            import serial.tools.list_ports
            ports = [port.device for port in serial.tools.list_ports.comports()]
        except ImportError:
            pass

    return sorted(ports)


def choose_mode() -> tuple[str, str | None]:
    """
    Выбор режима работы: real hardware или simulation

    Returns:
        (mode, port): mode = 'real' | 'simulation', port = путь к порту или None
    """
    print_step(2, "Выбор режима работы")

    ports = detect_serial_ports()

    if ports:
        print(f"{GREEN}✅ Найдены RS-485/Serial порты:{RESET}")
        for i, port in enumerate(ports, 1):
            print(f"   {i}. {port}")
        print()

        options = [
            "Real Hardware - работа с реальными устройствами через RS-485",
            "Simulation Mode - виртуальные устройства для тестирования (без оборудования)"
        ]
        choice = prompt_choice("Выберите режим работы:", options, default=0)

        if choice == 0:  # Real hardware
            if len(ports) == 1:
                selected_port = ports[0]
                print(f"\n{GREEN}→ Используется порт: {selected_port}{RESET}")
            else:
                print(f"\nВыберите RS-485 порт:")
                for i, port in enumerate(ports, 1):
                    print(f"  {i}. {port}")
                port_idx = int(input(f"Порт [1-{len(ports)}] (Enter = 1): ").strip() or "1") - 1
                selected_port = ports[port_idx]

            return "real", selected_port
        else:  # Simulation
            return "simulation", None
    else:
        print(f"{YELLOW}⚠️  RS-485/Serial порты не найдены{RESET}")
        print(f"\n{BLUE}Будет использован Simulation Mode{RESET}")
        print("(Виртуальные устройства для тестирования без реального оборудования)")
        return "simulation", None


def setup_config(mode: str, port: str | None) -> bool:
    """Настройка конфигурации"""
    print_step(3, "Настройка конфигурации")

    # Проверяем существует ли config/
    if CONFIG_DIR.exists():
        print(f"{GREEN}✅ Конфигурация уже существует: {CONFIG_DIR}{RESET}")
        if not prompt_bool("Перезаписать конфигурацию?", default=False):
            return True

    # Копируем config.example → config
    if not CONFIG_EXAMPLE_DIR.exists():
        print(f"{RED}❌ Не найдена директория {CONFIG_EXAMPLE_DIR}{RESET}")
        return False

    try:
        if CONFIG_DIR.exists():
            print(f"Удаление старой конфигурации...")
            shutil.rmtree(CONFIG_DIR)

        print(f"Копирование config.example → config...")
        shutil.copytree(CONFIG_EXAMPLE_DIR, CONFIG_DIR)
        print(f"{GREEN}✅ Конфигурация скопирована{RESET}")

        # Обновляем app_config.yaml в зависимости от режима
        app_config = CONFIG_DIR / "app_config.yaml"
        if app_config.exists():
            config_text = app_config.read_text()

            if mode == "simulation":
                # Для симуляции включаем offline mode
                config_text = config_text.replace(
                    "offline_mode: false",
                    "offline_mode: true  # Auto-configured by first_start.py"
                )
                config_text = config_text.replace(
                    "offline_mode: true",
                    "offline_mode: true  # Auto-configured by first_start.py",
                    1
                )
                print(f"{BLUE}ℹ️  Включен offline_mode для симуляции{RESET}")
            elif port:
                # Для real hardware обновляем порт
                import re
                config_text = re.sub(
                    r"port: /dev/[^\s]+",
                    f"port: {port}  # Auto-configured by first_start.py",
                    config_text
                )
                print(f"{BLUE}ℹ️  RS-485 порт настроен: {port}{RESET}")

            app_config.write_text(config_text)

        return True

    except Exception as e:
        print(f"{RED}❌ Ошибка копирования конфигурации: {e}{RESET}")
        return False


def ensure_master_password() -> None:
    """Настройка мастер-пароля для шифрования"""
    print_step(4, "Настройка секретов (опционально)")

    if not prompt_bool("Настроить мастер-пароль для шифрования секретов?", default=False):
        print(f"{BLUE}⏭️  Пропущено. Можно настроить позже: python tools/security_cli.py{RESET}")
        return

    secrets_dir = CONFIG_DIR / "secrets"
    secrets_dir.mkdir(parents=True, exist_ok=True)
    master_password_file = secrets_dir / "master_password.txt"

    if master_password_file.exists():
        print(f"ℹ️  Мастер-пароль уже сохранён в {master_password_file}")
        if not prompt_bool("Перезаписать мастер-пароль?", default=False):
            return

    password = getpass.getpass("Введите мастер-пароль (или Enter для пропуска): ")
    if not password:
        print(f"{BLUE}⏭️  Пропущено{RESET}")
        return

    confirm = getpass.getpass("Повторите мастер-пароль: ")
    if password != confirm:
        print(f"{RED}❌ Пароли не совпадают{RESET}")
        return

    try:
        args = SimpleNamespace(password=password, force=True)
        security_cli.cmd_set_master_password(args)
        print(f"{GREEN}✅ Мастер-пароль сохранён{RESET}")
    except Exception as e:
        print(f"{RED}❌ Ошибка сохранения мастер-пароля: {e}{RESET}")


def configure_telegram_token() -> None:
    """Настройка Telegram бота"""
    print_step(5, "Настройка Telegram бота (опционально)")

    if not prompt_bool("Настроить Telegram бота сейчас?", default=False):
        print(f"{BLUE}⏭️  Пропущено. Можно настроить позже: python tools/telegram_secrets_cli.py{RESET}")
        return

    token = getpass.getpass("Введите TELEGRAM_BOT_TOKEN (от @BotFather): ").strip()
    if not token:
        print(f"{BLUE}⏭️  Токен не указан{RESET}")
        return

    try:
        telegram_secrets_cli.set_token(token)
        print(f"{GREEN}✅ Telegram токен сохранён{RESET}")

        if prompt_bool("Добавить admin user IDs?", default=False):
            print("Введите Telegram User IDs админов через запятую")
            print("(Узнать свой ID: напишите @userinfobot в Telegram)")
            admins = input("Admin IDs: ").strip()
            if admins:
                telegram_secrets_cli.set_admins(admins)
                print(f"{GREEN}✅ Admin IDs сохранены{RESET}")
    except Exception as e:
        print(f"{RED}❌ Ошибка настройки Telegram: {e}{RESET}")


def run_device_scan(mode: str, port: str | None) -> None:
    """Запуск сканирования устройств"""
    print_step(6, "Сканирование устройств")

    if mode == "simulation":
        print(f"{BLUE}ℹ️  В режиме симуляции автоскан не требуется{RESET}")
        print(f"   Устройства будут созданы автоматически симулятором")
        return

    if not prompt_bool("Запустить сканирование RS-485 шины?", default=True):
        print(f"{BLUE}⏭️  Пропущено{RESET}")
        return

    # Параметры сканирования
    start_id = input("Начальный Slave ID [1]: ").strip() or "1"
    end_id = input("Конечный Slave ID [10]: ").strip() or "10"

    try:
        from tools import scan_slave_ids

        print(f"\n{BLUE}🔍 Запуск сканирования Slave IDs {start_id}-{end_id}...{RESET}\n")

        # Устанавливаем переменные окружения для автоматического режима
        os.environ["EDGE_SCAN_SKIP_CONFIRM"] = "true"
        os.environ["EDGE_SCAN_AUTO_UPDATE"] = "true"

        # Запускаем сканирование
        scan_slave_ids.main([start_id, end_id])

        print(f"\n{GREEN}✅ Сканирование завершено{RESET}")

    except ImportError:
        print(f"{YELLOW}⚠️  Модуль scan_slave_ids не найден{RESET}")
    except KeyboardInterrupt:
        print(f"\n{YELLOW}🛑 Сканирование прервано пользователем{RESET}")
    except Exception as e:
        print(f"{RED}❌ Ошибка сканирования: {e}{RESET}")


def print_summary(mode: str, port: str | None) -> None:
    """Печать итогов настройки и команд для запуска"""
    print_header("🎉 Настройка завершена!")

    print(f"{BOLD}Режим работы:{RESET} {mode}")
    if port:
        print(f"{BOLD}RS-485 порт:{RESET} {port}")

    print(f"\n{BOLD}📁 Созданные файлы:{RESET}")
    print(f"   • config/ - конфигурация системы")
    print(f"   • config/app_config.yaml - основные настройки")
    print(f"   • config/devices.yaml - реестр устройств")

    print(f"\n{BOLD}🚀 Как запустить EDGE:{RESET}\n")

    if mode == "simulation":
        print(f"{GREEN}Режим Simulation:{RESET}")
        print(f"  1. Запустите симулятор (в отдельном терминале):")
        print(f"     {BOLD}python tools/simulators/rtu_bus_sim.py --kub 1-2 --vfd 3-4{RESET}")
        print()
        print(f"  2. После появления сообщения о PTY порте, запустите EDGE:")
        print(f"     {BOLD}python start.py --offline{RESET}")
    else:
        print(f"{GREEN}Режим Real Hardware:{RESET}")
        print(f"     {BOLD}python start.py{RESET}")

    print(f"\n{BOLD}📊 Dashboard:{RESET}")
    print(f"     {BOLD}python start_dashboard.py{RESET}")
    print(f"     Откроется в браузере: http://localhost:8501")

    print(f"\n{BOLD}📖 Дополнительная информация:{RESET}")
    print(f"   • README.md - основная документация")
    print(f"   • docs/USER_GUIDE.md - руководство пользователя")
    print(f"   • docs/GUI_INTEGRATION_GUIDE.md - для разработчиков GUI")

    print(f"\n{GREEN}Успешного запуска! 🎯{RESET}\n")


def main() -> int:
    """Главная функция мастера первого запуска"""
    os.chdir(EDGE_DIR)

    print_header("🚀 EDGE First Start Wizard")
    print("Этот мастер поможет настроить EDGE для первого запуска")

    try:
        # Шаг 1: Валидация окружения
        if not run_validation():
            print(f"\n{RED}❌ Валидация не пройдена. Исправьте проблемы и запустите снова.{RESET}")
            return 1

        # Шаг 2: Выбор режима
        mode, port = choose_mode()

        # Шаг 3: Настройка конфигурации
        if not setup_config(mode, port):
            print(f"\n{RED}❌ Ошибка настройки конфигурации{RESET}")
            return 1

        # Шаг 4: Секреты (опционально)
        ensure_master_password()

        # Шаг 5: Telegram (опционально)
        configure_telegram_token()

        # Шаг 6: Сканирование устройств (опционально)
        if mode == "real":
            run_device_scan(mode, port)

        # Итоги
        print_summary(mode, port)

        return 0

    except KeyboardInterrupt:
        print(f"\n\n{YELLOW}🛑 Мастер прерван пользователем{RESET}")
        return 130
    except Exception as e:
        print(f"\n{RED}❌ Неожиданная ошибка: {e}{RESET}")
        import traceback
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
