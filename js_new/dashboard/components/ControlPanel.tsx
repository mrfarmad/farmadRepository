/**
 * Control Panel Component
 * Device command and control interface
 */

'use client';

import { useState } from 'react';

interface ControlPanelProps {
  deviceId: number;
  deviceType: string;
}

interface CommandForm {
  register_address: string;
  value: string;
  priority: 'CRITICAL' | 'HIGH' | 'NORMAL' | 'LOW';
}

export default function ControlPanel({ deviceId, deviceType }: ControlPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const [form, setForm] = useState<CommandForm>({
    register_address: '',
    value: '',
    priority: 'NORMAL',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/commands', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          device_id: deviceId,
          register_address: parseInt(form.register_address),
          value: parseInt(form.value),
          priority: form.priority,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send command');
      }

      setMessage({
        type: 'success',
        text: `Command sent successfully (ID: ${data.command.id})`,
      });

      // Reset form
      setForm({
        register_address: '',
        value: '',
        priority: 'NORMAL',
      });

      // Close panel after 2 seconds
      setTimeout(() => {
        setIsOpen(false);
        setMessage(null);
      }, 2000);
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Quick actions for common commands (device-specific)
  const getQuickActions = () => {
    switch (deviceType) {
      case 'KUB-1063':
        return [
          { label: 'Start Ventilation', register: 0x0100, value: 1 },
          { label: 'Stop Ventilation', register: 0x0100, value: 0 },
          { label: 'Reset Alarm', register: 0x0200, value: 1 },
        ];
      default:
        return [];
    }
  };

  const quickActions = getQuickActions();

  return (
    <div className="mt-4 pt-4 border-t border-gray-200">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="btn-secondary w-full"
      >
        <svg
          className="h-4 w-4 mr-2"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
          />
        </svg>
        Control Device
      </button>

      {isOpen && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          {/* Quick Actions */}
          {quickActions.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">
                Quick Actions:
              </h4>
              <div className="space-y-2">
                {quickActions.map((action, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setForm({
                        register_address: String(action.register),
                        value: String(action.value),
                        priority: 'HIGH',
                      });
                    }}
                    className="btn-secondary text-sm w-full"
                    disabled={isLoading}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Custom Command Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Register Address (hex)
              </label>
              <input
                type="text"
                value={form.register_address}
                onChange={(e) =>
                  setForm({ ...form, register_address: e.target.value })
                }
                placeholder="0x0100"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                required
                disabled={isLoading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Value
              </label>
              <input
                type="text"
                value={form.value}
                onChange={(e) => setForm({ ...form, value: e.target.value })}
                placeholder="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                required
                disabled={isLoading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Priority
              </label>
              <select
                value={form.priority}
                onChange={(e) =>
                  setForm({
                    ...form,
                    priority: e.target.value as CommandForm['priority'],
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                disabled={isLoading}
              >
                <option value="LOW">Low</option>
                <option value="NORMAL">Normal</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </select>
            </div>

            {message && (
              <div
                className={`p-3 rounded-md ${
                  message.type === 'success'
                    ? 'bg-green-50 text-green-800'
                    : 'bg-red-50 text-red-800'
                }`}
              >
                <p className="text-sm">{message.text}</p>
              </div>
            )}

            <div className="flex space-x-3">
              <button
                type="submit"
                disabled={isLoading}
                className="btn-primary flex-1"
              >
                {isLoading ? 'Sending...' : 'Send Command'}
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="btn-secondary"
                disabled={isLoading}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
