# EDGE Gateway Dashboard

Modern React/Next.js dashboard for EDGE Industrial IoT Gateway monitoring and control.

## Quick Start

### 1. Install Dependencies

```bash
cd js_new
node start-dashboard.js
```

This will automatically:
- Install dashboard dependencies (if not installed)
- Start Next.js development server on port 3000
- Connect to EDGE Gateway backend services

### 2. Manual Installation

```bash
cd dashboard
npm install
npm run dev
```

Dashboard available at: http://localhost:3000

## Architecture

```
Dashboard (Port 3000)
  ↓
  ├─→ REST API Proxy → Health API (Port 8090)
  ├─→ WebSocket Client → WebSocket Server (Port 8000)
  └─→ Server Actions → EDGE Backend (Node.js)
```

## Features

### ✅ Real-Time Monitoring
- Live device data via WebSocket
- Automatic reconnection
- Real-time charts and graphs

### ✅ Device Management
- View all devices
- Device status indicators
- Historical data visualization
- Filter by location/room

### ✅ Control Interface
- Send commands to devices
- Write register values
- Command queue monitoring

### ✅ Alarm System
- Critical alarm notifications
- Warning display
- Alarm history

### ✅ Health Monitoring
- System health status
- Component health checks
- Performance metrics

## Project Structure

```
dashboard/
├── app/                        # Next.js 14 App Router
│   ├── layout.tsx             # Root layout
│   ├── page.tsx               # Home/Dashboard page
│   ├── devices/
│   │   └── page.tsx           # All devices view
│   ├── rooms/
│   │   └── page.tsx           # Room grouping view
│   ├── alarms/
│   │   └── page.tsx           # Alarms page
│   └── api/                   # API routes
│       ├── devices/
│       │   └── route.ts       # GET /api/devices
│       └── command/
│           └── route.ts       # POST /api/command
├── components/                # React components
│   ├── DeviceCard.tsx        # Device status card
│   ├── RoomCard.tsx          # Room overview
│   ├── AlarmPanel.tsx        # Alarm display
│   ├── MetricChart.tsx       # Charts
│   └── WebSocketClient.tsx   # WS connection
├── lib/                       # Utilities
│   ├── websocket.ts          # WebSocket hook
│   ├── api.ts                # API client
│   └── types.ts              # TypeScript types
└── styles/
    └── globals.css           # Global styles
```

## Configuration

### Environment Variables

Create `.env.local`:

```env
# Backend URLs
NEXT_PUBLIC_WEBSOCKET_URL=ws://localhost:8000
NEXT_PUBLIC_HEALTH_API_URL=http://localhost:8090

# Database (optional, for direct access)
DATABASE_PATH=../storage/edge_data.db
```

## Usage

### Start Backend Services

```bash
# Terminal 1 - EDGE Gateway
cd js_new
npm start
```

### Start Dashboard

```bash
# Terminal 2 - Dashboard
cd js_new
node start-dashboard.js

# Or manually:
cd dashboard
npm run dev
```

### Access Dashboard

Open browser: http://localhost:3000

## Development

### Install Dependencies

```bash
npm install
```

### Run Development Server

```bash
npm run dev
```

### Build for Production

```bash
npm run build
npm start
```

### Lint Code

```bash
npm run lint
```

## Components

### WebSocketClient

Real-time data connection:

```typescript
import { WebSocketClient } from '@/components/WebSocketClient';

<WebSocketClient url={process.env.NEXT_PUBLIC_WEBSOCKET_URL} />
```

### DeviceCard

Display device status:

```typescript
import { DeviceCard } from '@/components/DeviceCard';

<DeviceCard device={device} data={liveData} />
```

### AlarmPanel

Show active alarms:

```typescript
import { AlarmPanel } from '@/components/AlarmPanel';

<AlarmPanel alarms={activeAlarms} />
```

## API Routes

### GET /api/devices

List all devices:

```bash
curl http://localhost:3000/api/devices
```

Response:
```json
{
  "devices": [
    {
      "device_id": 1,
      "device_type": "KUB-1063",
      "name": "Climate Controller",
      "enabled": true,
      "location": "North Farm",
      "room": "Barn 1"
    }
  ]
}
```

### POST /api/command

Send command to device:

```bash
curl -X POST http://localhost:3000/api/command \
  -H "Content-Type: application/json" \
  -d '{
    "deviceId": 1,
    "register": 32,
    "value": 100
  }'
```

Response:
```json
{
  "success": true,
  "commandId": 12345
}
```

### GET /api/health

Proxy to Health API:

```bash
curl http://localhost:3000/api/health
```

## Deployment

### Production Build

```bash
npm run build
npm start
```

### Using PM2

```bash
# Install PM2
npm install -g pm2

# Start dashboard
pm2 start npm --name "edge-dashboard" -- start

# Monitor
pm2 monit
pm2 logs edge-dashboard
```

### Environment-Specific Builds

```bash
# Development
NODE_ENV=development npm run dev

# Production
NODE_ENV=production npm run build
NODE_ENV=production npm start
```

## Troubleshooting

### Port Already in Use

```bash
# Kill process on port 3000
npx kill-port 3000

# Or use different port
PORT=3001 npm run dev
```

### WebSocket Connection Failed

1. Check EDGE Gateway is running:
   ```bash
   curl http://localhost:8090/health
   ```

2. Verify WebSocket port in `.env.local`

3. Check browser console for errors

### Build Errors

```bash
# Clean and rebuild
rm -rf .next
npm run build
```

## Browser Support

- Chrome/Edge: ✅ Full support
- Firefox: ✅ Full support
- Safari: ✅ Full support
- Mobile: ✅ Responsive design

## Performance

- Initial Load: < 2s
- Time to Interactive: < 3s
- WebSocket Latency: < 100ms
- Real-time Updates: < 500ms

## Security

- No sensitive data in client code
- Environment variables for configuration
- CORS configured
- Input validation on API routes

## Contributing

1. Create feature branch
2. Make changes
3. Test locally
4. Submit pull request

## License

Proprietary - CUBE_RS EDGE Project

---

**Version:** 1.0.0
**Last Updated:** 2026-01-22
