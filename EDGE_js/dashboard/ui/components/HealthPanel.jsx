export default function HealthPanel({ health }) {
  const status = health?.status ?? 'unknown';
  const color = statusColor(status);
  return (
    <div className="border border-slate-800 bg-slate-900/70 rounded-lg px-4 py-3 flex items-center gap-3">
      <div className={`w-2 h-2 rounded-full ${color}`}></div>
      <div>
        <p className="text-sm font-semibold">Health: {status}</p>
        {health?.timestamp && (
          <p className="text-xs text-slate-500">Updated {new Date(health.timestamp).toLocaleTimeString()}</p>
        )}
      </div>
    </div>
  );
}

function statusColor(status) {
  switch (status) {
    case 'ok':
    case 'healthy':
      return 'bg-emerald-400';
    case 'warning':
      return 'bg-amber-400';
    case 'unreachable':
    case 'error':
      return 'bg-red-500';
    default:
      return 'bg-slate-500';
  }
}
