import React, { useEffect, useMemo, useState } from 'react';
import { io } from 'socket.io-client';
import DeviceList from './components/DeviceList.jsx';
import MetricCards from './components/MetricCards.jsx';
import PingStatus from './components/PingStatus.jsx';

const socket = io('http://localhost:8090');

export default function App() {
  const [telemetry, setTelemetry] = useState([]);
  const [hello, setHello] = useState('');
  const [ping, setPing] = useState({ status: 'pending' });

  useEffect(() => {
    socket.on('hello', (payload) => setHello(payload.message));
    socket.on('telemetry', (payload) => setTelemetry(payload));
    socket.on('ping', (payload) => setPing(payload));

    return () => {
      socket.off('hello');
      socket.off('telemetry');
      socket.off('ping');
    };
  }, []);

  const latestMetrics = useMemo(() => telemetry.map((device) => ({ ...device.metrics, id: device.id, name: device.name })), [telemetry]);

  return (
    <div className="page">
      <header className="header">
        <div>
          <h1>EDGE Node — JS + React</h1>
          <p className="subtitle">Новая реализация шлюза без Python</p>
        </div>
        <span className="badge">{hello || 'подключаемся...'}</span>
      </header>

      <main className="layout">
        <section className="panel">
          <h2>Устройства</h2>
          <DeviceList devices={telemetry} />
        </section>

        <section className="panel">
          <h2>Текущие метрики</h2>
          <MetricCards metrics={latestMetrics} />
        </section>

        <section className="panel">
          <h2>Статус PING</h2>
          <PingStatus ping={ping} />
        </section>
      </main>
    </div>
  );
}