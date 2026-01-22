/**
 * Device Card Component
 * Displays device status and metrics
 */

'use client';

import { DeviceData } from '@/lib/websocket';
import { formatDistanceToNow } from 'date-fns';
import ControlPanel from './ControlPanel';

interface DeviceCardProps {
  device: DeviceData;
}

export default function DeviceCard({ device }: DeviceCardProps) {
  const { device_id, device_type, timestamp, registers, alarms, warnings } = device;

  const hasAlarms = alarms && alarms.length > 0;
  const hasWarnings = warnings && warnings.length > 0;

  // Determine card status color
  const getStatusColor = () => {
    if (hasAlarms) return 'border-red-500';
    if (hasWarnings) return 'border-yellow-500';
    return 'border-green-500';
  };

  // Format register values for display
  const formatValue = (key: string, value: number | boolean | string) => {
    if (typeof value === 'boolean') {
      return value ? 'ON' : 'OFF';
    }
    if (typeof value === 'number') {
      // Temperature
      if (key.includes('temp')) return `${value.toFixed(1)}°C`;
      // Humidity
      if (key.includes('humidity')) return `${value.toFixed(1)}%`;
      // CO2
      if (key.includes('co2')) return `${value} ppm`;
      // Percentage
      if (key.includes('speed') || key.includes('level')) return `${value}%`;
      return value.toFixed(1);
    }
    return String(value);
  };

  // Get display name for register
  const getRegisterName = (key: string) => {
    return key
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Get key registers to display (limit to most important)
  const keyRegisters = Object.entries(registers).slice(0, 6);

  return (
    <div className={`card border-l-4 ${getStatusColor()}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Device #{device_id}
          </h3>
          <p className="text-sm text-gray-500">{device_type}</p>
        </div>
        <div className="text-right">
          {hasAlarms && <span className="badge-error">ALARM</span>}
          {hasWarnings && !hasAlarms && (
            <span className="badge-warning">WARNING</span>
          )}
          {!hasAlarms && !hasWarnings && (
            <span className="badge-success">OK</span>
          )}
        </div>
      </div>

      {/* Registers */}
      <div className="space-y-2">
        {keyRegisters.map(([key, value]) => (
          <div key={key} className="flex items-center justify-between text-sm">
            <span className="text-gray-600">{getRegisterName(key)}:</span>
            <span className="font-medium text-gray-900">
              {formatValue(key, value)}
            </span>
          </div>
        ))}
      </div>

      {/* Alarms */}
      {hasAlarms && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <h4 className="text-sm font-medium text-red-600 mb-2">Alarms:</h4>
          <ul className="space-y-1">
            {alarms.map((alarm, idx) => (
              <li key={idx} className="text-sm text-red-600">
                • {alarm}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Warnings */}
      {hasWarnings && !hasAlarms && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <h4 className="text-sm font-medium text-yellow-600 mb-2">Warnings:</h4>
          <ul className="space-y-1">
            {warnings.map((warning, idx) => (
              <li key={idx} className="text-sm text-yellow-600">
                • {warning}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Timestamp */}
      <div className="mt-4 pt-4 border-t border-gray-200 text-xs text-gray-500">
        Updated {formatDistanceToNow(new Date(timestamp), { addSuffix: true })}
      </div>

      {/* Control Panel */}
      <ControlPanel deviceId={device_id} deviceType={device_type} />
    </div>
  );
}
