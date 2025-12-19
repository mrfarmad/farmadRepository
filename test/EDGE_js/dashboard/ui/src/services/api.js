const DASHBOARD_BASE = import.meta.env.VITE_DASHBOARD_API || 'http://localhost:8090/api/dashboard';

export async function getSummary() {
  try {
    const res = await withTimeout(`${DASHBOARD_BASE}/summary`);
    if (!res.ok) throw new Error(`Summary request failed: ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('Using fallback summary data', err);
    return {
      unassignedDevices: 2,
      offlineDevices: 1,
      activeAlarms: 0,
      lastUpdate: new Date().toISOString(),
    };
  }
}

export async function getRooms() {
  try {
    const res = await withTimeout(`${DASHBOARD_BASE}/rooms`);
    if (!res.ok) throw new Error(`Rooms request failed: ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('Using fallback room data', err);
    return buildFallbackRooms();
  }
}

async function withTimeout(url, options = {}, ms = 6000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

function buildFallbackRooms() {
  const commonMetrics = [
    'Версия ПО',
    'Заводской номер',
    'Номер устройства',
    'ГНВ базовой/туннельной вентиляции',
    'Таймеры',
    'Кривая целевой температуры: включена',
    'Количество точек кривой целевой температуры',
    'Отрицательное давление',
    'Относительная влажность',
    'Концентрация CO2',
    'Концентрация NH3',
    'ГРВ базовой вентиляции',
    'ГРВ туннельной вентиляции',
  ];

  const sampleDevices = [
    {
      id: 1,
      name: 'KUB-1063 #1',
      slave: 1,
      type: 'KUB-1063',
      status: 'OK',
      emergencyRelay: '—',
      updatedAt: null,
      metrics: commonMetrics.map((label) => ({ label, value: '—' })),
    },
    {
      id: 2,
      name: 'KUB-1063 #2',
      slave: 2,
      type: 'KUB-1063',
      status: 'OK',
      emergencyRelay: '—',
      updatedAt: null,
      metrics: commonMetrics.map((label) => ({ label, value: '—' })),
    },
  ];

  return [
    {
      id: 'unassigned',
      name: 'Без помещения',
      description: 'Устройства без привязки к помещению',
      status: 'Норма',
      isUnassigned: true,
      activeAlarms: 0,
      devices: sampleDevices,
    },
  ];
}
