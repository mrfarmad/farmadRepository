# Dashboard Migration Audit & Comparison

## Executive Summary

**Python Dashboard (Streamlit):** 2,163 lines, 6 main tabs, comprehensive operator interface
**Next.js Dashboard (React):** ~1,500 lines, real-time monitoring focused

**Migration Status:** 40% Feature Complete - Core monitoring done, advanced features need implementation

---

## Feature Comparison Matrix

| Feature | Python (Streamlit) | Next.js (React) | Status | Priority |
|---------|-------------------|-----------------|--------|----------|
| **Core Monitoring** |
| Real-time device display | ✅ Polling | ✅ WebSocket | ✅ Better | High |
| Device status cards | ✅ | ✅ | ✅ Complete | High |
| Alarm/warning display | ✅ | ✅ | ✅ Complete | High |
| System health indicators | ✅ | ✅ | ✅ Complete | High |
| **Data Visualization** |
| Historical charts | ✅ Altair charts | ❌ Missing | 🔴 Critical | High |
| Metric selection | ✅ Per-device | ❌ Missing | 🔴 Critical | High |
| Time range selector | ✅ 1-72 hours | ❌ Missing | 🔴 Critical | High |
| KPI cards | ✅ 4 KPIs | ⚠️ Partial | 🟡 Needs work | Medium |
| **Room Management** |
| Room grouping | ✅ Full support | ❌ Missing | 🔴 Critical | High |
| Room navigation | ✅ Sidebar + anchors | ❌ Missing | 🔴 Critical | Medium |
| Room snapshots | ✅ Cached | ❌ Missing | 🔴 Critical | Medium |
| **Device Control** |
| Alarm reset button | ✅ With auth | ⚠️ Basic | 🟡 Needs work | High |
| Command interface | ✅ Via button | ✅ Control panel | ✅ Complete | High |
| Command history | ✅ | ❌ Missing | 🟡 Todo | Low |
| **User Management** |
| Authentication | ✅ PIN-based | ❌ Missing | 🔴 Critical | High |
| User roles | ✅ 3 roles | ❌ Missing | 🔴 Critical | High |
| User CRUD | ✅ Full | ❌ Missing | 🔴 Critical | Medium |
| Telegram integration | ✅ QR codes | ❌ Missing | 🟡 Todo | Low |
| **Configuration** |
| Device config editor | ✅ Data editor | ❌ Missing | 🟡 Todo | Low |
| User preferences | ✅ Persistent | ❌ Missing | 🔴 Critical | Medium |
| Auto-refresh settings | ✅ 1-10 min | ⚠️ Fixed 5s | 🟡 Needs work | Low |
| **Advanced Features** |
| Relay assignments | ✅ Detailed | ❌ Missing | 🟡 Todo | Low |
| Emergency relay | ✅ Highlighted | ❌ Missing | 🟡 Todo | Medium |
| Alarm catalog | ✅ Bit-mask decode | ❌ Missing | 🟡 Todo | Low |
| Statistics | ✅ Uptime/success | ❌ Missing | 🟡 Todo | Low |
| **UI/UX** |
| Dark theme | ✅ | ✅ | ✅ Complete | High |
| Responsive design | ⚠️ Limited | ✅ Full | ✅ Better | High |
| Mobile support | ⚠️ Basic | ✅ Good | ✅ Better | Medium |
| Custom styling | ✅ CSS vars | ✅ Tailwind | ✅ Complete | High |

**Legend:**
- ✅ Fully implemented
- ⚠️ Partially implemented
- ❌ Not implemented
- 🔴 Critical gap
- 🟡 Important gap
- 🟢 Nice to have

---

## Detailed Feature Analysis

### 1. Core Monitoring (95% Complete)

#### ✅ What's Working Well

**DeviceCard Component:**
```typescript
✅ Device ID, type, name display
✅ Real-time register values (WebSocket)
✅ Color-coded status (red/yellow/green)
✅ Alarm/warning messages
✅ Last update timestamp
✅ Auto-formatted values (temp, humidity, CO2)
✅ Integrated control panel
```

**AlarmPanel Component:**
```typescript
✅ Critical alarm display (red background)
✅ Warning display (yellow background)
✅ Device identification
✅ Timestamp with relative formatting
✅ Collapsible UI
✅ Count badges
```

**SystemStatus Component:**
```typescript
✅ WebSocket connection indicator
✅ System health status
✅ Active device count
✅ CPU usage display (via SWR polling)
```

