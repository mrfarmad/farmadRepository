export default function UpdatePanel({
  autoRefresh,
  intervalMinutes,
  onAutoRefreshChange,
  onIntervalChange,
  onApplySettings,
  onRefreshNow,
}) {
  return (
    <div className="card space-y-4">
      <h3 className="card-title">Обновление</h3>
      <div className="space-y-3 text-sm text-slate-200">
        <div className="flex items-center justify-between gap-3">
          <button
            className="flex-1 px-3 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-sm font-semibold text-white"
            onClick={onApplySettings}
            type="button"
          >
            Обновить настройки
          </button>
          <label className="flex items-center gap-2 text-xs text-slate-300">
            <input
              type="checkbox"
              className="accent-sky-500 h-4 w-4"
              checked={autoRefresh}
              onChange={(e) => onAutoRefreshChange?.(e.target.checked)}
            />
            Автообновление
          </label>
        </div>
        <label className="flex items-center justify-between text-xs text-slate-300 gap-3">
          <span>Интервал, мин</span>
          <input
            type="number"
            min={1}
            max={60}
            value={intervalMinutes}
            onChange={(e) => onIntervalChange?.(Number(e.target.value) || 1)}
            className="w-20 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-right"
          />
        </label>
        <button
          className="w-full px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-sm font-semibold"
          onClick={onRefreshNow}
          type="button"
        >
          Обновить сейчас
        </button>
      </div>
    </div>
  );
}
