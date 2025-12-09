export default function AccessPanel() {
  return (
    <div className="card space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="card-title">Доступ</h3>
        <span className="pill-muted">Env Admin</span>
      </div>
      <div className="text-sm text-slate-300">Пользователь: Env Admin (admin)</div>
      <button className="w-full px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-sm font-semibold">Выйти</button>
    </div>
  );
}
