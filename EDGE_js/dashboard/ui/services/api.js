const HEALTH_URL = 'http://localhost:8090/health';

export async function fetchHealth() {
  const res = await fetch(HEALTH_URL);
  if (!res.ok) {
    throw new Error(`Health request failed: ${res.status}`);
  }
  return res.json();
}
