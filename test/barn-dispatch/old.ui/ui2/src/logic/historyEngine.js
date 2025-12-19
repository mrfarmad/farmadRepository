export function pushHistory(h, p) {
  const max = 200;
  return {
    temperature: [...h.temperature, p.t].slice(-max),
    humidity:    [...h.humidity,    p.rh].slice(-max),
    nh3:         [...h.nh3,         p.nh3].slice(-max),
    times:       [...h.times,       new Date().toISOString()].slice(-max),
  };
}
