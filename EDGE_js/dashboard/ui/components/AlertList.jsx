export default function AlertList({ alerts }) {
  const list = alerts?.length ? alerts : [{ level: 'info', message: 'No active alerts' }];
  return (
    <div className="border border-slate-800 bg-slate-900/70 rounded-lg p-4 h-full">
      <h3 className="text-sm font-semibold text-slate-200 mb-3">Alerts</h3>
      <ul className="space-y-2">
        {list.map((alert, idx) => (
          <li key={idx} className="flex items-start gap-2 text-sm">
            <span className={`w-2 h-2 mt-2 rounded-full ${color(alert.level)}`}></span>
            <div>
              <p className="text-slate-100">{alert.message ?? alert}</p>
              {alert.device && <p className="text-xs text-slate-500">Device: {alert.device}</p>}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function color(level) {
  switch (level) {
    case 'critical':
      return 'bg-red-500';
    case 'warning':
      return 'bg-amber-400';
    case 'ok':
    case 'info':
    default:
      return 'bg-emerald-400';
  }
}
