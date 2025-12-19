import MetricTile from './MetricTile';

export default function DeviceCard({ device }) {
  const metrics = device.metrics || [];
  return (
    <div className="card space-y-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <div className="text-lg font-semibold">{device.name}</div>
          <div className="text-xs text-slate-400">ID {device.id} · Slave {device.slave} · {device.type}</div>
          <div className="text-xs text-slate-500">Обновлено: {device.updatedAt ? new Date(device.updatedAt).toLocaleString() : '—'}</div>
        </div>
        <div className="text-right space-y-1">
          <span className="pill-success">{device.status || 'OK'}</span>
          <div className="text-xs text-slate-400">Аварийное реле: {device.emergencyRelay ?? '—'}</div>
        </div>
      </div>
      <div className="metric-grid">
        {metrics.map((metric) => (
          <MetricTile key={metric.label} label={metric.label} value={metric.value} />
        ))}
        {metrics.length === 0 && <div className="text-sm text-slate-400">Нет данных по показателям.</div>}
      </div>
    </div>
  );
}
