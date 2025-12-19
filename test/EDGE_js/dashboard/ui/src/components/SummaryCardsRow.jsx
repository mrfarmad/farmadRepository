function SummaryCard({ title, value, accent }) {
  return (
    <div className="card">
      <div className="text-xs text-slate-400">{title}</div>
      <div className={`text-2xl font-semibold mt-2 ${accent}`}>{value ?? '—'}</div>
    </div>
  );
}

export default function SummaryCardsRow({ summary, lastFetched }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
      <SummaryCard title="Устройств без помещения" value={summary.unassignedDevices} accent="text-amber-300" />
      <SummaryCard title="Устройств оффлайн" value={summary.offlineDevices} accent="text-rose-300" />
      <SummaryCard title="Активные аварии" value={summary.activeAlarms} accent="text-emerald-300" />
      <SummaryCard
        title="Последнее обновление"
        value={lastFetched ? new Date(lastFetched).toLocaleTimeString() : '—'}
        accent="text-sky-300"
      />
    </div>
  );
}
