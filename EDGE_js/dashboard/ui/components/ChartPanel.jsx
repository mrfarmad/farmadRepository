import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from 'recharts';

export default function ChartPanel({ metrics }) {
  const data = metrics?.length
    ? metrics.map((m, idx) => ({
        time: m.timestamp ?? idx,
        temperature: m.temperature,
        humidity: m.humidity,
      }))
    : sampleMetrics;

  return (
    <div className="border border-slate-800 bg-slate-900/70 rounded-lg p-4 h-full">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-slate-200">Trend</h3>
        <p className="text-xs text-slate-500">Live from Modbus stream</p>
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <XAxis dataKey="time" stroke="#94a3b8" tick={{ fontSize: 12 }} />
            <YAxis stroke="#94a3b8" tick={{ fontSize: 12 }} domain={['dataMin - 5', 'dataMax + 5']} />
            <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1e293b' }} />
            <Legend />
            <Line type="monotone" dataKey="temperature" stroke="#f87171" dot={false} name="Temperature" />
            <Line type="monotone" dataKey="humidity" stroke="#38bdf8" dot={false} name="Humidity" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

const sampleMetrics = [
  { time: '00:00', temperature: 22.5, humidity: 48 },
  { time: '00:30', temperature: 22.8, humidity: 47 },
  { time: '01:00', temperature: 23.1, humidity: 49 },
  { time: '01:30', temperature: 23.4, humidity: 50 },
  { time: '02:00', temperature: 23.0, humidity: 48 },
];
