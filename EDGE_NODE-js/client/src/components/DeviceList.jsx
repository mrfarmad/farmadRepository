import React from 'react';

export default function DeviceList({ devices }) {
  if (!devices.length) {
    return <p className="muted">Нет активных устройств</p>;
  }

  return (
    <div className="list">
      {devices.map((device) => (
        <article key={device.id} className="card">
          <header className="card__header">
            <div>
              <strong>{device.name}</strong>
              <p className="muted">ID: {device.id}</p>
            </div>
            <span className={`pill pill--${device.metrics?.status === 'degraded' ? 'warn' : 'ok'}`}>
              {device.metrics?.status || 'unknown'}
            </span>
          </header>
          <dl className="grid">
            <div>
              <dt>Локация</dt>
              <dd>{device.location || '—'}</dd>
            </div>
            <div>
              <dt>Прошивка</dt>
              <dd>{device.firmware || '—'}</dd>
            </div>
            <div>
              <dt>Обновлено</dt>
              <dd>{device.updatedAt || '—'}</dd>
            </div>
          </dl>
        </article>
      ))}
    </div>
  );
}