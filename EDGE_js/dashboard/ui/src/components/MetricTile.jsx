export default function MetricTile({ label, value }) {
  return (
    <div className="card bg-slate-900/80">
      <div className="text-xs text-slate-400">{label}</div>
      <div className="mt-2 text-sm font-semibold text-slate-100">{value ?? '—'}</div>
    </div>
  );
}
