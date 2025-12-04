export const config = {
    port: process.env.PORT || 8090,
    mqttUrl: process.env.MQTT_URL || '',
    telemetryIntervalMs: Number(process.env.TELEMETRY_INTERVAL_MS || 3000),
    pingIntervalMs: Number(process.env.PING_INTERVAL_MS || 10000),
    environment: process.env.NODE_ENV || 'production'
  };