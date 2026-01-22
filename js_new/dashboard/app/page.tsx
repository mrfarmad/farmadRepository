/**
 * Main Dashboard Page
 * Real-time monitoring and control interface
 */

'use client';

import { useState, useCallback } from 'react';
import { useWebSocket, DeviceData } from '@/lib/websocket';
import DeviceCard from '@/components/DeviceCard';
import AlarmPanel from '@/components/AlarmPanel';
import SystemStatus from '@/components/SystemStatus';

const WEBSOCKET_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000';

export default function Dashboard() {
  const [devices, setDevices] = useState<Map<number, DeviceData>>(new Map());
  const [alarms, setAlarms] = useState<unknown[]>([]);
  const [warnings, setWarnings] = useState<unknown[]>([]);

  const handleDeviceData = useCallback((data: DeviceData) => {
    setDevices((prev) => {
      const next = new Map(prev);
      next.set(data.device_id, data);
      return next;
    });

    // Update alarms and warnings
    if (data.alarms && data.alarms.length > 0) {
      setAlarms((prev) => [
        ...prev,
        {
          device_id: data.device_id,
          device_type: data.device_type,
          messages: data.alarms,
          timestamp: data.timestamp,
        },
      ]);
    }

    if (data.warnings && data.warnings.length > 0) {
      setWarnings((prev) => [
        ...prev,
        {
          device_id: data.device_id,
          device_type: data.device_type,
          messages: data.warnings,
          timestamp: data.timestamp,
        },
      ]);
    }
  }, []);

  const handleAlarm = useCallback((data: unknown) => {
    setAlarms((prev) => [...prev, data]);
  }, []);

  const handleWarning = useCallback((data: unknown) => {
    setWarnings((prev) => [...prev, data]);
  }, []);

  const { isConnected } = useWebSocket({
    url: WEBSOCKET_URL,
    onDeviceData: handleDeviceData,
    onAlarm: handleAlarm,
    onWarning: handleWarning,
  });

  return (
    <div className="space-y-6">
      {/* System Status */}
      <SystemStatus isConnected={isConnected} deviceCount={devices.size} />

      {/* Alarms and Warnings */}
      {(alarms.length > 0 || warnings.length > 0) && (
        <AlarmPanel alarms={alarms} warnings={warnings} />
      )}

      {/* Device Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from(devices.values()).map((device) => (
          <DeviceCard key={device.device_id} device={device} />
        ))}
      </div>

      {/* Empty State */}
      {devices.size === 0 && (
        <div className="card text-center py-12">
          <div className="text-gray-400 mb-4">
            <svg
              className="mx-auto h-12 w-12"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No devices connected
          </h3>
          <p className="text-gray-500">
            {isConnected
              ? 'Waiting for device data...'
              : 'WebSocket disconnected. Attempting to reconnect...'}
          </p>
        </div>
      )}
    </div>
  );
}
