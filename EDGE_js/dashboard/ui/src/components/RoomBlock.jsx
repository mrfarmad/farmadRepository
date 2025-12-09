import Tabs from './Tabs';
import DevicesTab from './DevicesTab';

export default function RoomBlock({ room }) {
  return (
    <div id={room.isUnassigned ? 'room-unassigned' : `room-${room.id}`} className="card space-y-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-lg font-semibold">{room.name}</div>
          <div className="text-xs text-slate-400">{room.description || 'Сводка по помещению'}</div>
        </div>
        <span className="pill-success">{room.status || 'Норма'}</span>
      </div>
      <Tabs
        defaultValue="devices"
        tabs={[
          { label: 'Обзор', value: 'overview', content: <RoomOverview room={room} /> },
          { label: 'Устройства', value: 'devices', content: <DevicesTab devices={room.devices} /> },
          { label: 'Настройки', value: 'settings', content: <RoomSettings /> },
        ]}
      />
    </div>
  );
}

function RoomOverview({ room }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-slate-300">
      <div className="card">
        <div className="text-xs text-slate-400">Устройств</div>
        <div className="text-xl font-semibold">{room.devices?.length ?? 0}</div>
      </div>
      <div className="card">
        <div className="text-xs text-slate-400">Активные аварии</div>
        <div className="text-xl font-semibold">{room.activeAlarms ?? 0}</div>
      </div>
    </div>
  );
}

function RoomSettings() {
  return <div className="text-sm text-slate-400">Настройки помещения доступны позже.</div>;
}
