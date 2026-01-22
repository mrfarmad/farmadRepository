# EDGE Gateway Dashboard - React/Next.js Migration Guide

## Overview

Complete migration plan from Python/Streamlit to React/Next.js dashboard with real-time data integration.

---

## Quick Start

### 1. Install Dashboard Dependencies

```bash
cd js_new/dashboard
npm install
```

### 2. Start Backend Services

```bash
# Terminal 1 - Start EDGE Gateway
cd js_new
npm start

# This starts:
# - Modbus reader (if hardware connected)
# - WebSocket server (port 8000)
# - Health API (port 8090)
```

### 3. Start Dashboard

```bash
# Terminal 2 - Start Next.js Dashboard
cd js_new/dashboard
npm run dev

# Dashboard available at: http://localhost:3000
```

---

## Dashboard Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Next.js Dashboard                         │
│                    (Port 3000)                               │
└────────┬────────────────────────────────────────────────────┘
         │
    ┌────┴─────┬──────────────┬────────────────┐
    │          │              │                │
┌───▼────┐ ┌──▼────┐  ┌─────▼──────┐  ┌─────▼────────┐
│ REST   │ │WebSocket│ │ Server     │  │ Direct DB   │
│ API    │ │(ws://   │ │ Actions    │  │ (Optional)  │
│        │ │8000)    │ │ (Next.js)  │  │             │
└───┬────┘ └──┬────┘  └─────┬──────┘  └─────┬────────┘
    │         │              │                │
    └─────────┴──────────────┴────────────────┘
                      │
              ┌───────▼────────┐
              │  EDGE Service  │
              │  (Node.js)     │
              └────────────────┘
```

---

## Project Structure

```
js_new/
├── dashboard/                          # Next.js Dashboard
│   ├── app/                           # Next.js 14 App Router
│   │   ├── layout.tsx                # Root layout
│   │   ├── page.tsx                  # Home page
│   │   ├── devices/
│   │   │   └── page.tsx              # Devices overview
│   │   ├── device/
│   │   │   └── [id]/
│   │   │       └── page.tsx          # Device detail
│   │   ├── rooms/
│   │   │   └── page.tsx              # Rooms overview
│   │   ├── alarms/
│   │   │   └── page.tsx              # Alarms page
│   │   └── api/                      # API routes
│   │       ├── devices/
│   │       │   └── route.ts          # GET /api/devices
│   │       ├── device/
│   │       │   └── [id]/
│   │       │       └── route.ts      # GET /api/device/:id
│   │       ├── health/
│   │       │   └── route.ts          # Proxy to health API
│   │       └── command/
│   │           └── route.ts          # POST /api/command
│   ├── components/                   # React components
│   │   ├── DeviceCard.tsx           # Device status card
│   │   ├── RoomCard.tsx             # Room overview card
│   │   ├── AlarmPanel.tsx           # Alarm display
│   │   ├── MetricChart.tsx          # Real-time charts
│   │   ├── ControlPanel.tsx         # Device controls
│   │   └── WebSocketClient.tsx      # WebSocket connection
│   ├── lib/                          # Utilities
│   │   ├── websocket.ts             # WebSocket client
│   │   ├── api.ts                   # API client functions
│   │   └── types.ts                 # TypeScript types
│   ├── public/                       # Static assets
│   ├── styles/
│   │   └── globals.css              # Global styles
│   ├── next.config.js               # Next.js config
│   ├── tsconfig.json                # TypeScript config
│   ├── tailwind.config.js           # Tailwind CSS config
│   └── package.json                 # Dependencies
│
└── src/                              # EDGE Gateway Backend
    └── ... (existing backend code)
```

---

## Key Features

### 1. Real-Time Data
- WebSocket connection to EDGE Gateway (port 8000)
- Automatic reconnection
- Live device data updates
- Real-time alarms and warnings

### 2. Device Management
- View all devices
- Device status (online/offline/error)
- Historical data charts
- Device-specific metrics

### 3. Room Overview
- Group devices by location/room
- Aggregated metrics per room
- Room-level alarms
- Temperature/humidity averages

### 4. Control Interface
- Send commands to devices
- Write register values
- Command queue status
- Success/failure feedback

### 5. Health Monitoring
- System health status
- Component health checks
- Performance metrics
- Error statistics

---

## API Integration

### Backend API Endpoints (EDGE Gateway)

```
Health API (Port 8090):
├── GET  /health                    # Overall health
├── GET  /health/:component         # Component health
├── GET  /metrics                   # System metrics
└── GET  /stats                     # Service stats

WebSocket (Port 8000):
└── ws://localhost:8000             # Real-time data stream
    Messages:
    ├── device_data                 # Device readings
    ├── alarm                       # Critical alarms
    ├── warning                     # Warnings
    └── system_status               # System events
