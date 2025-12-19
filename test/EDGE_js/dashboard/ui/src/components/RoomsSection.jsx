import RoomBlock from './RoomBlock';

export default function RoomsSection({ rooms }) {
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="section-title">Помещения</h2>
      </div>
      <div className="space-y-4">
        {rooms.map((room) => (
          <RoomBlock key={room.id || room.name} room={room} />
        ))}
        {rooms.length === 0 && <div className="text-sm text-slate-400">Нет данных о помещениях.</div>}
      </div>
    </section>
  );
}
