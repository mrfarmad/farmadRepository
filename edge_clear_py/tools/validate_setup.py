#!/usr/bin/env python3
"""
EDGE Environment Validation Script
Проверяет готовность окружения к запуску EDGE системы
"""

import os
import platform
import shutil
import sqlite3
import subprocess
import sys
from pathlib import Path
from typing import List, Tuple

# ANSI color codes
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


def print_check(name: str, status: bool, message: str = "") -> None:
    """Печать результата проверки"""
    icon = f"{GREEN}✅{RESET}" if status else f"{RED}❌{RESET}"
    print(f"{icon} {name}")
    if message:
        indent = "   "
        print(f"{indent}{message}")


def print_warning(name: str, message: str = "") -> None:
    """Печать предупреждения"""
    print(f"{YELLOW}⚠️{RESET}  {name}")
    if message:
        indent = "   "
        print(f"{indent}{message}")


def check_python_version() -> Tuple[bool, str]:
    """Проверка версии Python >= 3.10"""
    version = sys.version_info
    current = f"{version.major}.{version.minor}.{version.micro}"

    if version.major >= 3 and version.minor >= 10:
        return True, f"Python {current}"
    else:
        return False, f"Python {current} (требуется >= 3.10)"


def check_dependencies() -> Tuple[bool, List[str]]:
    """Проверка установленных зависимостей"""
    required = [
        "pydantic",
        "pymodbus",
        "pyserial",
        "fastapi",
        "uvicorn",
        "streamlit",
        "telegram",
        "aiosqlite",
        "pyyaml",
        "cryptography",
    ]

    missing = []
    for package in required:
        try:
            __import__(package.replace("-", "_"))
        except ImportError:
            missing.append(package)

    return len(missing) == 0, missing


def check_config_directory() -> Tuple[bool, str]:
    """Проверка наличия config/ директории"""
    edge_root = Path(__file__).parent.parent
    config_dir = edge_root / "config"

    if config_dir.exists():
        return True, f"Найдена: {config_dir}"
    else:
        return False, f"Не найдена. Скопируйте: cp -R config.example config"


def check_serial_ports() -> Tuple[int, List[str]]:
    """Поиск доступных serial портов"""
    ports = []

    system = platform.system()

    if system == "Linux":
        # Linux: /dev/ttyUSB*, /dev/ttyACM*
        for pattern in ["/dev/ttyUSB*", "/dev/ttyACM*", "/dev/ttyS*"]:
            import glob
            ports.extend(glob.glob(pattern))

    elif system == "Darwin":  # macOS
        # macOS: /dev/tty.usb*, /dev/cu.usb*
        import glob
        for pattern in ["/dev/tty.usb*", "/dev/cu.usb*", "/dev/tty.wchusbserial*"]:
            ports.extend(glob.glob(pattern))

    elif system == "Windows":
        # Windows: COM1-COM256
        try:
            import serial.tools.list_ports
            ports = [port.device for port in serial.tools.list_ports.comports()]
        except ImportError:
            pass

    return len(ports), ports


def check_sqlite() -> Tuple[bool, str]:
    """Проверка работоспособности SQLite"""
    try:
        conn = sqlite3.connect(":memory:")
        cursor = conn.cursor()
        cursor.execute("SELECT sqlite_version()")
        version = cursor.fetchone()[0]
        conn.close()
        return True, f"SQLite {version}"
    except Exception as e:
        return False, f"Ошибка SQLite: {e}"


def check_storage_permissions() -> Tuple[bool, str]:
    """Проверка прав на создание storage/ директории"""
    edge_root = Path(__file__).parent.parent
    storage_dir = edge_root / "storage"

    try:
        storage_dir.mkdir(parents=True, exist_ok=True)
        test_file = storage_dir / ".write_test"
        test_file.write_text("test")
        test_file.unlink()
        return True, f"Доступна: {storage_dir}"
    except Exception as e:
        return False, f"Нет прав записи: {e}"


def check_simulator_available() -> Tuple[bool, str]:
    """Проверка доступности симулятора RTU"""
    edge_root = Path(__file__).parent.parent
    simulator = edge_root / "tools" / "simulators" / "rtu_bus_sim.py"

    if simulator.exists():
        return True, f"Симулятор найден: {simulator.name}"
    else:
        return False, "Симулятор не найден"


def check_git_repository() -> Tuple[bool, str]:
    """Проверка что это git репозиторий"""
    edge_root = Path(__file__).parent.parent
    git_dir = edge_root / ".git"

    if git_dir.exists():
        try:
            result = subprocess.run(
                ["git", "rev-parse", "--short", "HEAD"],
                cwd=edge_root,
                capture_output=True,
                text=True,
                timeout=5
            )
            if result.returncode == 0:
                commit = result.stdout.strip()
                return True, f"Git commit: {commit}"
        except Exception:
            pass
        return True, "Git репозиторий"
    else:
        return False, "Не git репозиторий"


