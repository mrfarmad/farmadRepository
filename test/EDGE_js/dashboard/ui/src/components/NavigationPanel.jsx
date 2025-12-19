export default function NavigationPanel({ displayMode, onDisplayModeChange, onScrollToUnassigned }) {
  return (
    <div className="card space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="card-title">Навигация</h3>
      </div>
      <div className="space-y-3 text-sm text-slate-200">
        <div className="space-y-2">
          <div className="text-xs text-slate-400">Отобразить</div>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="rooms-view"
              className="accent-sky-500"
              value="all"
              checked={displayMode === 'all'}
              onChange={() => onDisplayModeChange?.('all')}
            />
            Все помещения
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="rooms-view"
              className="accent-sky-500"
              value="none"
              checked={displayMode === 'none'}
              onChange={() => onDisplayModeChange?.('none')}
            />
            Без помещения
          </label>
        </div>
        <div className="space-y-2">
          <div className="text-xs text-slate-400">Быстрые ссылки</div>
          <button
            className="w-full px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-sm font-semibold text-left"
            type="button"
            onClick={onScrollToUnassigned}
          >
            Без помещения
          </button>
        </div>
      </div>
    </div>
  );
}
