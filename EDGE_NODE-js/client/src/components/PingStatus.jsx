import React from 'react';

export default function PingStatus({ ping }) {
  const status = ping.status || 'pending';
  return (
    <div className="card">
      <header className="card__header">
        <div>
          <strong>PING сервис</strong>
          <p className="muted">Обновлено: {ping.timestamp || '—'}</p>
        </div>
        <span className={`pill pill--${status === 'failed' ? 'warn' : 'ok'}`}>{status}</span>
      </header>
      {ping.error && <p className="error">{ping.error}</p>}
    </div>
  );
}