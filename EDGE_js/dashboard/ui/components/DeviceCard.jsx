export default function DeviceCard({ device }) {
  const statusColor = device.status === 'online' ? 'text-emerald-400' : 'text-amber-400';

  return (
    <div className="border border-slate-800 bg-slate-900/70 rounded-lg p-4 shadow-sm space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">{device.type ?? 'Device'}</p>
          <h3 className="text-lg font-semibold">{device.name ?? `Device ${device.id}`}</h3>
        </div>
        <span className={`text-xs font-medium ${statusColor}`}>{device.status ?? 'unknown'}</span>
      </div>
      <div className="grid grid-cols-2 gap-2 text-sm text-slate-300">
        <Metric label="Temp" value={formatValue(device.temperature, '°C')} />
        <Metric label="Humidity" value={formatValue(device.humidity, '%')} />
        <Metric label="Last value" value={device.lastValue ?? '—'} />
        <Metric label="Updated" value={device.lastSeen ? new Date(device.lastSeen).toLocaleTimeString() : '—'} />
      </div>
      {device.alerts?.length ? (
        <ul className="text-xs text-amber-400 list-disc ml-4">
          {device.alerts.map((alert, idx) => (
            <li key={idx}>{alert}</li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-slate-500">No active alerts</p>
      )}
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-slate-500">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}

function formatValue(value, suffix) {
  if (value === null || value === undefined) return '—';
  return `${value}${suffix ?? ''}`;
}