#### 🔴 Critical Gaps

**Missing Features:**
1. **Historical Charts** - No time-series visualization
2. **Room Grouping** - All devices shown in flat grid
3. **Metric Selection** - Can't choose which metrics to display
4. **Authentication** - No user login system
5. **User Preferences** - No persistent settings

### 2. Data Visualization (10% Complete)

#### Python Implementation
```python
# Altair chart with interactive features
alt.Chart(df).mark_line().encode(
    x='timestamp:T',
    y=f'{metric_key}:Q',
    tooltip=['timestamp', metric_key]
).interactive()

# Time range selector
hours_back = st.slider("Часов назад", 1, 72, 24)

# Metric selector per device
selected_metrics = st.multiselect(
    "Метрики",
    options=available_metrics,
    default=user_prefs.get(device_id, [])
)
```

#### Next.js - What We Need
```typescript
// Missing: Historical data charts
// Need: Recharts implementation with time-series data
// Need: Time range selector (1h, 6h, 24h, 7d)
// Need: Metric selection UI (checkboxes per device)
// Need: Historical data API endpoint
```

**Required Components:**
1. `MetricChart.tsx` - Time-series line chart
2. `TimeRangeSelector.tsx` - Quick range buttons + custom picker
3. `MetricSelector.tsx` - Checkbox group per device
4. `/api/history/[deviceId]` - Historical data endpoint

### 3. Room Management (0% Complete)

#### Python Implementation
```python
# Room snapshots with caching
@st.cache_data(ttl=2)
def get_room_data():
    return build_room_snapshots(registry)

# Room navigation sidebar
st.sidebar.radio("Комната", room_list)

# Room panels with status
for room in rooms:
    st.markdown(f"### {room.name} ({room.location})")
    status_badge = "Норма" if no_alarms else f"Тревог: {alarm_count}"
    # Device grid per room
```

#### Next.js - What We Need
```typescript
// Missing: Room grouping completely
// Need: Room-based navigation
// Need: Room status aggregation
// Need: Collapsible room panels

// Proposed structure:
interface Room {
  name: string;
  location: string;
  devices: DeviceData[];
  alarmCount: number;
  offlineCount: number;
  lastUpdate: string;
}

// Components needed:
<RoomPanel room={room}>
  <RoomHeader />
  <RoomMetrics />
  <DeviceGrid devices={room.devices} />
</RoomPanel>
```

### 4. User Management & Authentication (0% Complete)

#### Python Implementation
```python
# PIN-based authentication
def ensure_user_session():
    if 'user' not in st.session_state:
        pin = st.text_input("PIN", type="password")
        user = authenticate_user(pin)
        st.session_state.user = user

# Role-based access
if user.role == 'admin':
    render_configuration_tab()
    render_user_management_panel()

# User CRUD operations
users = st.data_editor(user_df, num_rows="dynamic")
save_users(users)
```

#### Next.js - What We Need
```typescript
// Missing: Authentication completely
// Need: Login page/modal
// Need: Session management (JWT/cookies)
// Need: Role-based route protection
// Need: User management UI

// Proposed implementation:
// 1. NextAuth.js or custom JWT
// 2. Middleware for protected routes
// 3. Context provider for user state
// 4. Admin panel for user CRUD
```

**Authentication Flow:**
```typescript
// app/login/page.tsx
<LoginForm onSubmit={handlePinAuth} />

// middleware.ts
export function middleware(request: NextRequest) {
  const token = request.cookies.get('auth-token');
  if (!token) return NextResponse.redirect('/login');
}

// context/AuthContext.tsx
const AuthContext = createContext<AuthState>();

// components/ProtectedRoute.tsx
<ProtectedRoute requiredRole="admin">
  <AdminPanel />
</ProtectedRoute>
```

### 5. User Preferences System (0% Complete)

#### Python Implementation
```python
# Persistent preferences per user
user_prefs = {
    "rooms": {
        "Room 1": {
            "device_1": ["temp", "humidity", "co2"],
            "device_2": ["speed", "state"]
        }
    },
    "auto_refresh": {
        "enabled": True,
        "interval": 120
    }
}

# Save to database
persist_user_preferences(user_id, user_prefs)

# Load on startup
prefs = load_user_preferences(user_id)
```

