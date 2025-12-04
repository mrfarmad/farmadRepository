import http from 'http';
import express from 'express';
import cors from 'cors';
import { Server as SocketServer } from 'socket.io';
import devicesRouter from './routes/devices.js';
import statusRouter from './routes/status.js';
import { deviceStore } from './store/deviceStore.js';
import { config } from './config/index.js';
import { createTelemetryService } from './services/telemetryService.js';
import { createPingService } from './services/pingService.js';

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/devices', devicesRouter);
app.use('/api/status', statusRouter);

const server = http.createServer(app);
const io = new SocketServer(server, { cors: { origin: '*' } });

io.on('connection', (socket) => {
  socket.emit('hello', { message: 'connected to EDGE Node (JS)' });
});

const telemetry = createTelemetryService({ io, interval: config.telemetryIntervalMs });
telemetry.start();

const pingService = createPingService({ io, interval: config.pingIntervalMs, url: process.env.PING_URL });
pingService.start();

// Seed demo device registry for UI preview
['KUB-1063', 'KUB-1112'].forEach((id, idx) => {
  deviceStore.upsert({
    id,
    name: `Demo device ${idx + 1}`,
    location: idx === 0 ? 'Barn A' : 'Barn B',
    firmware: '1.0.0'
  });
});

const PORT = config.port;
server.listen(PORT, () => {
  console.log(`EDGE Node JS server listening on port ${PORT}`);
});