/**
 * System Status Component
 * Displays WebSocket connection and system health
 */

'use client';

import { useEffect, useState } from 'react';
import useSWR from 'swr';

interface SystemStatusProps {
  isConnected: boolean;
  deviceCount: number;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function SystemStatus({
  isConnected,
  deviceCount,
}: SystemStatusProps) {
  const [mounted, setMounted] = useState(false);

  // Fetch health data
  const { data: healthData, error: healthError } = useSWR(
    '/api/health',
    fetcher,
    {
      refreshInterval: 5000,
      revalidateOnFocus: false,
    }
  );

  // Fetch metrics data
  const { data: metricsData } = useSWR('/api/metrics', fetcher, {
    refreshInterval: 10000,
    revalidateOnFocus: false,
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const systemHealthy = !healthError && healthData?.status === 'healthy';

  return (
    <div className="card">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* WebSocket Status */}
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            <div
              className={`h-3 w-3 rounded-full ${
                isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'
              }`}
            />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-100">WebSocket</p>
            <p className="text-xs text-slate-400">
              {isConnected ? 'Connected' : 'Disconnected'}
            </p>
          </div>
        </div>

        {/* System Health */}
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            <div
              className={`h-3 w-3 rounded-full ${
                systemHealthy ? 'bg-green-500' : 'bg-red-500'
              }`}
            />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-100">System</p>
            <p className="text-xs text-slate-400">
              {systemHealthy ? 'Healthy' : 'Unhealthy'}
            </p>
          </div>
        </div>

        {/* Device Count */}
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            <svg
              className="h-6 w-6 text-indigo-600"
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
          <div>
            <p className="text-sm font-medium text-slate-100">Devices</p>
            <p className="text-xs text-slate-400">{deviceCount} active</p>
          </div>
        </div>

        {/* CPU Usage */}
        {metricsData?.cpu_usage !== undefined && (
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <svg
                className="h-6 w-6 text-purple-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-100">CPU</p>
              <p className="text-xs text-slate-400">
                {metricsData.cpu_usage.toFixed(1)}%
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
