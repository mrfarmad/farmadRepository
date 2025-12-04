import React from 'react';

export default function MetricCards({ metrics }) {
  if (!metrics.length) {
    return <p className="muted">Данных пока нет</p>;
  }

  return (
    <div className="grid grid--metrics">
      {metrics.map((item) => (
        <article key={item.id} className="card">
          <header className="card__header">
            <div>
              <strong>{item.name}</strong>
              <p className="muted">{item.timestamp}</p>
            </div>
            <span className={`pill pill--${item.status === 'degraded' ? 'warn' : 'ok'}`}>{item.status}</span>
          </header>
          <div className="grid">
            <div>
              <dt>Напряжение</dt>
              <dd>{item.voltage} V</dd>
            </div>
            <div>
              <dt>Ток</dt>
              <dd>{item.current} A</dd>
            </div>
            <div>
              <dt>Температура</dt>
              <dd>{item.temperature} ℃</dd>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}