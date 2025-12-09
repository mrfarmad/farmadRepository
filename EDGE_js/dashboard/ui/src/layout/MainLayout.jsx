export default function MainLayout({ sidebar, children }) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex">
      <aside className="w-full max-w-xs bg-slate-900/80 border-r border-slate-800 p-5 sticky top-0 h-screen overflow-y-auto">
        {sidebar}
      </aside>
      <main className="flex-1 p-6 lg:p-10 overflow-y-auto">{children}</main>
    </div>
  );
}
