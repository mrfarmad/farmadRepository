import { useCallback, useEffect, useMemo, useState } from 'react';
import MainLayout from './layout/MainLayout';
import Sidebar from './layout/Sidebar';
import SummaryCardsRow from './components/SummaryCardsRow';
import RoomsSection from './components/RoomsSection';
import { getRooms, getSummary } from './services/api';
import { connectWebSocket } from './services/websocket';

const DEFAULT_SUMMARY = {
  unassignedDevices: 0,
  offlineDevices: 0,
  activeAlarms: 0,
  lastUpdate: null,
};

export default function App() {
  const [summary, setSummary] = useState(DEFAULT_SUMMARY);
  const [rooms, setRooms] = useState([]);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [intervalMinutes, setIntervalMinutes] = useState(1);
  const [displayMode, setDisplayMode] = useState('all');
  const [lastFetched, setLastFetched] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('connecting');

  const refreshData = useCallback(async () => {
    const [summaryData, roomsData] = await Promise.all([getSummary(), getRooms()]);
    setSummary(summaryData);
    setRooms(roomsData);
    setLastFetched(new Date().toISOString());
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  useEffect(() => {
    if (!autoRefresh) return undefined;
    const id = setInterval(() => {
      refreshData();
    }, intervalMinutes * 60 * 1000);
    return () => clearInterval(id);
  }, [autoRefresh, intervalMinutes, refreshData]);

  useEffect(() => {
    const socket = connectWebSocket({
      onOpen: () => setConnectionStatus('connected'),
      onClose: () => setConnectionStatus('disconnected'),
      onError: () => setConnectionStatus('error'),
      onMessage: (payload) => {
        if (payload?.summary) setSummary((prev) => ({ ...prev, ...payload.summary }));
        if (payload?.rooms) setRooms(payload.rooms);
        if (payload?.timestamp) setLastFetched(payload.timestamp);
      },
    });
    return () => socket?.close();
  }, []);

  const filteredRooms = useMemo(() => {
    if (displayMode === 'none') {
      return rooms.filter((room) => room.isUnassigned || room.name === 'Без помещения');
    }
    return rooms;
  }, [displayMode, rooms]);

  return (
    <MainLayout
      sidebar={
        <Sidebar
          autoRefresh={autoRefresh}
          intervalMinutes={intervalMinutes}
          displayMode={displayMode}
          onAutoRefreshChange={setAutoRefresh}
          onIntervalChange={setIntervalMinutes}
          onDisplayModeChange={setDisplayMode}
          onRefreshNow={refreshData}
          onApplySettings={refreshData}
          onScrollToUnassigned={() => document.getElementById('room-unassigned')?.scrollIntoView({ behavior: 'smooth' })}
          connectionStatus={connectionStatus}
        />
      }
    >
      <div className="space-y-8">
        <SummaryCardsRow summary={summary} lastFetched={lastFetched} />
        <RoomsSection rooms={filteredRooms} />
      </div>
    </MainLayout>
  );
}
