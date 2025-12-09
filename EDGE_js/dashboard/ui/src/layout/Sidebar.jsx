import AccessPanel from '../components/AccessPanel';
import UpdatePanel from '../components/UpdatePanel';
import NavigationPanel from '../components/NavigationPanel';

export default function Sidebar({
  autoRefresh,
  intervalMinutes,
  displayMode,
  onAutoRefreshChange,
  onIntervalChange,
  onDisplayModeChange,
  onApplySettings,
  onRefreshNow,
  onScrollToUnassigned,
  connectionStatus,
}) {
  return (
    <div className="space-y-4">
      <AccessPanel />
      <UpdatePanel
        autoRefresh={autoRefresh}
        intervalMinutes={intervalMinutes}
        onAutoRefreshChange={onAutoRefreshChange}
        onIntervalChange={onIntervalChange}
        onApplySettings={onApplySettings}
        onRefreshNow={onRefreshNow}
      />
      <NavigationPanel
        displayMode={displayMode}
        onDisplayModeChange={onDisplayModeChange}
        onScrollToUnassigned={onScrollToUnassigned}
      />
      <div className="card">
        <div className="card-title mb-2">Соединение</div>
        <div className="text-sm text-slate-300">
          WebSocket: <StatusPill status={connectionStatus} />
        </div>
      </div>
    </div>
  );
}

function StatusPill({ status }) {
  const palette = {
    connected: 'bg-emerald-500/20 text-emerald-200 border-emerald-500/40',
    connecting: 'bg-amber-500/20 text-amber-200 border-amber-500/40',
    disconnected: 'bg-rose-500/20 text-rose-200 border-rose-500/40',
    error: 'bg-rose-500/20 text-rose-200 border-rose-500/40',
  };
  const label =
    {
      connected: 'Подключено',
      connecting: 'Подключение...',
      disconnected: 'Отключено',
      error: 'Ошибка',
    }[status] || 'Неизвестно';

  return <span className={`inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full border ${palette[status] || ''}`}>{label}</span>;
}
