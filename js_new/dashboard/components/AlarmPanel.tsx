/**
 * Alarm Panel Component
 * Displays active alarms and warnings
 */

'use client';

import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';

interface AlarmPanelProps {
  alarms: unknown[];
  warnings: unknown[];
}

export default function AlarmPanel({ alarms, warnings }: AlarmPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const totalCount = alarms.length + warnings.length;

  if (totalCount === 0) return null;

  return (
    <div className="card border-l-4 border-red-500">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            <svg
              className="h-6 w-6 text-red-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Active Alerts
            </h3>
            <p className="text-sm text-gray-500">
              {alarms.length} alarms, {warnings.length} warnings
            </p>
          </div>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-gray-400 hover:text-gray-600"
        >
          <svg
            className={`h-5 w-5 transform transition-transform ${
              isExpanded ? 'rotate-180' : ''
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>
      </div>

      {/* Content */}
      {isExpanded && (
        <div className="space-y-4">
          {/* Alarms */}
          {alarms.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-red-600 mb-2">
                Critical Alarms:
              </h4>
              <div className="space-y-2">
                {alarms.slice(0, 10).map((alarm: any, idx) => (
                  <div
                    key={idx}
                    className="bg-red-50 border border-red-200 rounded p-3"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="font-medium text-red-900">
                            Device #{alarm.device_id}
                          </span>
                          <span className="text-xs text-red-600">
                            {alarm.device_type}
                          </span>
                        </div>
                        <ul className="space-y-1">
                          {alarm.messages?.map((msg: string, i: number) => (
                            <li key={i} className="text-sm text-red-700">
                              • {msg}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <span className="text-xs text-red-500 ml-4">
                        {formatDistanceToNow(new Date(alarm.timestamp), {
                          addSuffix: true,
                        })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Warnings */}
          {warnings.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-yellow-600 mb-2">
                Warnings:
              </h4>
              <div className="space-y-2">
                {warnings.slice(0, 10).map((warning: any, idx) => (
                  <div
                    key={idx}
                    className="bg-yellow-50 border border-yellow-200 rounded p-3"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="font-medium text-yellow-900">
                            Device #{warning.device_id}
                          </span>
                          <span className="text-xs text-yellow-600">
                            {warning.device_type}
                          </span>
                        </div>
                        <ul className="space-y-1">
                          {warning.messages?.map((msg: string, i: number) => (
                            <li key={i} className="text-sm text-yellow-700">
                              • {msg}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <span className="text-xs text-yellow-500 ml-4">
                        {formatDistanceToNow(new Date(warning.timestamp), {
                          addSuffix: true,
                        })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
