const HEALTH_URL = import.meta.env.VITE_HEALTH_URL || 'http://localhost:8090/health';

export async function fetchHealth({ signal } = {}) {
  const controller = signal ? null : new AbortController();
  const activeSignal = signal || controller?.signal;
  const timeout = setTimeout(() => controller?.abort(), 5000);
  try {
    const res = await fetch(HEALTH_URL, { signal: activeSignal });
    if (!res.ok) {
      throw new Error(`Health request failed: ${res.status}`);
    }
    return await res.json();
  } finally {
    clearTimeout(timeout);
  }
}
