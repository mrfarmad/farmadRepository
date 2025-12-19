import { useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "ui-core.controllers.v1";

const INITIAL_CONTROLLERS = [
  { num: 1, code: "ctrl-1", name: "ДМБ" },
  { num: 2, code: "ctrl-2", name: "Профилакторий" },
  { num: 3, code: "ctrl-3", name: "Телятник" },
  { num: 4, code: "ctrl-4", name: "Корпус 8 рядов" },
  { num: 5, code: "ctrl-5", name: "РСО" },
  { num: 6, code: "ctrl-6", name: "Нетелиный корпус" },
];

const DEFAULT_LINK = {
  enabled: true,
  ip: "192.168.0.100",
  port: 502,
  unitId: 1,
  baudRate: 9600,
  dataBits: 8,
  parity: "N",
  stopBits: 1,
  pollMs: 5000,
};

const DEFAULT_HEALTH = {
  online: false,
  lastSeenMs: null,
  errors: 0,
  mockEnabled: true,
};

function withDefaults(list) {
  return list.map((c, idx) => ({
    ...c,
    num: c.num ?? idx + 1,
    link: { ...DEFAULT_LINK, ...(c.link || {}) },
    health: { ...DEFAULT_HEALTH, ...(c.health || {}) },
  }));
}

export function useControllersState() {
  const [controllers, setControllers] = useState(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return withDefaults(INITIAL_CONTROLLERS);
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return withDefaults(INITIAL_CONTROLLERS);
      return withDefaults(parsed);
    } catch {
      return withDefaults(INITIAL_CONTROLLERS);
    }
  });

  const [activeCode, setActiveCode] = useState("ctrl-1");

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(controllers));
    } catch {
      // ignore
    }
  }, [controllers]);

  const activeController = useMemo(
    () => controllers.find((c) => c.code === activeCode) ?? controllers[0],
    [controllers, activeCode]
  );

  const updateController = (code, patch) => {
    setControllers((prev) =>
      prev.map((c) => (c.code === code ? { ...c, ...patch } : c))
    );
  };

  return {
    controllers,
    activeCode,
    setActiveCode,
    activeController,
    updateController,
  };
}