def print_recommendations(results: dict) -> None:
    """Печать рекомендаций по исправлению проблем"""
    print_header("📋 Рекомендации")

    issues = []

    if not results["python"]:
        issues.append({
            "problem": "Python версия < 3.10",
            "solution": "Установите Python 3.10 или новее: https://www.python.org/downloads/"
        })

    if not results["dependencies"]:
        issues.append({
            "problem": f"Отсутствуют зависимости: {', '.join(results['missing_deps'])}",
            "solution": "Установите зависимости: pip install -e ."
        })

    if not results["config"]:
        issues.append({
            "problem": "Отсутствует config/ директория",
            "solution": "Скопируйте примеры: cp -R config.example config"
        })

    if results["serial_count"] == 0:
        issues.append({
            "problem": "Не найдены RS-485 порты",
            "solution": "Варианты:\n" +
                       "      1) Подключите USB-RS485 адаптер\n" +
                       "      2) Запустите в simulation mode:\n" +
                       "         - Терминал 1: python tools/simulators/rtu_bus_sim.py --kub 1-2\n" +
                       "         - Терминал 2: python start.py --offline"
        })

    if not results["storage"]:
        issues.append({
            "problem": "Нет прав на создание storage/",
            "solution": "Проверьте права доступа: chmod +w ."
        })

    if not issues:
        print(f"{GREEN}✅ Все проверки пройдены успешно!{RESET}\n")
        print(f"{BOLD}Следующие шаги:{RESET}")
        print(f"  1. Настройте конфигурацию (опционально):")
        print(f"     python tools/first_start.py")
        print(f"")
        print(f"  2. Запустите EDGE:")
        if results["serial_count"] > 0:
            print(f"     python start.py")
        else:
            print(f"     # Режим симуляции (без реального оборудования):")
            print(f"     python tools/simulators/rtu_bus_sim.py --kub 1-2")
            print(f"     # В другом терминале:")
            print(f"     python start.py --offline")
        print(f"")
        print(f"  3. Откройте dashboard:")
        print(f"     python start_dashboard.py")
    else:
        print(f"{RED}Найдены проблемы, требующие внимания:{RESET}\n")
        for i, issue in enumerate(issues, 1):
            print(f"{BOLD}{i}. {issue['problem']}{RESET}")
            print(f"   {YELLOW}Решение:{RESET} {issue['solution']}")
            print()


def main() -> int:
    """Главная функция"""
    print_header("🔍 EDGE Environment Validation")

    print(f"{BOLD}Система:{RESET} {platform.system()} {platform.release()}")
    print(f"{BOLD}Архитектура:{RESET} {platform.machine()}")
    print()

    results = {}

    # Проверка Python
    print_header("Python Environment")
    py_ok, py_msg = check_python_version()
    print_check("Python версия", py_ok, py_msg)
    results["python"] = py_ok

    # Проверка зависимостей
    print_header("Dependencies")
    deps_ok, missing = check_dependencies()
    results["dependencies"] = deps_ok
    results["missing_deps"] = missing

    if deps_ok:
        print_check("Все зависимости установлены", True)
    else:
        print_check("Зависимости", False, f"Отсутствуют: {', '.join(missing)}")

    # Проверка SQLite
    sqlite_ok, sqlite_msg = check_sqlite()
    print_check("SQLite", sqlite_ok, sqlite_msg)
    results["sqlite"] = sqlite_ok

    # Проверка конфигурации
    print_header("Configuration")
    config_ok, config_msg = check_config_directory()
    print_check("Config директория", config_ok, config_msg)
    results["config"] = config_ok

    # Проверка storage
    storage_ok, storage_msg = check_storage_permissions()
    print_check("Storage директория", storage_ok, storage_msg)
    results["storage"] = storage_ok

    # Проверка serial портов
    print_header("Hardware")
    port_count, ports = check_serial_ports()
    results["serial_count"] = port_count

    if port_count > 0:
        print_check(f"RS-485/Serial порты", True, f"Найдено {port_count} портов")
        for port in ports[:5]:  # Показываем первые 5
            print(f"   • {port}")
        if port_count > 5:
            print(f"   ... и еще {port_count - 5}")
    else:
        print_warning("RS-485/Serial порты", "Не найдены (можно использовать симулятор)")

    # Проверка симулятора
    sim_ok, sim_msg = check_simulator_available()
    print_check("RTU Simulator", sim_ok, sim_msg)
    results["simulator"] = sim_ok

    # Проверка Git
    print_header("Development")
    git_ok, git_msg = check_git_repository()
    print_check("Git репозиторий", git_ok, git_msg)
    results["git"] = git_ok

    # Рекомендации
    print_recommendations(results)

    # Итоговый статус
    critical_checks = [results["python"], results["dependencies"], results["sqlite"]]
    all_critical_ok = all(critical_checks)

    if all_critical_ok:
        print(f"\n{GREEN}{BOLD}🚀 Система готова к запуску EDGE!{RESET}\n")
        return 0
    else:
        print(f"\n{RED}{BOLD}❌ Исправьте критические проблемы перед запуском{RESET}\n")
        return 1


if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        print(f"\n\n{YELLOW}⚠️  Проверка прервана пользователем{RESET}")
        sys.exit(130)
