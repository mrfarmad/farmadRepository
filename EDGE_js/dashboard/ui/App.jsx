import { useEffect, useMemo, useState } from 'react';
import Sidebar from './components/Sidebar';
import DeviceCard from './components/DeviceCard';
import AlertList from './components/AlertList';
import HealthPanel from './components/HealthPanel';
import ChartPanel from './components/ChartPanel';
import { fetchHealth } from './services/api';
import { connectWebSocket } from './services/websocket';

const initialDeviceState = {
  devices: [],
  alerts: [],
  metrics: [],
};

const deviceTypes = ['all', 'kub', 'vfd', 'sensor'];

export default function App() {
  const [health, setHealth] = useState({ status: 'unknown', timestamp: null });
  const [data, setData] = useState(initialDeviceState);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [zoneFilter, setZoneFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchHealth()
      .then((result) => {
        setHealth({ status: result.status ?? 'ok', timestamp: new Date().toISOString() });
      })
      .catch(() => setHealth({ status: 'unreachable', timestamp: new Date().toISOString() }));
  }, []);

  useEffect(() => {
    const ws = connectWebSocket({
      onOpen: () => setConnectionStatus('connected'),
      onClose: () => setConnectionStatus('disconnected'),
      onError: () => setConnectionStatus('error'),
      onMessage: (payload) => {
        setData((prev) => {
          const nextDevices = mergeDevices(prev.devices, payload.devices ?? []);
          const nextAlerts = payload.alerts ?? prev.alerts;
          const nextMetrics = [...(prev.metrics ?? []), ...(payload.metrics ?? [])].slice(-200);
          return { devices: nextDevices, alerts: nextAlerts, metrics: nextMetrics };
        });
      },
    });

    return () => ws?.close?.();
  }, []);

  const zones = useMemo(() => aggregateZones(data.devices), [data.devices]);
  const filteredDevices = useMemo(() => applyFilters(data.devices, { zoneFilter, typeFilter, search }), [data.devices, zoneFilter, typeFilter, search]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex font-sans">
      <Sidebar zones={zones} connectionStatus={connectionStatus} />
      <main className="flex-1 p-6 space-y-6 overflow-auto">
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">EDGE Device Dashboard</h1>
            <p className="text-sm text-slate-400">Real-time Modbus telemetry and health</p>
          </div>
          <div className="flex flex-wrap gap-3 items-center">
            <FilterSelect label="Зона" value={zoneFilter} onChange={setZoneFilter} options={['all', ...zones.map((z) => z.zone)]} />
            <FilterSelect label="Тип" value={typeFilter} onChange={setTypeFilter} options={deviceTypes} />
            <label className="text-xs text-slate-400 flex items-center gap-2">
              <span>Поиск</span>
              <input
                className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm focus:outline-none focus:ring focus:ring-sky-500"
                placeholder="имя или ID"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
            <HealthPanel health={health} />
          </div>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {filteredDevices.map((device) => (
            <DeviceCard key={device.id} device={device} />
          ))}
          {filteredDevices.length === 0 && (
            <div className="col-span-full text-sm text-slate-400 border border-dashed border-slate-700 rounded-lg p-4">
              Нет устройств под выбранные фильтры или нет телеметрии из WebSocket.
            </div>
          )}
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3">
            <ChartPanel metrics={data.metrics} />
          </div>
          <div className="lg:col-span-1">
            <AlertList alerts={data.alerts} />
          </div>
        </section>
      </main>
    </div>
  );
}

function applyFilters(devices, { zoneFilter, typeFilter, search }) {
  return devices
    .filter((d) => zoneFilter === 'all' || d.zone === zoneFilter)
    .filter((d) => typeFilter === 'all' || (d.type || '').toLowerCase() === typeFilter)
    .filter((d) => {
      if (!search.trim()) return true;
      const needle = search.toLowerCase();
      return `${d.name ?? ''}`.toLowerCase().includes(needle) || `${d.id}`.includes(needle);
    });
}

function mergeDevices(current, incoming) {
  const map = new Map(current.map((d) => [d.id, d]));
  incoming.forEach((device) => {
    map.set(device.id, { ...map.get(device.id), ...device, lastSeen: new Date().toISOString() });
  });
  return Array.from(map.values()).sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));
}

function aggregateZones(devices) {
  const byZone = devices.reduce((acc, device) => {
    const zone = device.zone ?? 'default';
    if (!acc[zone]) {
      acc[zone] = { count: 0, alerts: 0, temperature: [], humidity: [] };
    }
    acc[zone].count += 1;
    if (device.alerts?.length) acc[zone].alerts += device.alerts.length;
    if (typeof device.temperature === 'number') acc[zone].temperature.push(device.temperature);
    if (typeof device.humidity === 'number') acc[zone].humidity.push(device.humidity);
    return acc;
  }, {});

  return Object.entries(byZone).map(([zone, info]) => ({
    zone,
    count: info.count,
    alerts: info.alerts,
    avgTemperature: average(info.temperature),
    avgHumidity: average(info.humidity),
  }));
}

function average(values) {
  if (!values.length) return null;
  const sum = values.reduce((acc, val) => acc + val, 0);
  return Math.round((sum / values.length) * 10) / 10;
}

function FilterSelect({ label, value, onChange, options }) {
  return (
    <label className="text-xs text-slate-400 flex items-center gap-2">
      <span>{label}</span>
      <select
        className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm focus:outline-none focus:ring focus:ring-sky-500"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </label>
  );
}
