.PHONY: help install validate setup run run-edge run-dashboard demo demo-sim lint fmt test clean

PYTHON ?= python3
VENV ?= .venv

# По умолчанию показываем help
.DEFAULT_GOAL := help

help:  ## Показать доступные команды
	@echo "EDGE - Промышленный IoT Gateway"
	@echo ""
	@echo "Доступные команды:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'
	@echo ""
	@echo "Быстрый старт:"
	@echo "  make install     # установить зависимости"
	@echo "  make validate    # проверить окружение"
	@echo "  make setup       # интерактивная настройка"
	@echo "  make run         # запустить EDGE"

install:  ## Установить зависимости
	@echo "📦 Установка зависимостей..."
	$(PYTHON) -m pip install --upgrade pip
	$(PYTHON) -m pip install -e .
	@echo "✅ Зависимости установлены!"

validate:  ## Проверить окружение (Python, зависимости, порты)
	@echo "🔍 Проверка окружения..."
	$(PYTHON) tools/validate_setup.py

setup:  ## Интерактивная настройка (первый запуск)
	@echo "🚀 Запуск мастера настройки..."
	$(PYTHON) tools/first_start.py

run:  ## Запустить EDGE в production режиме
	@echo "🚀 Запуск EDGE..."
	$(PYTHON) start.py

run-edge:  ## Запустить EDGE (алиас для 'run')
	@$(MAKE) run

run-dashboard:  ## Запустить веб-dashboard на порту 8501
	@echo "📊 Запуск Dashboard..."
	$(PYTHON) start_dashboard.py

demo:  ## Demo режим: симулятор + EDGE (для тестирования без оборудования)
	@echo "🎮 Запуск EDGE в demo режиме..."
	@echo "⚠️  Для корректной работы запустите симулятор в отдельном терминале:"
	@echo "    python tools/simulators/rtu_bus_sim.py --kub 1-2 --vfd 3-4"
	@echo ""
	@echo "Нажмите Enter когда симулятор запущен..."
	@read dummy
	$(PYTHON) start.py --offline

demo-sim:  ## Запустить только симулятор устройств
	@echo "🎮 Запуск симулятора устройств..."
	$(PYTHON) tools/simulators/rtu_bus_sim.py --kub 1-2 --vfd 3-4

test:  ## Запустить тесты
	@echo "🧪 Запуск тестов..."
	$(PYTHON) -m pytest -q

lint:  ## Проверить код (ruff)
	@echo "🔍 Проверка кода..."
	$(PYTHON) -m ruff check .

fmt:  ## Форматировать код (ruff)
	@echo "✨ Форматирование кода..."
	$(PYTHON) -m ruff format .

clean:  ## Очистить временные файлы
	@echo "🧹 Очистка..."
	rm -rf build dist *.egg-info __pycache__
	find . -name '__pycache__' -type d -exec rm -rf {} +
	find . -name '*.pyc' -delete
	@echo "✅ Очистка завершена!"
