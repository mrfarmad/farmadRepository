import { useState } from 'react';

export default function Tabs({ tabs, defaultValue = '' }) {
  const [active, setActive] = useState(defaultValue || tabs[0]?.value);

  const activeContent = tabs.find((tab) => tab.value === active)?.content;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setActive(tab.value)}
            className={`px-3 py-2 text-xs font-semibold rounded-lg border ${
              active === tab.value
                ? 'border-sky-500 text-sky-200 bg-sky-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div>{activeContent}</div>
    </div>
  );
}
