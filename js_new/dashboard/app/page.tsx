/**
 * EDGE Dashboard
 * React implementation mirroring the Streamlit UI with full functionality.
 */

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import { useWebSocket } from '@/lib/websocket';
import SystemStatus from '@/components/SystemStatus';
import AlarmPanel from '@/components/AlarmPanel';
import DeviceCard from '@/components/DeviceCard';
import ControlPanel from '@/components/ControlPanel';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { format, formatDistanceToNow } from 'date-fns';

const WEBSOCKET_URL =
  process.env.NEXT_PUBLIC_WS_URL || process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'ws://localhost:8000';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface DeviceConfig {
  device_id: number;
  device_type: string;
  slave_id?: number;
  name: string;
  description?: string;
  enabled?: boolean;
  location?: string;
  room?: string;
  poll_interval?: number;
  priority?: string;
}

interface DeviceLiveData {
  device_id: number;
  device_type?: string;
  timestamp: string;
  registers: Record<string, number | boolean | string>;
  alarms?: string[];
  warnings?: string[];
  status?: string;
}

interface DeviceView extends DeviceConfig {
  live?: DeviceLiveData;
}

interface AlarmEntry {
  device_id: number;
  device_type?: string;
  device_name?: string;
  room?: string;
  location?: string;
  messages: string[];
  timestamp: string;
  severity: 'alarm' | 'warning';
}

interface UserProfile {
  id: string;
  name: string;
  role: 'admin' | 'operator' | 'viewer';
  pin: string;
  telegramId?: string;
  active: boolean;
}

interface InviteCode {
  code: string;
  role: UserProfile['role'];
  expiresAt: string;
}

interface MetricPoint {
  timestamp: string;
  value: number;
}

interface MetricHistory {
  [deviceId: number]: {
    [metricKey: string]: MetricPoint[];
  };
}

const DEFAULT_USERS: UserProfile[] = [
  {
    id: 'admin',
    name: 'Администратор',
    role: 'admin',
    pin: '1234',
    active: true,
  },
];

function useLocalStorageState<T>(key: string, initialValue: T) {
  const [state, setState] = useState<T>(initialValue);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = window.localStorage.getItem(key);
    if (stored) {
      try {
        setState(JSON.parse(stored) as T);
      } catch {
        setState(initialValue);
      }
    }
  }, [key, initialValue]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(key, JSON.stringify(state));
  }, [key, state]);

  return [state, setState] as const;
}

function normalizeDevicePayload(payload: any): DeviceLiveData | null {
  if (!payload || payload.device_id === undefined) return null;
  const timestamp = payload.timestamp
    ? new Date(payload.timestamp).toISOString()
    : new Date().toISOString();
  const registers = payload.registers || payload.data || {};
  const alarms = Array.isArray(payload.alarms)
    ? payload.alarms
    : Array.isArray(payload.active_alarms_list)
      ? payload.active_alarms_list
      : undefined;
  const warnings = Array.isArray(payload.warnings)
    ? payload.warnings
    : Array.isArray(payload.active_warnings_list)
      ? payload.active_warnings_list
      : undefined;

  return {
    device_id: Number(payload.device_id),
    device_type: payload.device_type,
    timestamp,
    registers,
    alarms,
    warnings,
    status: payload.status || payload.connection_status,
  };
}

function formatRegisterValue(key: string, value: number | boolean | string) {
  if (typeof value === 'boolean') return value ? 'ON' : 'OFF';
  if (typeof value === 'number') {
    if (key.includes('temp')) return `${value.toFixed(1)}°C`;
    if (key.includes('humidity')) return `${value.toFixed(1)}%`;
    if (key.includes('co2')) return `${value} ppm`;
    if (key.includes('speed') || key.includes('level')) return `${value}%`;
    return value.toFixed(2);
  }
  return String(value);
}

