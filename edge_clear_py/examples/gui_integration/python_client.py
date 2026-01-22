#!/usr/bin/env python3
"""
file: examples/gui_integration/python_client.py
description: Пример Python клиента для EDGE WebSocket API
author: EDGE Full-Stack RS485 Senior Engineer

Usage:
    python python_client.py --host edge.local --port 8000
"""

import asyncio
import json
import logging
import sys
from argparse import ArgumentParser
from datetime import datetime
from typing import Dict, Any

try:
    import websockets
except ImportError:
    print("❌ Error: websockets library not installed")
    print("Install: pip install websockets")
    sys.exit(1)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s'
)
logger = logging.getLogger(__name__)


class EDGEClient:
    """WebSocket client для EDGE Gateway"""

    def __init__(self, host: str = "localhost", port: int = 8000):
        self.host = host
        self.port = port
        self.uri = f"ws://{host}:{port}"
        self.devices: Dict[int, Dict[str, Any]] = {}
        self.websocket = None

    async def connect(self):
        """Подключение к EDGE WebSocket"""
        try:
            self.websocket = await websockets.connect(self.uri)
            logger.info(f"✅ Connected to EDGE at {self.uri}")

            # Запрос текущих данных
            await self.send_command({"cmd": "get"})

        except Exception as e:
            logger.error(f"❌ Connection failed: {e}")
            raise

    async def send_command(self, command: Dict[str, Any]):
        """Отправка команды на EDGE"""
        if not self.websocket:
            raise RuntimeError("Not connected")

        message = json.dumps(command)
        await self.websocket.send(message)
        logger.debug(f"📤 Sent: {message}")

    async def receive_loop(self):
        """Цикл получения данных от EDGE"""
        try:
            async for message in self.websocket:
                await self.handle_message(message)

        except websockets.exceptions.ConnectionClosed:
            logger.warning("⚠️ Connection closed")
        except Exception as e:
            logger.error(f"❌ Error in receive loop: {e}")

    async def handle_message(self, message: str):
        """Обработка сообщения от EDGE"""
        try:
            data = json.loads(message)
            device_id = data.get("device_id")

            if device_id:
                self.devices[device_id] = data
                self.display_device(data)

        except json.JSONDecodeError:
            logger.warning(f"⚠️ Invalid JSON: {message}")

    def display_device(self, device: Dict[str, Any]):
        """Отображение данных устройства"""
        device_id = device.get("device_id")
        device_type = device.get("device_type")
        status = device.get("connection_status")
        timestamp = device.get("timestamp", "")

        # Форматирование времени
        try:
            dt = datetime.fromisoformat(timestamp)
            time_str = dt.strftime("%H:%M:%S")
        except:
            time_str = timestamp

        # Базовая информация
        print(f"\n{'='*60}")
        print(f"🔌 Device #{device_id} - {device_type}")
        print(f"Status: {self._format_status(status)}")
        print(f"Time: {time_str}")
        print(f"{'-'*60}")

        # Данные в зависимости от типа устройства
        if "КУБ" in device_type:
            self._display_kub_data(device)
        elif "VFD" in device_type or "INVERTER" in device_type:
            self._display_vfd_data(device)

        # Аварии
        alarms = device.get("alarms", [])
        if alarms:
            print(f"⚠️  ALARMS: {', '.join(alarms)}")

        warnings = device.get("warnings", [])
        if warnings:
            print(f"⚠️  Warnings: {', '.join(warnings)}")

    def _display_kub_data(self, device: Dict[str, Any]):
        """Отображение данных КУБ-1063/1112"""
        temp_inside = device.get("temp_inside")
        temp_outside = device.get("temp_outside")
        humidity = device.get("humidity")
        co2 = device.get("co2")
        nh3 = device.get("nh3")

        if temp_inside is not None:
            print(f"🌡️  Temp Inside:  {temp_inside:.1f}°C")
        if temp_outside is not None:
            print(f"🌡️  Temp Outside: {temp_outside:.1f}°C")
        if humidity is not None:
            print(f"💧 Humidity:     {humidity:.1f}%")
        if co2 is not None:
            print(f"💨 CO2:          {co2} ppm")
        if nh3 is not None:
            print(f"💨 NH3:          {nh3} ppm")

        vent_level = device.get("ventilation_level")
        heat_level = device.get("heating_level")

        if vent_level is not None:
            print(f"🌀 Ventilation:  {vent_level}%")
        if heat_level is not None:
            print(f"🔥 Heating:      {heat_level}%")

    def _display_vfd_data(self, device: Dict[str, Any]):
        """Отображение данных VFD инвертора"""
        running_freq = device.get("running_frequency")
        running_speed = device.get("running_speed")
        output_current = device.get("output_current")
        output_power = device.get("output_power")
        motor_temp = device.get("motor_temperature")
        igbt_temp = device.get("igbt_temperature")

        if running_freq is not None:
            print(f"⚡ Frequency:    {running_freq:.1f} Hz")
        if running_speed is not None:
            print(f"🔄 Speed:        {running_speed} RPM")
        if output_current is not None:
            print(f"⚡ Current:      {output_current:.1f} A")
        if output_power is not None:
            print(f"⚡ Power:        {output_power:.1f} kW")
        if motor_temp is not None:
            print(f"🌡️  Motor Temp:   {motor_temp}°C")
        if igbt_temp is not None:
            print(f"🌡️  IGBT Temp:    {igbt_temp}°C")

    def _format_status(self, status: str) -> str:
        """Форматирование статуса с цветом"""
        symbols = {
            "connected": "✅",
            "partial": "⚠️ ",
            "error": "❌",
            "disconnected": "🔌"
        }
        return f"{symbols.get(status, '❓')} {status.upper()}"

    def print_summary(self):
        """Вывод summary всех устройств"""
        print(f"\n{'='*60}")
        print(f"📊 EDGE Summary - Total devices: {len(self.devices)}")
        print(f"{'='*60}")

        for device_id, device in sorted(self.devices.items()):
            status = device.get("connection_status")
            device_type = device.get("device_type")
            alarms = device.get("active_alarms", 0)

            status_icon = self._format_status(status).split()[0]
            alarm_str = f" ⚠️ {alarms}" if alarms > 0 else ""

            print(f"{status_icon} Device #{device_id:2d} - {device_type:15s}{alarm_str}")

    async def run(self):
        """Главный цикл клиента"""
        await self.connect()

        try:
            await self.receive_loop()
        except KeyboardInterrupt:
            logger.info("\n👋 Closing connection...")
        finally:
            if self.websocket:
                await self.websocket.close()

            # Финальный summary
            self.print_summary()


async def main():
    """Entry point"""
    parser = ArgumentParser(description="EDGE WebSocket Python Client")
    parser.add_argument("--host", default="localhost", help="EDGE host")
    parser.add_argument("--port", type=int, default=8000, help="WebSocket port")
    parser.add_argument("--debug", action="store_true", help="Enable debug logging")

    args = parser.parse_args()

    if args.debug:
        logging.getLogger().setLevel(logging.DEBUG)

    client = EDGEClient(host=args.host, port=args.port)

    try:
        await client.run()
    except Exception as e:
        logger.error(f"❌ Fatal error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n👋 Goodbye!")