```

### Frontend API Routes (Next.js)

```
Dashboard API (Port 3000):
├── GET  /api/devices               # List all devices
├── GET  /api/device/:id            # Device details
├── POST /api/command               # Send command
├── GET  /api/health                # Proxy health check
└── GET  /api/rooms                 # Room aggregation
```

---

## Component Examples

### 1. Main Dashboard Page

```typescript
// app/page.tsx
import { DeviceCard } from '@/components/DeviceCard';
import { WebSocketClient } from '@/components/WebSocketClient';
import { AlarmPanel } from '@/components/AlarmPanel';

export default function Dashboard() {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">EDGE Gateway Dashboard</h1>

      {/* WebSocket connection */}
      <WebSocketClient url="ws://localhost:8000" />

      {/* Alarms */}
      <AlarmPanel />

      {/* Devices Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Device cards will be rendered here */}
      </div>
    </div>
  );
}
```

### 2. WebSocket Client Component

```typescript
// components/WebSocketClient.tsx
'use client';

import { useEffect, useState } from 'react';
import { useWebSocket } from '@/lib/websocket';

export function WebSocketClient({ url }: { url: string }) {
  const { data, isConnected, error } = useWebSocket(url);

  useEffect(() => {
    if (data?.type === 'device_data') {
      // Update device data in state/context
      console.log('Device data:', data);
    } else if (data?.type === 'alarm') {
      // Show alarm notification
      console.log('Alarm:', data);
    }
  }, [data]);

  return (
    <div className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`}>
      {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
      {error && <span className="error">{error}</span>}
    </div>
  );
}
```

### 3. Device Card Component

```typescript
// components/DeviceCard.tsx
'use client';

import { Device } from '@/lib/types';
import { format } from 'date-fns';

interface DeviceCardProps {
  device: Device;
  data?: DeviceData;
}

export function DeviceCard({ device, data }: DeviceCardProps) {
  const statusColor = {
    online: 'green',
    offline: 'gray',
    error: 'red',
  }[data?.status || 'offline'];

  return (
    <div className="card p-4 border rounded-lg shadow">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-semibold">{device.name}</h3>
        <span className={`status-badge bg-${statusColor}-500 text-white px-2 py-1 rounded`}>
          {data?.status || 'offline'}
        </span>
      </div>

      <div className="text-sm text-gray-600">
        <p>Type: {device.device_type}</p>
        <p>Location: {device.location}</p>
        {device.room && <p>Room: {device.room}</p>}
      </div>

      {data && (
        <div className="mt-4 grid grid-cols-2 gap-2">
          {Object.entries(data.data).map(([key, value]) => (
            <div key={key} className="metric">
              <span className="text-xs text-gray-500">{key}</span>
              <p className="font-medium">{value}</p>
            </div>
          ))}
        </div>
      )}

      {data?.timestamp && (
        <p className="text-xs text-gray-400 mt-2">
          Updated: {format(new Date(data.timestamp), 'HH:mm:ss')}
        </p>
      )}
    </div>
  );
}
```

### 4. Control Panel Component

```typescript
// components/ControlPanel.tsx
'use client';

import { useState } from 'react';

interface ControlPanelProps {
  deviceId: number;
  slaveId: number;
}

export function ControlPanel({ deviceId, slaveId }: ControlPanelProps) {
  const [register, setRegister] = useState('');
  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId,
          register: parseInt(register),
          value: parseInt(value),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setResult(`✅ Command enqueued (ID: ${data.commandId})`);
        setRegister('');
        setValue('');
      } else {
        setResult(`❌ Error: ${data.error}`);
      }
    } catch (error) {
      setResult(`❌ Failed to send command: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="control-panel p-4 border rounded-lg">
      <h3 className="font-semibold mb-4">Device Control</h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">
            Register Address
          </label>
          <input
            type="number"
            value={register}
            onChange={(e) => setRegister(e.target.value)}
            className="w-full px-3 py-2 border rounded"
            placeholder="e.g., 0x0020"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Value
          </label>
          <input
            type="number"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="w-full px-3 py-2 border rounded"
            placeholder="e.g., 100"
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {loading ? 'Sending...' : 'Send Command'}
        </button>

        {result && (
          <div className={`p-3 rounded ${result.startsWith('✅') ? 'bg-green-100' : 'bg-red-100'}`}>
            {result}
          </div>
        )}
      </form>
    </div>
  );
}
```

---

## WebSocket Hook

```typescript
// lib/websocket.ts
import { useEffect, useState, useCallback } from 'react';

interface WebSocketMessage {
  type: string;
  timestamp: string;
  data: unknown;
}

