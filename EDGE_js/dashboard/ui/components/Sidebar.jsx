export default function Sidebar({ zones, connectionStatus }) {
  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 p-4 space-y-4 hidden md:block">
      <div>
        <p className="text-xs uppercase tracking-wide text-slate-500">Connection</p>
        <p className="text-sm font-semibold">{connectionStatus}</p>
      </div>
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-wide text-slate-500">Rooms</p>
        {zones.length === 0 && <p className="text-sm text-slate-500">No zones yet</p>}
        {zones.map((zone) => (
          <div key={zone.zone} className="p-2 rounded bg-slate-800/60 border border-slate-800">
            <p className="text-sm font-semibold">{zone.zone}</p>
            <p className="text-xs text-slate-500">Devices: {zone.count}</p>
            <p className="text-xs text-slate-500">Alerts: {zone.alerts}</p>
            <p className="text-xs text-slate-500">
              Temp: {zone.avgTemperature ?? '—'}°C · Humidity: {zone.avgHumidity ?? '—'}%
            </p>
          </div>
        ))}
      </div>
    </aside>
  );
}