#### Next.js - What We Need
```typescript
// Missing: Preferences system
// Need: Preferences API endpoints
// Need: Local storage + DB sync
// Need: Preferences UI

// Proposed structure:
interface UserPreferences {
  theme: 'light' | 'dark';
  refreshInterval: number;
  deviceMetrics: Record<number, string[]>;
  roomOrder: string[];
  chartDefaults: {
    timeRange: string;
    showGrid: boolean;
  };
}

// API endpoints:
PUT /api/preferences - Update preferences
GET /api/preferences - Get user preferences

// Components:
<PreferencesModal>
  <RefreshSettings />
  <MetricDefaults />
  <DisplayOptions />
</PreferencesModal>
```

### 6. Advanced Features Analysis

#### Relay Assignments (Python Only)
```python
# Relay card rendering
for relay in device.relays:
    st.markdown(f"""
    <div class="relay-card">
        <strong>Канал {relay.channel}</strong>
        <span class="relay-state {relay.state}">{relay.state_text}</span>
        <small>Адрес: 0x{relay.register:04X}</small>
    </div>
    """)

# Emergency relay highlighting
if relay.is_emergency:
    css_class = "relay-emergency"
```

**Migration to Next.js:**
```typescript
// components/RelayCard.tsx
interface Relay {
  channel: number;
  register: number;
  state: 'on' | 'off' | 'unknown';
  category: string;
  isEmergency: boolean;
}

<RelayCard relay={relay}>
  <RelayHeader channel={relay.channel} />
  <RelayState state={relay.state} isEmergency={relay.isEmergency} />
  <RelayAddress register={relay.register} />
</RelayCard>
```

#### Alarm Catalog (Python Only)
```python
# Bit-mask alarm decoding
def _format_alarm_recommendations(device_type: str, alarm_bits: int):
    catalog = get_alarm_catalog(device_type)
    recommendations = []

    for bit in range(16):
        if alarm_bits & (1 << bit):
            recommendations.append(catalog.get(bit, "Неизвестная ошибка"))

    return recommendations[:3]  # Show max 3
```

**Migration to Next.js:**
```typescript
// lib/alarmCatalog.ts
const ALARM_CATALOGS: Record<string, Record<number, string>> = {
  'KUB-1063': {
    0: 'Превышение температуры',
    1: 'Низкая влажность',
    2: 'Авария вентиляции',
    // ... more bits
  }
};

function decodeAlarmBits(deviceType: string, bits: number): string[] {
  const catalog = ALARM_CATALOGS[deviceType] || {};
  const recommendations: string[] = [];

  for (let bit = 0; bit < 16; bit++) {
    if (bits & (1 << bit)) {
      recommendations.push(catalog[bit] || 'Unknown alarm');
    }
  }

  return recommendations.slice(0, 3);
}
```

---

## Missing Component Specifications

### 1. HistoricalChart Component

**Purpose:** Display time-series data for selected metrics

**Props:**
```typescript
interface HistoricalChartProps {
  deviceId: number;
  metrics: string[];        // Selected metric keys
  timeRange: string;        // '1h' | '6h' | '24h' | '7d' | 'custom'
  customStart?: Date;
  customEnd?: Date;
}
```

**API Endpoint:**
```typescript
GET /api/history/[deviceId]?metrics=temp,humidity&hours=24

Response: {
  device_id: number;
  data: Array<{
    timestamp: string;
    [metric: string]: number;
  }>;
}
```

**Implementation:**
```typescript
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

export function HistoricalChart({ deviceId, metrics, timeRange }: Props) {
  const { data, error } = useSWR(
    `/api/history/${deviceId}?metrics=${metrics.join(',')}&range=${timeRange}`,
    fetcher,
    { refreshInterval: 30000 }
  );

  return (
    <LineChart data={data} width={800} height={400}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="timestamp" />
      <YAxis />
      <Tooltip />
      <Legend />
      {metrics.map((metric, i) => (
        <Line key={metric} type="monotone" dataKey={metric} stroke={colors[i]} />
      ))}
    </LineChart>
  );
}
```

### 2. RoomPanel Component

**Purpose:** Group devices by room with collapsible UI

**Props:**
```typescript
interface RoomPanelProps {
  room: {
    name: string;
    location: string;
    devices: DeviceData[];
  };
  isExpanded: boolean;
  onToggle: () => void;
}
```