export function useWebSocket(url: string) {
  const [data, setData] = useState<WebSocketMessage | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ws, setWs] = useState<WebSocket | null>(null);

  const connect = useCallback(() => {
    try {
      const websocket = new WebSocket(url);

      websocket.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        setError(null);
      };

      websocket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          setData(message);
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err);
        }
      };

      websocket.onerror = (event) => {
        console.error('WebSocket error:', event);
        setError('Connection error');
      };

      websocket.onclose = () => {
        console.log('WebSocket disconnected');
        setIsConnected(false);

        // Reconnect after 5 seconds
        setTimeout(() => {
          connect();
        }, 5000);
      };

      setWs(websocket);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection failed');
    }
  }, [url]);

  useEffect(() => {
    connect();

    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, [connect, ws]);

  return { data, isConnected, error };
}
```

---

## API Route Examples

### 1. Get All Devices

```typescript
// app/api/devices/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Read from backend API or database
    // For now, return mock data
    const devices = [
      {
        device_id: 1,
        device_type: 'KUB-1063',
        name: 'Climate Controller #1',
        enabled: true,
        location: 'North Farm',
        room: 'Barn 1',
      },
    ];

    return NextResponse.json({ devices });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch devices' },
      { status: 500 }
    );
  }
}
```

### 2. Send Command

```typescript
// app/api/command/route.ts
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { deviceId, register, value } = await request.json();

    // Send command to EDGE backend
    // This would call the EDGEService.enqueueCommand method

    // For now, return success
    const commandId = Date.now(); // Mock ID

    return NextResponse.json({
      success: true,
      commandId,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to send command' },
      { status: 500 }
    );
  }
}
```

---

## Integration with EDGE Backend

### Option 1: HTTP API Bridge

Create API routes in Next.js that call EDGE Gateway backend:

```typescript
// Proxy to Health API
export async function GET() {
  const response = await fetch('http://localhost:8090/health');
  const data = await response.json();
  return NextResponse.json(data);
}
```

### Option 2: Direct Database Access

```typescript
import Database from 'better-sqlite3';

const db = new Database('../storage/edge_data.db', { readonly: true });

export async function GET() {
  const devices = db.prepare(`
    SELECT * FROM device_data
    ORDER BY timestamp DESC
    LIMIT 100
  `).all();

  return NextResponse.json({ devices });
}
```

### Option 3: Shared API Service

Export API from EDGE backend and import in Next.js:

```typescript
// In EDGE backend, create HTTP API
import { EDGEService } from '../src/core/edge-service.js';

const edgeService = getGlobalEDGEService();

export const getDevices = () => {
  return edgeService.registry.getAllDevices();
};

// In Next.js, import and use
import { getDevices } from '../../src/api/edge-api';
```

---

## Deployment

### Development

```bash
# Terminal 1 - EDGE Gateway
cd js_new
npm start

# Terminal 2 - Dashboard
cd js_new/dashboard
npm run dev
```

### Production

```bash
# Build dashboard
cd js_new/dashboard
npm run build
npm start

# Or use PM2 for both
pm2 start ecosystem.config.js
```

### PM2 Configuration

```javascript
// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'edge-gateway',
      script: 'dist/index.js',
      cwd: './js_new',
    },
    {
      name: 'dashboard',
      script: 'node_modules/next/dist/bin/next',
      args: 'start',
      cwd: './js_new/dashboard',
    },
  ],
};
```

---

## Environment Variables

### Dashboard (.env.local)

```env
# Backend URLs
NEXT_PUBLIC_WEBSOCKET_URL=ws://localhost:8000
NEXT_PUBLIC_HEALTH_API_URL=http://localhost:8090
NEXT_PUBLIC_GATEWAY_API_URL=http://localhost:3001

# Database (if direct access)
DATABASE_PATH=../storage/edge_data.db
```

---

## Features Comparison

| Feature | Python/Streamlit | React/Next.js |
|---------|-----------------|---------------|
| Real-time updates | ✅ Auto-refresh | ✅ WebSocket |
| Device overview | ✅ | ✅ |
| Room grouping | ✅ | ✅ |
| Charts | ✅ Altair | ✅ Recharts |
| Device control | ✅ | ✅ |
| User auth | ✅ | ✅ (Next-Auth) |
| QR codes | ✅ | ✅ |
| Mobile responsive | ⚠️ Limited | ✅ Tailwind CSS |
| Performance | ⚠️ Server-side | ✅ Client-side |
| SEO | ❌ | ✅ Next.js |

---

## Next Steps

1. **Initialize Next.js Project**
   ```bash
   cd js_new/dashboard
   npx create-next-app@latest . --typescript --tailwind --app
   ```

2. **Install Dependencies**
   ```bash
   npm install recharts swr date-fns lucide-react
   ```

3. **Create Basic Components**
   - Device cards
   - Room cards
   - Alarm panel
   - Control interface

4. **Implement WebSocket Client**
   - Real-time data updates
   - Reconnection logic

5. **Add API Routes**
   - Device listing
   - Command submission
   - Health proxy

6. **Test Integration**
   - Start EDGE backend
   - Start dashboard
   - Verify data flow

---

## Resources

- **Next.js Docs:** https://nextjs.org/docs
- **Recharts:** https://recharts.org/
- **SWR:** https://swr.vercel.app/
- **Tailwind CSS:** https://tailwindcss.com/

---

**Status:** Architecture complete, ready for implementation
**Estimated Time:** 2-3 days for full dashboard
**Priority:** High (completes user interface)
