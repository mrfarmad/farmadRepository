import DeviceCard from './DeviceCard';

export default function DevicesTab({ devices }) {
  if (!devices?.length) {
    return <div className="text-sm text-slate-400">Нет устройств в этом помещении.</div>;
  }
  return (
    <div className="space-y-4">
      {devices.map((device) => (
        <DeviceCard key={device.id} device={device} />
      ))}
    </div>
  );
}