**Implementation:**
```typescript
export function RoomPanel({ room, isExpanded, onToggle }: Props) {
  const alarmCount = room.devices.filter(d => d.alarms?.length > 0).length;
  const offlineCount = room.devices.filter(d => !d.online).length;

  return (
    <div className="card border-l-4 border-indigo-500">
      <div className="flex items-center justify-between cursor-pointer" onClick={onToggle}>
        <div>
          <h3 className="text-xl font-bold">{room.name}</h3>
          <p className="text-sm text-gray-500">{room.location}</p>
        </div>
        <div className="flex items-center space-x-4">
          {alarmCount > 0 && (
            <span className="badge-error">{alarmCount} alarms</span>
          )}
          {offlineCount > 0 && (
            <span className="badge-warning">{offlineCount} offline</span>
          )}
          <ChevronIcon className={isExpanded ? 'rotate-180' : ''} />
        </div>
      </div>

      {isExpanded && (
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {room.devices.map(device => (
            <DeviceCard key={device.device_id} device={device} />
          ))}
        </div>
      )}
    </div>
  );
}
```

### 3. MetricSelector Component

**Purpose:** Allow users to select which metrics to display per device

**Props:**
```typescript
interface MetricSelectorProps {
  deviceId: number;
  availableMetrics: Array<{ key: string; label: string; unit: string }>;
  selectedMetrics: string[];
  onChange: (metrics: string[]) => void;
  maxSelection?: number;  // Default 6
}
```

**Implementation:**
```typescript
export function MetricSelector({ deviceId, availableMetrics, selectedMetrics, onChange, maxSelection = 6 }: Props) {
  const handleToggle = (key: string) => {
    if (selectedMetrics.includes(key)) {
      onChange(selectedMetrics.filter(k => k !== key));
    } else if (selectedMetrics.length < maxSelection) {
      onChange([...selectedMetrics, key]);
    }
  };

  return (
    <div className="space-y-2">
      <p className="text-sm text-gray-500">
        Select up to {maxSelection} metrics ({selectedMetrics.length}/{maxSelection})
      </p>
      <div className="grid grid-cols-2 gap-2">
        {availableMetrics.map(metric => (
          <label key={metric.key} className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={selectedMetrics.includes(metric.key)}
              onChange={() => handleToggle(metric.key)}
              disabled={!selectedMetrics.includes(metric.key) && selectedMetrics.length >= maxSelection}
              className="form-checkbox"
            />
            <span className="text-sm">
              {metric.label} {metric.unit && `(${metric.unit})`}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}
```

### 4. Authentication Components

**LoginPage:**
```typescript
// app/login/page.tsx
export default function LoginPage() {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin }),
    });

    if (res.ok) {
      router.push('/');
    } else {
      setError('Invalid PIN');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="card max-w-md w-full">
        <h2 className="text-2xl font-bold mb-4">EDGE Gateway Login</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">PIN</label>
            <input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="w-full px-3 py-2 border rounded"
              maxLength={6}
              pattern="[0-9]*"
              required
            />
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <button type="submit" className="btn-primary w-full">
            Login
          </button>
        </form>
      </div>
    </div>
  );
}
```

**AuthContext:**
```typescript
// context/AuthContext.tsx
interface User {
  id: number;
  name: string;
  role: 'operator' | 'engineer' | 'admin';
}

const AuthContext = createContext<{
  user: User | null;
  login: (pin: string) => Promise<void>;
  logout: () => void;
} | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Check existing session
    fetch('/api/auth/me')
      .then(res => res.ok ? res.json() : null)
      .then(setUser);
  }, []);

  const login = async (pin: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ pin }),
    });
    if (res.ok) {
      const user = await res.json();
      setUser(user);
    }
  };

  const logout = () => {
    fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
```

---

## Migration Roadmap

### Phase 1: Critical Gaps (High Priority)

**Target:** Make dashboard feature-complete for monitoring

1. **Historical Charts** (Est: 2 days)
   - [ ] Create `HistoricalChart.tsx` component with Recharts
   - [ ] Implement `/api/history/[deviceId]` endpoint
   - [ ] Add time range selector (1h/6h/24h/7d)
   - [ ] Add metric selection UI

2. **Room Management** (Est: 2 days)
   - [ ] Create `RoomPanel.tsx` component
   - [ ] Implement room-based device grouping
   - [ ] Add room status aggregation
   - [ ] Create room navigation sidebar

3. **Authentication System** (Est: 3 days)
   - [ ] Implement PIN-based auth with NextAuth.js
   - [ ] Create login page
   - [ ] Add protected route middleware
   - [ ] Implement role-based access control

