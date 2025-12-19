import React from "react";

const BAUD_RATES = [4800, 9600, 19200, 38400, 57600, 115200];
const PARITY = [
  { value: "N", label: "None" },
  { value: "E", label: "Even" },
  { value: "O", label: "Odd" },
];

function num(value, fallback) {
  const v = Number(value);
  return Number.isFinite(v) ? v : fallback;
}

function ControllerSettings({ controller, onChange }) {
  if (!controller) return null;
  const { link } = controller;

  const updateLink = (patch) => {
    onChange({
      link: {
        ...link,
        ...patch,
      },
    });
  };

  const updateName = (name) => {
    onChange({ name });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div className="form-grid">
        <div className="form-field" style={{ gridColumn: "1 / span 2" }}>
          <label className="form-label">Имя контроллера</label>
          <input
            className="form-input"
            value={controller.name}
            onChange={(e) => updateName(e.target.value)}
          />
        </div>

        <div className="form-field">
          <label className="form-label">Код</label>
          <input
            className="form-input"
            value={controller.code}
            disabled
          />
        </div>

        <div className="form-field">
          <label className="form-label">Modbus Unit ID (адрес)</label>
          <input
            className="form-input"
            type="number"
            min={1}
            max={247}
            value={link.unitId}
            onChange={(e) =>
              updateLink({ unitId: num(e.target.value, link.unitId) })
            }
          />
        </div>

        <div className="form-field">
          <label className="form-label">IP / Gateway</label>
          <input
            className="form-input"
            value={link.ip}
            onChange={(e) => updateLink({ ip: e.target.value })}
          />
        </div>

        <div className="form-field">
          <label className="form-label">Порт</label>
          <input
            className="form-input"
            type="number"
            min={1}
            max={65535}
            value={link.port}
            onChange={(e) =>
              updateLink({ port: num(e.target.value, link.port) })
            }
          />
        </div>

        <div className="form-field">
          <label className="form-label">Скорость (baud)</label>
          <select
            className="form-select"
            value={link.baudRate}
            onChange={(e) =>
              updateLink({ baudRate: num(e.target.value, link.baudRate) })
            }
          >
            {BAUD_RATES.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>

        <div className="form-field">
          <label className="form-label">Биты данных</label>
          <input
            className="form-input"
            type="number"
            min={5}
            max={8}
            value={link.dataBits}
            onChange={(e) =>
              updateLink({ dataBits: num(e.target.value, link.dataBits) })
            }
          />
        </div>

        <div className="form-field">
          <label className="form-label">Чётность (parity)</label>
          <select
            className="form-select"
            value={link.parity}
            onChange={(e) => updateLink({ parity: e.target.value })}
          >
            {PARITY.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>

        <div className="form-field">
          <label className="form-label">Стоп-биты</label>
          <input
            className="form-input"
            type="number"
            step="1"
            min={1}
            max={2}
            value={link.stopBits}
            onChange={(e) =>
              updateLink({ stopBits: num(e.target.value, link.stopBits) })
            }
          />
        </div>

        <div className="form-field">
          <label className="form-label">Период опроса, мс</label>
          <input
            className="form-input"
            type="number"
            min={500}
            value={link.pollMs}
            onChange={(e) =>
              updateLink({ pollMs: num(e.target.value, link.pollMs) })
            }
          />
        </div>
      </div>

      <div className="settings-footer">
        <span className="badge">
          RS-485 / Modbus · базовая конфигурация
        </span>
        <button className="btn btn-primary">
          Сохранить (заглушка)
        </button>
      </div>
    </div>
  );
}

export default ControllerSettings;
