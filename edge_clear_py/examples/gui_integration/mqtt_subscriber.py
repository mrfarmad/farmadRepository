#!/usr/bin/env python3
"""
file: examples/gui_integration/mqtt_subscriber.py
description: Пример MQTT subscriber для EDGE событий
author: EDGE Full-Stack RS485 Senior Engineer

Usage:
    pip install paho-mqtt
    python mqtt_subscriber.py --broker edge.local --topics "cube_rs/#"
"""

import json
import logging
import sys
from argparse import ArgumentParser
from datetime import datetime

try:
    import paho.mqtt.client as mqtt
except ImportError:
    print("❌ Error: paho-mqtt library not installed")
    print("Install: pip install paho-mqtt")
    sys.exit(1)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s'
)
logger = logging.getLogger(__name__)


class EDGEMQTTSubscriber:
    """MQTT Subscriber для EDGE событий"""

    def __init__(
        self,
        broker: str = "localhost",
        port: int = 1883,
        topic_prefix: str = "cube_rs",
        username: str = None,
        password: str = None
    ):
        self.broker = broker
        self.port = port
        self.topic_prefix = topic_prefix

        self.client = mqtt.Client(client_id="edge_gui_subscriber")

        if username and password:
            self.client.username_pw_set(username, password)

        self.client.on_connect = self.on_connect
        self.client.on_message = self.on_message
        self.client.on_disconnect = self.on_disconnect

        self.device_states = {}

    def on_connect(self, client, userdata, flags, rc):
        """Callback при подключении"""
        if rc == 0:
            logger.info(f"✅ Connected to MQTT broker at {self.broker}:{self.port}")

            # Подписка на все топики EDGE
            topics = [
                f"{self.topic_prefix}/devices/+/data",
                f"{self.topic_prefix}/devices/+/alarms",
                f"{self.topic_prefix}/system/status"
            ]

            for topic in topics:
                client.subscribe(topic)
                logger.info(f"📡 Subscribed to: {topic}")

        else:
            logger.error(f"❌ Connection failed with code {rc}")

    def on_disconnect(self, client, userdata, rc):
        """Callback при отключении"""
        if rc != 0:
            logger.warning(f"⚠️ Unexpected disconnect (rc={rc}), reconnecting...")
        else:
            logger.info("👋 Disconnected from broker")

    def on_message(self, client, userdata, msg):
        """Callback при получении сообщения"""
        topic = msg.topic
        payload = msg.payload.decode('utf-8')

        try:
            data = json.loads(payload)
        except json.JSONDecodeError:
            logger.warning(f"⚠️ Invalid JSON in topic {topic}: {payload}")
            return

        # Маршрутизация по топикам
        if '/data' in topic:
            self.handle_device_data(topic, data)
        elif '/alarms' in topic:
            self.handle_alarms(topic, data)
        elif '/status' in topic:
            self.handle_system_status(data)
        else:
            logger.debug(f"📩 Unknown topic: {topic}")

    def handle_device_data(self, topic: str, data: dict):
        """Обработка данных устройства"""
        device_id = data.get("device_id")
        timestamp = data.get("timestamp", "")

        # Сохраняем состояние
        self.device_states[device_id] = data

        # Форматируем время
        try:
            dt = datetime.fromisoformat(timestamp)
            time_str = dt.strftime("%H:%M:%S")
        except:
            time_str = timestamp

        # Выводим ключевые метрики
        print(f"\n📊 Device #{device_id} Update [{time_str}]")

        if "temp_inside" in data:
            temp = data["temp_inside"]
            print(f"  🌡️  Temperature: {temp:.1f}°C")

        if "humidity" in data:
            humidity = data["humidity"]
            print(f"  💧 Humidity: {humidity:.1f}%")

        if "running_frequency" in data:
            freq = data["running_frequency"]
            print(f"  ⚡ Frequency: {freq:.1f} Hz")

        status = data.get("connection_status", "unknown")
        print(f"  Status: {status}")

    def handle_alarms(self, topic: str, data: dict):
        """Обработка аварий"""
        device_id = data.get("device_id")
        alarms = data.get("alarms", [])
        severity = data.get("severity", "unknown")
        timestamp = data.get("timestamp", "")

        if alarms:
            print(f"\n⚠️  ALARM - Device #{device_id}")
            print(f"  Severity: {severity.upper()}")
            print(f"  Alarms: {', '.join(alarms)}")
            print(f"  Time: {timestamp}")

            # Здесь можно добавить отправку уведомлений, запись в лог и т.д.

    def handle_system_status(self, data: dict):
        """Обработка статуса системы"""
        status = data.get("status")
        devices_online = data.get("devices_online", 0)
        devices_total = data.get("devices_total", 0)
        uptime = data.get("uptime_seconds", 0)

        print(f"\n🖥️  System Status: {status.upper()}")
        print(f"  Devices: {devices_online}/{devices_total} online")
        print(f"  Uptime: {uptime // 3600}h {(uptime % 3600) // 60}m")

    def print_summary(self):
        """Вывод summary всех устройств"""
        print(f"\n{'='*60}")
        print(f"📊 Devices Summary - Total: {len(self.device_states)}")
        print(f"{'='*60}")

        for device_id, data in sorted(self.device_states.items()):
            status = data.get("connection_status", "unknown")
            device_type = data.get("device_type", "Unknown")

            status_icon = "✅" if status == "connected" else "❌"
            print(f"{status_icon} Device #{device_id:2d} - {device_type} ({status})")

    def run(self):
        """Запуск subscriber"""
        logger.info(f"🚀 Starting MQTT subscriber...")
        logger.info(f"Broker: {self.broker}:{self.port}")
        logger.info(f"Topic prefix: {self.topic_prefix}")

        try:
            self.client.connect(self.broker, self.port, 60)
            self.client.loop_forever()

        except KeyboardInterrupt:
            logger.info("\n👋 Shutting down...")
            self.print_summary()

        except Exception as e:
            logger.error(f"❌ Error: {e}")
            raise

        finally:
            self.client.disconnect()


def main():
    """Entry point"""
    parser = ArgumentParser(description="EDGE MQTT Subscriber")
    parser.add_argument("--broker", default="localhost", help="MQTT broker host")
    parser.add_argument("--port", type=int, default=1883, help="MQTT broker port")
    parser.add_argument("--prefix", default="cube_rs", help="Topic prefix")
    parser.add_argument("--username", help="MQTT username")
    parser.add_argument("--password", help="MQTT password")
    parser.add_argument("--debug", action="store_true", help="Enable debug logging")

    args = parser.parse_args()

    if args.debug:
        logging.getLogger().setLevel(logging.DEBUG)

    subscriber = EDGEMQTTSubscriber(
        broker=args.broker,
        port=args.port,
        topic_prefix=args.prefix,
        username=args.username,
        password=args.password
    )

    try:
        subscriber.run()
    except Exception as e:
        logger.error(f"❌ Fatal error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