4. **User Preferences** (Est: 2 days)
   - [ ] Create preferences API endpoints
   - [ ] Implement preferences storage (DB + localStorage)
   - [ ] Add preferences modal UI
   - [ ] Save metric selections per device

**Total Phase 1:** ~9 days

### Phase 2: Important Features (Medium Priority)

**Target:** Admin and configuration capabilities

5. **KPI Dashboard** (Est: 1 day)
   - [ ] Room alarm count aggregation
   - [ ] Offline device count
   - [ ] Total active alarms
   - [ ] Data freshness indicator

6. **Enhanced Device Control** (Est: 2 days)
   - [ ] Alarm reset with user auth
   - [ ] Command history view
   - [ ] Batch command support

7. **Configuration Editor** (Est: 2 days)
   - [ ] Device settings editor UI
   - [ ] Room assignment editor
   - [ ] Save config to database

8. **User Management UI** (Est: 2 days)
   - [ ] User CRUD interface
   - [ ] Role management
   - [ ] User invitation system

**Total Phase 2:** ~7 days

### Phase 3: Advanced Features (Low Priority)

**Target:** Feature parity with Python

9. **Relay Management** (Est: 1 day)
   - [ ] Relay assignment display
   - [ ] Emergency relay highlighting
   - [ ] Relay state indicators

10. **Alarm Catalog** (Est: 1 day)
    - [ ] Bit-mask alarm decoder
    - [ ] Device-specific catalogs
    - [ ] Recommendation text display

11. **Statistics Dashboard** (Est: 1 day)
    - [ ] Device uptime tracking
    - [ ] Success rate metrics
    - [ ] Historical statistics

12. **Telegram Integration** (Est: 2 days)
    - [ ] QR code generation
    - [ ] Invite code system
    - [ ] Telegram ID storage

**Total Phase 3:** ~5 days

---

## Implementation Priority

### Must Have (Critical for Operations)
1. ✅ Real-time monitoring ← **Done**
2. 🔴 Historical charts ← **Need ASAP**
3. 🔴 Room grouping ← **Need ASAP**
4. 🔴 Authentication ← **Security critical**
5. ✅ Alarm display ← **Done**
6. ✅ Device control ← **Done**

### Should Have (Important for Usability)
7. 🟡 User preferences
8. 🟡 Metric selection
9. 🟡 KPI cards
10. 🟡 Configuration editor

### Nice to Have (Polish)
11. ⚪ Relay assignments
12. ⚪ Alarm catalog
13. ⚪ Statistics
14. ⚪ Telegram integration

---

## Recommended Next Steps

### Immediate (This Week)
```bash
# 1. Implement historical charts
cd dashboard
mkdir components/charts
# Create HistoricalChart.tsx, TimeRangeSelector.tsx

# 2. Add history API endpoint
mkdir app/api/history/[deviceId]
# Create route.ts with historical data query

# 3. Create room grouping
mkdir components/rooms
# Create RoomPanel.tsx, RoomGrid.tsx
```

### Short Term (Next 2 Weeks)
```bash
# 4. Implement authentication
npm install next-auth @prisma/client bcrypt
# Set up NextAuth with PIN provider
# Add middleware for protected routes

# 5. Add preferences system
mkdir app/api/preferences
# Create preferences endpoints
# Add PreferencesModal component
```

### Medium Term (Next Month)
```bash
# 6. User management UI
mkdir app/admin
# Create user CRUD pages
# Add role management

# 7. Configuration editor
mkdir app/config
# Create device config editor
# Add save/load functionality
```

---

## Conclusion

**Current Status:** The Next.js dashboard has strong real-time monitoring capabilities with WebSocket integration (better than Python's polling). However, it lacks several critical features that exist in the Python version:

**Critical Gaps:**
- No historical data visualization
- No room-based organization
- No user authentication
- No persistent preferences

**Strengths Over Python:**
- ✅ True real-time updates (WebSocket vs polling)
- ✅ Better responsive design
- ✅ Faster initial load
- ✅ Better mobile support
- ✅ Modern React architecture

**Recommendation:** Focus on Phase 1 features (Historical Charts, Room Management, Authentication, Preferences) to achieve feature parity for critical operations. The remaining features in Phase 2 and 3 can be added iteratively based on user feedback.

**Estimated Time to Feature Parity:** 3-4 weeks of focused development

---

**Date:** 2026-01-22
**Audit Version:** 1.0
**Python Dashboard Lines:** 2,163
**Next.js Dashboard Lines:** ~1,500
**Feature Coverage:** 40% complete