function resolveMetricLabel(key: string) {
  return key
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function useMetricHistory(limit = 120) {
  const [history, setHistory] = useState<MetricHistory>({});

  const push = useCallback(
    (deviceId: number, registers: Record<string, number | boolean | string>, timestamp: string) => {
      setHistory((prev) => {
        const deviceHistory = { ...(prev[deviceId] ?? {}) };
        Object.entries(registers).forEach(([key, value]) => {
          if (typeof value !== 'number') return;
          const points = [...(deviceHistory[key] ?? [])];
          points.push({ timestamp, value });
          deviceHistory[key] = points.slice(-limit);
        });
        return { ...prev, [deviceId]: deviceHistory };
      });
    },
    [limit]
  );

  return { history, push };
}

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [liveDevices, setLiveDevices] = useState<Map<number, DeviceLiveData>>(new Map());
  const [alarmEvents, setAlarmEvents] = useState<AlarmEntry[]>([]);

  const [autoRefreshEnabled, setAutoRefreshEnabled] = useLocalStorageState(
    'edge-dashboard-auto-refresh',
    true
  );
  const [autoRefreshMinutes, setAutoRefreshMinutes] = useLocalStorageState(
    'edge-dashboard-auto-refresh-interval',
    1
  );

  const [metricPreferences, setMetricPreferences] = useLocalStorageState<
    Record<string, Record<number, string[]>>
  >('edge-dashboard-metric-preferences', {});

  const [users, setUsers] = useLocalStorageState<UserProfile[]>(
    'edge-dashboard-users',
    DEFAULT_USERS
  );
  const [invites, setInvites] = useLocalStorageState<InviteCode[]>(
    'edge-dashboard-invites',
    []
  );
  const [currentUser, setCurrentUser] = useLocalStorageState<UserProfile | null>(
    'edge-dashboard-current-user',
    null
  );

  const { history, push: pushMetricHistory } = useMetricHistory();

  const { data: devicesResponse, mutate: refreshDevices } = useSWR(
    '/api/devices',
    fetcher,
    {
      refreshInterval: autoRefreshEnabled ? autoRefreshMinutes * 60_000 : 0,
      revalidateOnFocus: false,
    }
  );

  const { data: metricsResponse, mutate: refreshMetrics } = useSWR(
    '/api/metrics',
    fetcher,
    {
      refreshInterval: autoRefreshEnabled ? autoRefreshMinutes * 60_000 : 0,
      revalidateOnFocus: false,
    }
  );

  const handleDeviceData = useCallback(
    (data: any) => {
      const normalized = normalizeDevicePayload(data);
      if (!normalized) return;
      setLiveDevices((prev) => {
        const next = new Map(prev);
        next.set(normalized.device_id, normalized);
        return next;
      });

      pushMetricHistory(normalized.device_id, normalized.registers, normalized.timestamp);

      if (normalized.alarms?.length) {
        setAlarmEvents((prev) => [
          {
            device_id: normalized.device_id,
            device_type: normalized.device_type,
            messages: normalized.alarms ?? [],
            timestamp: normalized.timestamp,
            severity: 'alarm',
          },
          ...prev,
        ]);
      }

      if (normalized.warnings?.length) {
        setAlarmEvents((prev) => [
          {
            device_id: normalized.device_id,
            device_type: normalized.device_type,
            messages: normalized.warnings ?? [],
            timestamp: normalized.timestamp,
            severity: 'warning',
          },
          ...prev,
        ]);
      }
    },
    [pushMetricHistory]
  );

  const { isConnected } = useWebSocket({
    url: WEBSOCKET_URL,
    onDeviceData: handleDeviceData,
  });

  const deviceConfigs: DeviceConfig[] = useMemo(() => {
    return Array.isArray(devicesResponse?.devices) ? devicesResponse.devices : [];
  }, [devicesResponse]);

  const devices: DeviceView[] = useMemo(() => {
    const map = new Map<number, DeviceView>();

    deviceConfigs.forEach((config) => {
      map.set(config.device_id, { ...config, live: liveDevices.get(config.device_id) });
    });

    liveDevices.forEach((live, deviceId) => {
      if (!map.has(deviceId)) {
        map.set(deviceId, {
          device_id: deviceId,
          device_type: live.device_type || 'Unknown',
          name: `Device #${deviceId}`,
          enabled: true,
          live,
        });
      }
    });

    return Array.from(map.values());
  }, [deviceConfigs, liveDevices]);

  const rooms = useMemo(() => {
    const roomSet = new Set<string>();
    devices.forEach((device) => {
      if (device.room) {
        roomSet.add(device.room);
      } else {
        roomSet.add('Без помещения');
      }
    });
    return Array.from(roomSet.values());
  }, [devices]);

  const filteredRooms = selectedRoom
    ? rooms.filter((room) => room === selectedRoom)
    : rooms;

  const overview = useMemo(() => {
    const roomsTotal = rooms.length;
    let roomsWithAlarms = 0;
    let devicesOffline = 0;
    let alarmsTotal = 0;
    const temps: number[] = [];
    let lastUpdate: string | null = null;

    const roomAlarmMap = new Map<string, boolean>();

    devices.forEach((device) => {
      const roomName = device.room || 'Без помещения';
      const live = device.live;
      if (!live) {
        devicesOffline += 1;
        return;
      }
      const alarms = live.alarms?.length || 0;
      const warnings = live.warnings?.length || 0;
      if (alarms + warnings > 0) {
        roomAlarmMap.set(roomName, true);
        alarmsTotal += alarms + warnings;
      }

      Object.entries(live.registers).forEach(([key, value]) => {
        if (typeof value === 'number' && key.includes('temp')) {
          temps.push(value);
        }
      });

      if (!lastUpdate || new Date(live.timestamp) > new Date(lastUpdate)) {
        lastUpdate = live.timestamp;
      }
    });

    roomsWithAlarms = roomAlarmMap.size;

    return {
      roomsTotal,
      roomsWithAlarms,
      devicesOffline,
      alarmsTotal,
      avgTemp: temps.length ? temps.reduce((a, b) => a + b, 0) / temps.length : null,
      lastUpdate,
    };
  }, [devices, rooms]);

  const isAdmin = currentUser?.role === 'admin';

  const tabList = useMemo(() => {
    const baseTabs = [
      { id: 'dashboard', label: 'Дашборд' },
      { id: 'devices', label: 'Устройства' },
      { id: 'charts', label: 'Графики' },
      { id: 'alarms', label: 'Аварии' },
    ];

    if (isAdmin) {
      baseTabs.push({ id: 'config', label: 'Конфигурация' });
      baseTabs.push({ id: 'users', label: 'Пользователи' });
    }

    return baseTabs;
  }, [isAdmin]);

  const handleLogin = (name: string, pin: string) => {
    const user = users.find(
      (item) => item.active && item.name.toLowerCase() === name.toLowerCase() && item.pin === pin
    );

    if (user) {
      setCurrentUser(user);
      return true;
    }

    return false;
  };

  const handleLogout = () => {
    setCurrentUser(null);
  };

  const refreshAll = () => {
    refreshDevices();
    refreshMetrics();
  };

  useEffect(() => {
    if (!tabList.find((tab) => tab.id === activeTab)) {
      setActiveTab('dashboard');
    }
  }, [activeTab, tabList]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="flex">
        <aside className="w-72 shrink-0 border-r border-slate-800 bg-slate-950/70 px-4 py-6 space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-100">🔐 Доступ</h2>
            {!currentUser ? (
              <AccessPanel users={users} onLogin={handleLogin} />
            ) : (
              <div className="mt-4 space-y-2">
                <p className="text-sm text-slate-300">
                  Пользователь: <strong>{currentUser.name}</strong> ({currentUser.role})
                </p>
                <button className="btn-secondary w-full" onClick={handleLogout}>
                  Выйти
                </button>
              </div>
            )}
          </div>

          <div>
            <h2 className="text-lg font-semibold text-slate-100">⚙️ Обновление</h2>
            <div className="mt-3 space-y-3">
              <label className="flex items-center space-x-2 text-sm text-slate-200">
                <input
                  type="checkbox"
                  checked={autoRefreshEnabled}
                  onChange={(event) => setAutoRefreshEnabled(event.target.checked)}
                />
                <span>Автообновление</span>
              </label>
              <div>
                <label className="text-xs text-slate-400">Интервал (мин)</label>
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={autoRefreshMinutes}
                  onChange={(event) => setAutoRefreshMinutes(Number(event.target.value))}
                  disabled={!autoRefreshEnabled}
                  className="w-full"
                />
                <div className="text-xs text-slate-400">{autoRefreshMinutes} мин.</div>
              </div>
              <button className="btn-secondary w-full" onClick={refreshAll}>
                🔄 Обновить сейчас
              </button>
            </div>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-slate-100">🏠 Навигация</h2>
            {rooms.length > 0 ? (
              <div className="mt-3 space-y-2">
                <select
                  className="w-full rounded-md border border-slate-700 bg-slate-900/70 px-2 py-1 text-sm text-slate-100"
                  value={selectedRoom || 'all'}
                  onChange={(event) =>
                    setSelectedRoom(event.target.value === 'all' ? null : event.target.value)
                  }
                >
                  <option value="all">Все помещения</option>
                  {rooms.map((room) => (
                    <option key={room} value={room}>
                      {room}
                    </option>
                  ))}
                </select>
                <div className="text-xs text-slate-400">Быстрые ссылки</div>
                <ul className="text-xs text-sky-300 space-y-1">
                  {rooms.map((room) => (
                    <li key={room}>
                      <a href={`#room-${room.replace(/\s+/g, '-')}`}>{room}</a>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-sm text-slate-400 mt-2">Нет помещений</p>
            )}
          </div>

          <div>
            <h2 className="text-lg font-semibold text-slate-100">ℹ️ Справка</h2>
            <p className="text-xs text-slate-400 mt-2">
              Документация и подробные инструкции будут добавлены позже.
            </p>
          </div>
        </aside>

        <main className="flex-1 px-8 py-6 space-y-6">
          <header className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-100">
                CUBE_RS EDGE Dashboard
              </h1>
              <p className="text-sm text-slate-400">
                Web-интерфейс мониторинга EDGE устройств
              </p>
            </div>
            <div className="text-right text-xs text-slate-400">
              {metricsResponse?.uptime && (
                <span>Uptime: {Math.round(metricsResponse.uptime / 60)} мин.</span>
              )}
            </div>
          </header>

          <SystemStatus isConnected={isConnected} deviceCount={devices.length} />

          <div className="flex flex-wrap gap-2">
            {tabList.map((tab) => (
              <button
                key={tab.id}
                className={`px-4 py-2 rounded-md text-sm font-medium border ${
                  activeTab === tab.id
                    ? 'bg-indigo-600 text-white border-indigo-500'
                    : 'bg-slate-900/80 text-slate-200 border-slate-700'
                }`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <OverviewCards overview={overview} />

              {alarmEvents.length > 0 && (
                <AlarmPanel alarms={alarmEvents.filter((alarm) => alarm.severity === 'alarm')} warnings={alarmEvents.filter((alarm) => alarm.severity === 'warning')} />
              )}

              {filteredRooms.map((room) => (
                <RoomPanel
                  key={room}
                  room={room}
                  devices={devices.filter(
                    (device) => (device.room || 'Без помещения') === room
                  )}
                  metricPreferences={metricPreferences}
                  onMetricPreferencesChange={setMetricPreferences}
                />
              ))}
            </div>
          )}

          {activeTab === 'devices' && (
            <DevicesTab devices={devices} />
          )}

          {activeTab === 'charts' && (
            <ChartsTab devices={devices} history={history} />
          )}

          {activeTab === 'alarms' && (
            <AlarmsTab devices={devices} alarmEvents={alarmEvents} />
          )}

          {activeTab === 'config' && isAdmin && (
            <ConfigTab devices={deviceConfigs} onSave={refreshDevices} />
          )}

          {activeTab === 'users' && isAdmin && (
            <UsersTab
              users={users}
              setUsers={setUsers}
              invites={invites}
              setInvites={setInvites}
            />
          )}
        </main>
      </div>
    </div>
  );
}

function AccessPanel({
  users,
  onLogin,
}: {
  users: UserProfile[];
  onLogin: (name: string, pin: string) => boolean;
}) {
  const [name, setName] = useState(users[0]?.name ?? '');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const ok = onLogin(name, pin);
    if (!ok) {
      setError('Неверный PIN или пользователь деактивирован');
    } else {
      setError('');
      setPin('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-3">
      <select
        className="w-full rounded-md border border-slate-700 bg-slate-900/70 px-2 py-1 text-sm text-slate-100"
        value={name}
        onChange={(event) => setName(event.target.value)}
      >
        {users.map((user) => (
          <option key={user.id} value={user.name}>
            {user.name}
          </option>
        ))}
      </select>
      <input
        type="password"
        placeholder="PIN"
        value={pin}
        onChange={(event) => setPin(event.target.value)}
        className="w-full rounded-md border border-slate-700 bg-slate-900/70 px-2 py-1 text-sm text-slate-100"
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
      <button className="btn-primary w-full" type="submit">
        Войти
      </button>
    </form>
  );
}

function OverviewCards({
  overview,
}: {
  overview: {
    roomsTotal: number;
    roomsWithAlarms: number;
    devicesOffline: number;
    alarmsTotal: number;
    avgTemp: number | null;
    lastUpdate: string | null;
  };
}) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
      <div className="card">
        <p className="text-xs text-slate-400">Помещения (тревоги)</p>
        <p className="text-2xl font-semibold">
          {overview.roomsWithAlarms}/{overview.roomsTotal}
        </p>
      </div>
      <div className="card">
        <p className="text-xs text-slate-400">Устройств оффлайн</p>
        <p className="text-2xl font-semibold">{overview.devicesOffline}</p>
      </div>
      <div className="card">
        <p className="text-xs text-slate-400">Активные аварии</p>
        <p className="text-2xl font-semibold">{overview.alarmsTotal}</p>
      </div>
      <div className="card">
        <p className="text-xs text-slate-400">Последнее обновление</p>
        <p className="text-lg font-semibold text-sky-300">
          {overview.lastUpdate
            ? format(new Date(overview.lastUpdate), 'dd.MM HH:mm:ss')
            : '—'}
        </p>
        {overview.avgTemp !== null && (
          <p className="text-xs text-slate-400">
            Средняя температура: {overview.avgTemp.toFixed(1)}°C
          </p>
        )}
      </div>
    </div>
  );
}

function RoomPanel({
  room,
  devices,
  metricPreferences,
  onMetricPreferencesChange,
}: {
  room: string;
  devices: DeviceView[];
  metricPreferences: Record<string, Record<number, string[]>>;
  onMetricPreferencesChange: React.Dispatch<
    React.SetStateAction<Record<string, Record<number, string[]>>>
  >;
}) {
  const [activeTab, setActiveTab] = useState('overview');

  const roomMetrics = metricPreferences[room] || {};

  const handleMetricToggle = (
    deviceId: number,
    key: string,
    checked: boolean
  ) => {
    onMetricPreferencesChange((prev) => {
      const roomPrefs = { ...(prev[room] ?? {}) };
      const selected = new Set(roomPrefs[deviceId] ?? []);
      if (checked) {
        selected.add(key);
      } else {
        selected.delete(key);
      }
      roomPrefs[deviceId] = Array.from(selected.values());
      return { ...prev, [room]: roomPrefs };
    });
  };

  const alarmsCount = devices.reduce((acc, device) => {
    const alarms = device.live?.alarms?.length ?? 0;
    const warnings = device.live?.warnings?.length ?? 0;
    return acc + alarms + warnings;
  }, 0);

  const updatedAt = devices
    .map((device) => device.live?.timestamp)
    .filter(Boolean)
    .sort()
    .slice(-1)[0];

  return (
    <section id={`room-${room.replace(/\s+/g, '-')}`} className="card space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">{room}</h3>
          <p className="text-xs text-slate-400">
            Обновлено: {updatedAt ? format(new Date(updatedAt), 'dd.MM HH:mm:ss') : '—'}
          </p>
        </div>
        <span
          className={`px-3 py-1 rounded-full text-xs font-medium ${
            alarmsCount > 0
              ? 'bg-red-500/15 text-red-300 border border-red-500/30'
              : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
          }`}
        >
          {alarmsCount > 0 ? `Тревог: ${alarmsCount}` : 'Норма'}
        </span>
      </header>

      <div className="flex gap-2">
        {['overview', 'devices', 'settings'].map((tab) => (
          <button
            key={tab}
            className={`px-3 py-1 rounded-md text-xs border ${
              activeTab === tab
                ? 'bg-indigo-600 text-white border-indigo-500'
                : 'bg-slate-900/70 text-slate-200 border-slate-700'
            }`}
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'overview' && 'Обзор'}
            {tab === 'devices' && 'Устройства'}
            {tab === 'settings' && 'Настройки'}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-6">
          {devices.length === 0 && (
            <p className="text-sm text-slate-400">Нет активных устройств</p>
          )}
          {devices.map((device) => {
            const live = device.live;
            const selectedKeys = roomMetrics[device.device_id] || [];
            const availableKeys = live ? Object.keys(live.registers) : [];
            const visibleKeys = selectedKeys.length > 0 ? selectedKeys : availableKeys.slice(0, 6);

            return (
              <div key={device.device_id} className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-base font-semibold">
                      {device.name} · {device.device_type}
                    </h4>
                    <p className="text-xs text-slate-400">
                      ID {device.device_id}
                      {device.slave_id ? ` · Slave ${device.slave_id}` : ''}
                      {device.location ? ` · ${device.location}` : ''}
                    </p>
                  </div>
                  <div className="text-right text-xs text-slate-400">
                    {live?.timestamp
                      ? formatDistanceToNow(new Date(live.timestamp), { addSuffix: true })
                      : 'Нет данных'}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <div className="card border border-slate-700/80">
                    <p className="text-xs text-slate-400">Статус</p>
                    <p className="text-lg font-semibold">
                      {live?.alarms?.length ? 'Авария' : live?.warnings?.length ? 'Предупреждение' : 'Норма'}
                    </p>
                    {live?.alarms?.length ? (
                      <p className="text-xs text-red-300">
                        {live.alarms[0]}
                      </p>
                    ) : live?.warnings?.length ? (
                      <p className="text-xs text-amber-300">
                        {live.warnings[0]}
                      </p>
                    ) : null}
                  </div>

                  {visibleKeys.length === 0 && (
                    <div className="card border border-slate-700/80">
                      <p className="text-xs text-slate-400">Нет выбранных метрик</p>
                      <p className="text-lg font-semibold">—</p>
                    </div>
                  )}

                  {visibleKeys.map((key) => (
                    <div key={key} className="card border border-slate-700/80">
                      <p className="text-xs text-slate-400">{resolveMetricLabel(key)}</p>
                      <p className="text-lg font-semibold">
                        {live ? formatRegisterValue(key, live.registers[key]) : '—'}
                      </p>
                    </div>
                  ))}
                </div>

                {live?.alarms?.length && (
                  <div className="flex gap-2">
                    <button
                      className="btn-secondary"
                      onClick={async () => {
                        await fetch('/api/commands', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            device_id: device.device_id,
                            register_address: 0x0020,
                            value: 1,
                            priority: 'HIGH',
                          }),
                        });
                      }}
                    >
                      🔁 Сброс аварии
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {activeTab === 'devices' && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {devices.length === 0 && (
            <p className="text-sm text-slate-400">Нет активных устройств</p>
          )}
          {devices.map((device) => (
            <DeviceCard
              key={device.device_id}
              device={{
                device_id: device.device_id,
                device_type: device.device_type,
                name: device.name,
                room: device.room,
                location: device.location,
                timestamp: device.live?.timestamp || new Date().toISOString(),
                registers: device.live?.registers || {},
                alarms: device.live?.alarms,
                warnings: device.live?.warnings,
              }}
            />
          ))}
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="space-y-4">
          <p className="text-sm text-slate-300">
            Отметьте показатели для каждого устройства. Аварии отображаются всегда и не требуют настройки.
          </p>
          {devices.map((device) => {
            const live = device.live;
            const availableKeys = live ? Object.keys(live.registers) : [];
            const selected = new Set(roomMetrics[device.device_id] || []);

            return (
              <div key={device.device_id} className="border border-slate-700 rounded-lg p-4 bg-slate-900/60">
                <h4 className="font-semibold text-sm mb-3">
                  {device.name} · {device.device_type}
                </h4>
                {availableKeys.length === 0 ? (
                  <p className="text-xs text-slate-400">Нет метрик для настройки</p>
                ) : (
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                    {availableKeys.map((key) => (
                      <label key={key} className="flex items-center space-x-2 text-sm">
                        <input
                          type="checkbox"
                          checked={selected.has(key)}
                          onChange={(event) =>
                            handleMetricToggle(device.device_id, key, event.target.checked)
                          }
                        />
                        <span>{resolveMetricLabel(key)}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function DevicesTab({ devices }: { devices: DeviceView[] }) {
  const [roomFilter, setRoomFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const rooms = Array.from(
    new Set(devices.map((device) => device.room || 'Без помещения'))
  );
  const types = Array.from(new Set(devices.map((device) => device.device_type)));

  const filtered = devices.filter((device) => {
    const roomName = device.room || 'Без помещения';
    const matchRoom = roomFilter === 'all' || roomFilter === roomName;
    const matchType = typeFilter === 'all' || typeFilter === device.device_type;
    const query = search.trim().toLowerCase();
    const matchQuery =
      !query ||
      device.name.toLowerCase().includes(query) ||
      String(device.device_id).includes(query) ||
      String(device.slave_id || '').includes(query);
    return matchRoom && matchType && matchQuery;
  });

  const selected = devices.find((device) => device.device_id === selectedId) || filtered[0];

  return (
    <div className="space-y-6">
      <div className="card space-y-4">
        <h3 className="text-lg font-semibold">🗂️ Устройства</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="text-xs text-slate-400">Помещение</label>
            <select
              className="w-full rounded-md border border-slate-700 bg-slate-900/70 px-2 py-1 text-sm text-slate-100"
              value={roomFilter}
              onChange={(event) => setRoomFilter(event.target.value)}
            >
              <option value="all">Все</option>
              {rooms.map((room) => (
                <option key={room} value={room}>
                  {room}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-400">Тип устройства</label>
            <select
              className="w-full rounded-md border border-slate-700 bg-slate-900/70 px-2 py-1 text-sm text-slate-100"
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value)}
            >
              <option value="all">Все</option>
              {types.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-400">Поиск</label>
            <input
              className="w-full rounded-md border border-slate-700 bg-slate-900/70 px-2 py-1 text-sm text-slate-100"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Поиск по имени/ID/slave"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm text-left">
            <thead className="text-xs text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-2">ID</th>
                <th className="py-2">Имя</th>
                <th className="py-2">Тип</th>
                <th className="py-2">Помещение</th>
                <th className="py-2">Локация</th>
                <th className="py-2">Статус</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((device) => (
                <tr
                  key={device.device_id}
                  className="border-b border-slate-800 last:border-b-0 cursor-pointer hover:bg-slate-900/60"
                  onClick={() => setSelectedId(device.device_id)}
                >
                  <td className="py-2">{device.device_id}</td>
                  <td className="py-2">{device.name}</td>
                  <td className="py-2">{device.device_type}</td>
                  <td className="py-2">{device.room || '—'}</td>
                  <td className="py-2">{device.location || '—'}</td>
                  <td className="py-2">
                    {device.live?.alarms?.length
                      ? 'Авария'
                      : device.live?.warnings?.length
                        ? 'Предупреждение'
                        : device.live
                          ? 'OK'
                          : 'Нет данных'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card space-y-4">
        <h3 className="text-lg font-semibold">🔍 Детали устройства</h3>
        {selected ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-base font-semibold">{selected.name}</h4>
                <p className="text-xs text-slate-400">
                  ID {selected.device_id} · {selected.device_type}
                </p>
              </div>
              <span className="text-xs text-slate-400">
                {selected.live?.timestamp
                  ? format(new Date(selected.live.timestamp), 'dd.MM HH:mm:ss')
                  : 'Нет данных'}
              </span>
            </div>

            {selected.live ? (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                {Object.entries(selected.live.registers).map(([key, value]) => (
                  <div key={key} className="card border border-slate-700/80">
                    <p className="text-xs text-slate-400">{resolveMetricLabel(key)}</p>
                    <p className="text-lg font-semibold">{formatRegisterValue(key, value)}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400">Нет данных — ожидайте опрос</p>
            )}

            <ControlPanel deviceId={selected.device_id} deviceType={selected.device_type} />
          </div>
        ) : (
          <p className="text-sm text-slate-400">Устройство не найдено</p>
        )}
      </div>
    </div>
  );
}

function ChartsTab({ devices, history }: { devices: DeviceView[]; history: MetricHistory }) {
  const [selectedDeviceId, setSelectedDeviceId] = useState<number | null>(
    devices[0]?.device_id ?? null
  );
  const [selectedMetric, setSelectedMetric] = useState<string>('');
  const [hours, setHours] = useState(24);

  const deviceOptions = useMemo(() => {
    return devices.reduce((acc, device) => {
      acc[device.device_id] = device.name;
      return acc;
    }, {} as Record<number, string>);
  }, [devices]);

  const metrics = useMemo(() => {
    if (!selectedDeviceId) return [];
    return Object.keys(history[selectedDeviceId] ?? {});
  }, [history, selectedDeviceId]);

  useEffect(() => {
    if (metrics.length > 0 && !metrics.includes(selectedMetric)) {
      setSelectedMetric(metrics[0]);
    }
  }, [metrics, selectedMetric]);

  const chartData = useMemo(() => {
    if (!selectedDeviceId || !selectedMetric) return [];
    const points = history[selectedDeviceId]?.[selectedMetric] ?? [];
    const cutoff = Date.now() - hours * 60 * 60 * 1000;
    return points.filter((point) => new Date(point.timestamp).getTime() >= cutoff);
  }, [history, selectedDeviceId, selectedMetric, hours]);

  return (
    <div className="card space-y-4">
      <h3 className="text-lg font-semibold">📈 Графики показаний</h3>
      {devices.length === 0 ? (
        <p className="text-sm text-slate-400">Нет помещений для отображения</p>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className="text-xs text-slate-400">Устройство</label>
              <select
                className="w-full rounded-md border border-slate-700 bg-slate-900/70 px-2 py-1 text-sm text-slate-100"
                value={selectedDeviceId ?? ''}
                onChange={(event) => setSelectedDeviceId(Number(event.target.value))}
              >
                {Object.entries(deviceOptions).map(([id, name]) => (
                  <option key={id} value={id}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400">Метрика</label>
              <select
                className="w-full rounded-md border border-slate-700 bg-slate-900/70 px-2 py-1 text-sm text-slate-100"
                value={selectedMetric}
                onChange={(event) => setSelectedMetric(event.target.value)}
              >
                {metrics.map((metric) => (
                  <option key={metric} value={metric}>
                    {resolveMetricLabel(metric)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400">Интервал (часы)</label>
              <input
                type="range"
                min={1}
                max={72}
                value={hours}
                onChange={(event) => setHours(Number(event.target.value))}
                className="w-full"
              />
              <div className="text-xs text-slate-400">{hours} ч.</div>
            </div>
          </div>

          {chartData.length === 0 ? (
            <p className="text-sm text-slate-400">Нет данных за выбранный период</p>
          ) : (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="timestamp"
                    tickFormatter={(value) => format(new Date(value), 'HH:mm')}
                  />
                  <YAxis />
                  <Tooltip
                    labelFormatter={(value) =>
                      format(new Date(value), 'dd.MM HH:mm:ss')
                    }
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#4f46e5"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function AlarmsTab({ devices, alarmEvents }: { devices: DeviceView[]; alarmEvents: AlarmEntry[] }) {
  const activeRecords = devices.flatMap((device) => {
    const alarms = device.live?.alarms || [];
    const warnings = device.live?.warnings || [];
    const timestamp = device.live?.timestamp || new Date().toISOString();
    const room = device.room || 'Без помещения';
    return [
      ...alarms.map((message) => ({
        type: 'Авария',
        message,
        device: device.name,
        room,
        location: device.location || '—',
        timestamp,
      })),
      ...warnings.map((message) => ({
        type: 'Предупреждение',
        message,
        device: device.name,
        room,
        location: device.location || '—',
        timestamp,
      })),
    ];
  });

  const historyRecords = alarmEvents.slice(0, 50).map((alarm) => ({
    type: alarm.severity === 'alarm' ? 'Авария' : 'Предупреждение',
    message: alarm.messages.join(', '),
    device: alarm.device_name || `Device #${alarm.device_id}`,
    room: alarm.room || '—',
    location: alarm.location || '—',
    timestamp: alarm.timestamp,
  }));

  const records = activeRecords.length ? activeRecords : historyRecords;

  return (
    <div className="card space-y-4">
      <h3 className="text-lg font-semibold">⚠️ Аварии и предупреждения</h3>
      {records.length === 0 ? (
        <p className="text-sm text-emerald-300">Активных аварий и предупреждений нет</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm text-left">
            <thead className="text-xs text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-2">Тип</th>
                <th className="py-2">Сообщение</th>
                <th className="py-2">Устройство</th>
                <th className="py-2">Помещение</th>
                <th className="py-2">Локация</th>
                <th className="py-2">Время</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record, idx) => (
                <tr
                  key={`${record.message}-${idx}`}
                  className="border-b border-slate-800 last:border-b-0"
                >
                  <td className="py-2">{record.type}</td>
                  <td className="py-2">{record.message}</td>
                  <td className="py-2">{record.device}</td>
                  <td className="py-2">{record.room}</td>
                  <td className="py-2">{record.location}</td>
                  <td className="py-2">
                    {record.timestamp
                      ? format(new Date(record.timestamp), 'dd.MM HH:mm:ss')
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ConfigTab({ devices, onSave }: { devices: DeviceConfig[]; onSave: () => void }) {
  const [localDevices, setLocalDevices] = useState<DeviceConfig[]>(devices);
  const [message, setMessage] = useState<string>('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLocalDevices(devices);
  }, [devices]);

  const handleChange = (
    deviceId: number,
    field: keyof DeviceConfig,
    value: string | boolean
  ) => {
    setLocalDevices((prev) =>
      prev.map((device) =>
        device.device_id === deviceId ? { ...device, [field]: value } : device
      )
    );
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      const response = await fetch('/api/devices', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ devices: localDevices }),
      });

      if (!response.ok) {
        throw new Error('Не удалось сохранить конфигурацию');
      }

      setMessage('Конфигурация сохранена');
      onSave();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card space-y-4">
      <h3 className="text-lg font-semibold">⚙️ Конфигурация фермы</h3>
      {localDevices.length === 0 ? (
        <p className="text-sm text-slate-400">Нет устройств для конфигурации</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm text-left">
            <thead className="text-xs text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-2">ID</th>
                <th className="py-2">Имя</th>
                <th className="py-2">Тип</th>
                <th className="py-2">Помещение</th>
                <th className="py-2">Локация</th>
                <th className="py-2">Активно</th>
              </tr>
            </thead>
            <tbody>
              {localDevices.map((device) => (
                <tr key={device.device_id} className="border-b last:border-b-0">
                  <td className="py-2">{device.device_id}</td>
                  <td className="py-2">{device.name}</td>
                  <td className="py-2">{device.device_type}</td>
                  <td className="py-2">
                    <input
                      className="w-full rounded-md border border-slate-700 bg-slate-900/70 px-2 py-1 text-sm text-slate-100"
                      value={device.room || ''}
                      onChange={(event) =>
                        handleChange(device.device_id, 'room', event.target.value)
                      }
                    />
                  </td>
                  <td className="py-2">
                    <input
                      className="w-full rounded-md border border-slate-700 bg-slate-900/70 px-2 py-1 text-sm text-slate-100"
                      value={device.location || ''}
                      onChange={(event) =>
                        handleChange(device.device_id, 'location', event.target.value)
                      }
                    />
                  </td>
                  <td className="py-2">
                    <input
                      type="checkbox"
                      checked={device.enabled ?? true}
                      onChange={(event) =>
                        handleChange(device.device_id, 'enabled', event.target.checked)
                      }
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-xs text-slate-400">
        Редактируйте помещение, локацию и включённость устройств. ID/имя изменяются через отдельные инструменты.
      </p>
      <div className="flex items-center gap-3">
        <button className="btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Сохранение...' : '💾 Сохранить конфигурацию'}
        </button>
        {message && <span className="text-sm text-slate-300">{message}</span>}
      </div>
    </div>
  );
}

function UsersTab({
  users,
  setUsers,
  invites,
  setInvites,
}: {
  users: UserProfile[];
  setUsers: React.Dispatch<React.SetStateAction<UserProfile[]>>;
  invites: InviteCode[];
  setInvites: React.Dispatch<React.SetStateAction<InviteCode[]>>;
}) {
  const [newUser, setNewUser] = useState({
    name: '',
    role: 'operator' as UserProfile['role'],
    pin: '',
    telegramId: '',
  });
  const [editUserId, setEditUserId] = useState(users[0]?.id ?? '');
  const [message, setMessage] = useState('');
  const [inviteRole, setInviteRole] = useState<UserProfile['role']>('operator');
  const [inviteHours, setInviteHours] = useState(24);

  const selectedUser = users.find((user) => user.id === editUserId);

  const handleCreateUser = () => {
    if (!newUser.name || !newUser.pin) {
      setMessage('Имя и PIN обязательны');
      return;
    }

    const created: UserProfile = {
      id: `${Date.now()}`,
      name: newUser.name,
      role: newUser.role,
      pin: newUser.pin,
      telegramId: newUser.telegramId,
      active: true,
    };

    setUsers((prev) => [...prev, created]);
    setNewUser({ name: '', role: 'operator', pin: '', telegramId: '' });
    setMessage('Пользователь создан');
  };

  const handleUpdateUser = (updates: Partial<UserProfile>) => {
    if (!selectedUser) return;
    setUsers((prev) =>
      prev.map((user) => (user.id === selectedUser.id ? { ...user, ...updates } : user))
    );
    setMessage('Изменения сохранены');
  };

  const handleCreateInvite = (role: UserProfile['role'], hours: number) => {
    const code = Math.random().toString(36).slice(2, 10).toUpperCase();
    const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
    setInvites((prev) => [{ code, role, expiresAt }, ...prev]);
    setMessage(`Приглашение создано: ${code}`);
  };

  return (
    <div className="space-y-6">
      <div className="card space-y-4">
        <h3 className="text-lg font-semibold">👥 Пользователи</h3>
        {users.length === 0 ? (
          <p className="text-sm text-slate-400">Пользователей пока нет — создайте первого</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-left">
              <thead className="text-xs text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-2">Имя</th>
                  <th className="py-2">Роль</th>
                  <th className="py-2">Telegram</th>
                  <th className="py-2">Активен</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b last:border-b-0">
                    <td className="py-2">{user.name}</td>
                    <td className="py-2">{user.role}</td>
                    <td className="py-2">{user.telegramId || '—'}</td>
                    <td className="py-2">{user.active ? 'Да' : 'Нет'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card space-y-4">
        <h4 className="text-lg font-semibold">➕ Добавить пользователя</h4>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <input
            className="rounded-md border border-slate-700 bg-slate-900/70 px-2 py-1 text-sm text-slate-100"
            placeholder="Имя"
            value={newUser.name}
            onChange={(event) => setNewUser({ ...newUser, name: event.target.value })}
          />
          <select
            className="rounded-md border border-slate-700 bg-slate-900/70 px-2 py-1 text-sm text-slate-100"
            value={newUser.role}
            onChange={(event) =>
              setNewUser({ ...newUser, role: event.target.value as UserProfile['role'] })
            }
          >
            <option value="admin">Admin</option>
            <option value="operator">Operator</option>
            <option value="viewer">Viewer</option>
          </select>
          <input
            className="rounded-md border border-slate-700 bg-slate-900/70 px-2 py-1 text-sm text-slate-100"
            placeholder="PIN"
            type="password"
            value={newUser.pin}
            onChange={(event) => setNewUser({ ...newUser, pin: event.target.value })}
          />
          <input
            className="rounded-md border border-slate-700 bg-slate-900/70 px-2 py-1 text-sm text-slate-100"
            placeholder="Telegram ID"
            value={newUser.telegramId}
            onChange={(event) =>
              setNewUser({ ...newUser, telegramId: event.target.value })
            }
          />
        </div>
        <button className="btn-primary" onClick={handleCreateUser}>
          Создать
        </button>
      </div>

      <div className="card space-y-4">
        <h4 className="text-lg font-semibold">✏️ Изменить пользователя</h4>
        <select
          className="rounded-md border border-slate-700 bg-slate-900/70 px-2 py-1 text-sm text-slate-100"
          value={editUserId}
          onChange={(event) => setEditUserId(event.target.value)}
        >
          {users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.name}
            </option>
          ))}
        </select>
        {selectedUser && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <input
              className="rounded-md border border-slate-700 bg-slate-900/70 px-2 py-1 text-sm text-slate-100"
              value={selectedUser.name}
              onChange={(event) => handleUpdateUser({ name: event.target.value })}
            />
            <select
              className="rounded-md border border-slate-700 bg-slate-900/70 px-2 py-1 text-sm text-slate-100"
              value={selectedUser.role}
              onChange={(event) =>
                handleUpdateUser({ role: event.target.value as UserProfile['role'] })
              }
            >
              <option value="admin">Admin</option>
              <option value="operator">Operator</option>
              <option value="viewer">Viewer</option>
            </select>
            <input
              className="rounded-md border border-slate-700 bg-slate-900/70 px-2 py-1 text-sm text-slate-100"
              placeholder="Новый PIN"
              type="password"
              onChange={(event) => handleUpdateUser({ pin: event.target.value })}
            />
            <label className="flex items-center space-x-2 text-sm">
              <input
                type="checkbox"
                checked={selectedUser.active}
                onChange={(event) => handleUpdateUser({ active: event.target.checked })}
              />
              <span>Активен</span>
            </label>
          </div>
        )}
      </div>

      <div className="card space-y-4">
        <h4 className="text-lg font-semibold">✉️ Приглашения для Telegram</h4>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <select
            className="rounded-md border border-slate-700 bg-slate-900/70 px-2 py-1 text-sm text-slate-100"
            value={inviteRole}
            onChange={(event) => setInviteRole(event.target.value as UserProfile['role'])}
          >
            <option value="admin">Admin</option>
            <option value="operator">Operator</option>
            <option value="viewer">Viewer</option>
          </select>
          <select
            className="rounded-md border border-slate-700 bg-slate-900/70 px-2 py-1 text-sm text-slate-100"
            value={inviteHours}
            onChange={(event) => setInviteHours(Number(event.target.value))}
          >
            {[1, 6, 12, 24, 48, 72, 168].map((value) => (
              <option key={value} value={value}>
                {value} ч
              </option>
            ))}
          </select>
          <button
            className="btn-primary"
            onClick={() => handleCreateInvite(inviteRole, inviteHours)}
          >
            Создать приглашение
          </button>
        </div>

        {invites.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-left">
              <thead className="text-xs text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-2">Код</th>
                  <th className="py-2">Роль</th>
                  <th className="py-2">Срок действия</th>
                </tr>
              </thead>
              <tbody>
                {invites.map((invite) => (
                  <tr key={invite.code} className="border-b last:border-b-0">
                    <td className="py-2">{invite.code}</td>
                    <td className="py-2">{invite.role}</td>
                    <td className="py-2">
                      {format(new Date(invite.expiresAt), 'dd.MM HH:mm')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-slate-400">Активных приглашений нет</p>
        )}
      </div>

      {message && <p className="text-sm text-emerald-300">{message}</p>}
    </div>
  );
}
