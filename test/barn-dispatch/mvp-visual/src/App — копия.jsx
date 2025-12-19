import React, { useEffect, useState } from "react";

// контроллеры по проекту
const CONTROLLERS = [
  { num: 1, code: "ctrl-1", title: "ДМБ" },
  { num: 2, code: "ctrl-2", title: "Профилакторий" },
  { num: 3, code: "ctrl-3", title: "Телятник" },
  { num: 4, code: "ctrl-4", title: "Корпус 8 рядов" },
  { num: 5, code: "ctrl-5", title: "РСО" },
  { num: 6, code: "ctrl-6", title: "Нетелиный корпус" },
];

// шаги обновления
const DISPLAY_UPDATE_INTERVAL_MS = 5000;   // обычные отображения ~5 c
const HISTORY_SAMPLE_INTERVAL_MS = 30000; // точки для графиков ~30 c

// глубина истории (для 30 с можно увеличить до нескольких часов)
const HISTORY_LEN = 300; // ~2,5 часа при шаге 30 c

// диапазоны времени для графиков
const METRIC_TIME_RANGES = [
  { id: "1m", label: "1 мин", ms: 1 * 60 * 1000 },
  { id: "30m", label: "30 мин", ms: 30 * 60 * 1000 },
  { id: "1h", label: "1 час", ms: 1 * 60 * 60 * 1000 },
  { id: "6h", label: "6 часов", ms: 6 * 60 * 60 * 1000 },
  { id: "12h", label: "12 часов", ms: 12 * 60 * 60 * 1000 },
  { id: "24h", label: "24 часа", ms: 24 * 60 * 60 * 1000 },
];

// утилиты
function randomBetween(min, max) {
  return +(Math.random() * (max - min) + min).toFixed(1);
}

function randomStatus(probOk = 0.95) {
  return Math.random() < probOk ? "OK" : Math.random() < 0.5 ? "WARN" : "ALARM";
}

function pushHistory(arr, v) {
  const next = [...(arr || []), v];
  return next.length > HISTORY_LEN ? next.slice(next.length - HISTORY_LEN) : next;
}

// генерация mock-ПЧ с полными параметрами
function generateVfdMock(type) {
  const hasAlarm = Math.random() < 0.05;
  const alarmCodes = ["U0-54", "U0-55", "U0-56", "U0-60", "U0-61"];
  const alarmCode = hasAlarm
    ? alarmCodes[Math.floor(Math.random() * alarmCodes.length)]
    : null;
  const alarmText = hasAlarm ? "Авария частотника (" + alarmCode + ")" : null;

  if (type === "GF") {
    const setFreq = randomBetween(20, 50);
    const runFreq = setFreq + randomBetween(-2, 2);
    const outCurrent = randomBetween(2, 12);
    const outVoltage = randomBetween(340, 400);
    const outPower = randomBetween(0.5, 7.5);
    const speedRpm = Math.round(runFreq * 30);

    const faultGroup = () => ({
      freq: randomBetween(10, 50),
      current: randomBetween(1, 20),
      dcBus: randomBetween(300, 650),
      heatsinkTemp: randomBetween(30, 90),
      timePowerMin: Math.round(randomBetween(0, 600)),
      timeRunHours: randomBetween(0, 100),
    });

    const first = faultGroup();
    const second = faultGroup();
    const third = faultGroup();

    return {
      type: "GF",

      freq: runFreq,
      current: outCurrent,

      runState: Math.random() < 0.7 ? "RUN" : "STOP",
      faultCode: hasAlarm ? "E-" + alarmCode : null,
      setFreq,
      runFreq,
      speedRpm,
      outVoltage,
      outCurrent,
      outPower,
      ai1Before: randomBetween(0, 10),
      ai1: randomBetween(0, 10),
      motorTemp: randomBetween(20, 80),
      igbtTemp: randomBetween(20, 90),
      fbSpeed: randomBetween(0, 50),

      alarmCode,
      alarmText,

      thirdFault: third,
      secondFault: second,
      firstFault: first,
    };
  }

  const setFreq1001 = randomBetween(20, 50);
  const outVolt1003 = randomBetween(340, 400);
  const outCurrent1004 = randomBetween(2, 12);
  const outPower1005 = randomBetween(0.5, 7.5);
  const runSpeed1007 = Math.round(setFreq1001 * 30);

  return {
    type: "ESQ",

    freq: setFreq1001,
    current: outCurrent1004,

    esqSetFreq1001: setFreq1001,
    esqOutVolt1003: outVolt1003,
    esqOutCurrent1004: outCurrent1004,
    esqOutPower1005: outPower1005,
    esqRunSpeed1007: runSpeed1007,

    alarmCode,
    alarmText,
  };
}
// оборудование по корпусам
function getChannelsFor(num) {
  switch (num) {
    case 1: // ДМБ
      return [
        {
          id: "af",
          name: "Разгонные вентиляторы AF-130P Moo-Moo (6 шт)",
          model: "AF-130P Moo-Moo",
          count: 6,
          hasVfd: false,
        },
        {
          id: "agr_reg",
          name: "Регулируемые вытяжные AGR-1200 (2 шт, ПЧ ESQ-230-4T-4K)",
          model: "AGR-1200",
          count: 2,
          hasVfd: true,
          vfdType: "ESQ",
        },
        {
          id: "agr_unreg",
          name: "Нерегулируемые вытяжные AGR-1200 (3 шт)",
          model: "AGR-1200",
          count: 3,
          hasVfd: false,
        },
      ];

    case 2: // Профилакторий
      return [
        {
          id: "gf1500_p",
          name: "Потолочные вентиляторы GF-1500-73 (3 шт)",
          model: "GF-1500-73",
          count: 3,
          hasVfd: true,
          vfdType: "GF",
        },
      ];

    case 3: // Телятник
      return [
        {
          id: "gf1500_t",
          name: "Потолочные вентиляторы GF-1500-73 (5 шт)",
          model: "GF-1500-73",
          count: 5,
          hasVfd: true,
          vfdType: "GF",
        },
        {
          id: "pump_t",
          name: "Насос охлаждения (1 шт)",
          model: "Насос охлаждения",
          count: 1,
          hasVfd: false,
        },
      ];

    case 4: // 8 рядов
      return [
        {
          id: "gf1100_8r",
          name: "GF-1100-52 (8 шт)",
          model: "GF-1100-52",
          count: 8,
          hasVfd: true,
          vfdType: "GF",
        },
        {
          id: "gf1500_52_8r",
          name: "GF-1500-73 модель 5.2 (8 шт)",
          model: "GF-1500-73",
          count: 8,
          hasVfd: true,
          vfdType: "GF",
        },
        {
          id: "gf1500_73_8r",
          name: "GF-1500-73 модель 7.3 (6 шт)",
          model: "GF-1500-73",
          count: 6,
          hasVfd: true,
          vfdType: "GF",
        },
        {
          id: "pump_l_8r",
          name: "Насос охлаждения (левая половина)",
          model: "Насос охлаждения",
          count: 1,
          hasVfd: false,
        },
        {
          id: "pump_r_8r",
          name: "Насос охлаждения (правая половина)",
          model: "Насос охлаждения",
          count: 1,
          hasVfd: false,
        },
      ];

    case 5: // РСО
      return [
        {
          id: "gf1100_r1",
          name: "GF-1100-52 группа 1 (4 шт)",
          model: "GF-1100-52",
          count: 4,
          hasVfd: true,
          vfdType: "GF",
        },
        {
          id: "gf1100_r2",
          name: "GF-1100-52 группа 2 (4 шт)",
          model: "GF-1100-52",
          count: 4,
          hasVfd: true,
          vfdType: "GF",
        },
        {
          id: "pump_r",
          name: "Насос охлаждения (1 шт)",
          model: "Насос охлаждения",
          count: 1,
          hasVfd: false,
        },
      ];

    case 6: // Нетелиный
      return [
        {
          id: "gf1500_n",
          name: "Потолочные вентиляторы GF-1500-73 модель 7.3 (6 шт)",
          model: "GF-1500-73",
          count: 6,
          hasVfd: true,
          vfdType: "GF",
        },
        {
          id: "pump_n",
          name: "Насос охлаждения (1 шт)",
          model: "Насос охлаждения",
          count: 1,
          hasVfd: false,
        },
      ];

    default:
      return [];
  }
}

// генерация контроллера
function generateController(ctrl) {
  const now = new Date().toISOString();
  const t = randomBetween(5, 30);
  const rh = randomBetween(40, 80);
  const nh3 = Math.round(randomBetween(0, 50));
  const setpoint = randomBetween(15, 22);

  const baseChannels = getChannelsFor(ctrl.num).map(ch => {
    const devices = Array.from({ length: ch.count || 1 }, (_, i) => {
      const base = {
        id: `${ch.id}_${i + 1}`,
        name: `${ch.model || ch.name} #${i + 1}`,
        state: Math.random() < 0.7 ? "ON" : "OFF",
      };

      if (ch.hasVfd && ch.vfdType !== "ESQ") {
        return {
          ...base,
          vfd: generateVfdMock(ch.vfdType),
        };
      }

      return base;
    });

    const groupOn = devices.some(d => d.state === "ON");

    return {
      ...ch,
      state: groupOn ? "ON" : "OFF",
      vfd: ch.hasVfd && ch.vfdType === "ESQ" ? generateVfdMock(ch.vfdType) : null,
      devices,
    };
  });

  return {
    code: ctrl.code,
    num: ctrl.num,
    title: ctrl.title,
    sensors: {
      temperature: t,
      humidity: rh,
      nh3,
      setpoint,
    },
    history: {
      temperature: [t],
      humidity: [rh],
      nh3: [nh3],
      times: [now],
    },
    channels: baseChannels,
    comm: randomStatus(),
    lastUpdate: now,
  };
}

function generateInitialState() {
  return CONTROLLERS.map(generateController);
}
// индикатор связи
function StatusDot({ status }) {
  const base = "w-3 h-3 rounded-full inline-block mr-2";
  if (status === "OK") return <span className={`${base} bg-green-500`} />;
  if (status === "WARN") return <span className={`${base} bg-yellow-400`} />;
  return <span className={`${base} bg-red-500`} />;
}

// мини-тренд
function Trend({ data, min, max, large = false }) {
  if (!data || data.length < 2) return null;
  const width = large ? 260 : 80;
  const height = large ? 80 : 24;
  const count = data.length;
  const stepX = count > 1 ? width / (count - 1) : width;

  const clamp = v => Math.min(max, Math.max(min, v));
  const normY = v => {
    const c = clamp(v);
    const t = (c - min) / (max - min || 1);
    const y = height - t * (height - 4) - 2;
    return y;
  };

  const points = data
    .map((v, i) => `${i * stepX},${normY(v)}`)
    .join(" ");

  return (
    <svg className="w-full h-full text-blue-500" viewBox={`0 0 ${width} ${height}`}>
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
        points={points}
      />
    </svg>
  );
}

// формат времени
function formatTimeLabel(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

// график в модалке
function MetricChart({ data, times, min, max }) {
  if (!data || data.length < 2) return null;

  const width = 260;
  const height = 80;
  const count = data.length;
  const stepX = count > 1 ? width / (count - 1) : width;

  const clamp = v => Math.min(max, Math.max(min, v));
  const normY = v => {
    const c = clamp(v);
    const t = (c - min) / (max - min || 1);
    const y = height - t * (height - 8) - 4;
    return y;
  };

  const points = data
    .map((v, i) => `${i * stepX},${normY(v)}`)
    .join(" ");

  const labelCount = Math.min(5, count);
  const stepIndex = labelCount > 1 ? Math.floor((count - 1) / (labelCount - 1)) : 1;
  const timeLabels = [];
  for (let i = 0; i < count; i += stepIndex) {
    timeLabels.push({ idx: i, text: formatTimeLabel(times[i]) });
  }
  if (timeLabels[timeLabels.length - 1]?.idx !== count - 1) {
    timeLabels.push({ idx: count - 1, text: formatTimeLabel(times[count - 1]) });
  }

  const yMax = max.toFixed(1);
  const yMin = min.toFixed(1);
  const yMid = ((min + max) / 2).toFixed(1);

  return (
    <div className="flex items-stretch gap-2">
      <div className="flex-1">
        <div className="border border-gray-200 rounded-lg p-2">
          <svg className="w-full h-32 text-blue-500" viewBox={`0 0 ${width} ${height}`}>
            <line
              x1={0}
              y1={height - 4}
              x2={width}
              y2={height - 4}
              stroke="#e5e7eb"
              strokeWidth="1"
            />
            <line
              x1={0}
              y1={4}
              x2={0}
              y2={height - 4}
              stroke="#e5e7eb"
              strokeWidth="1"
            />
            <polyline
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
              points={points}
            />
          </svg>

          <div className="mt-1 flex justify-between text-[10px] text-gray-500">
            {timeLabels.map(l => (
              <span key={l.idx} className="font-mono">
                {l.text}
              </span>
            ))}
          </div>
        </div>
        <div className="mt-1 text-center text-xs text-gray-500">Время</div>
      </div>

      <div className="flex flex-col justify-between ml-1 text-[10px] text-gray-500">
        <span>{yMax}</span>
        <span>{yMid}</span>
        <span>{yMin}</span>
      </div>
    </div>
  );
}

// строка канала
function ChannelRow({ ch, onVfdClick }) {
  const [open, setOpen] = useState(false);
  const isOn = ch.state === "ON";
  const hasGroupVfd = !!ch.vfd;
  const canExpand = ch.devices && ch.devices.length > 1;
  const groupAlarm = ch.vfd && ch.vfd.alarmText;

  return (
    <div className="mb-1 text-xs">
      <div
        className="flex items-center justify-between cursor-pointer select-none"
        onClick={() => canExpand && setOpen(o => !o)}
      >
        <div className="flex items-center gap-1 pr-2">
          {canExpand && (
            <span className="text-[10px] text-gray-500">{open ? "▾" : "▸"}</span>
          )}
          <span className="text-gray-700 truncate">{ch.name}</span>
        </div>
        <span
          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
            isOn ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-700"
          }`}
        >
          {isOn ? "ВКЛ" : "ВЫКЛ"}
        </span>
      </div>

      {hasGroupVfd && (
        <div
          className={
            "mt-0.5 ml-3 text-[10px] " +
            (groupAlarm
              ? "text-red-700 bg-red-50 border border-red-200 rounded p-1"
              : "text-gray-600")
          }
        >
          <div className="flex items-center justify-between">
            <span>
              ПЧ {ch.vfd.type}: {ch.vfd.freq.toFixed(1)} Гц,{" "}
              {ch.vfd.current.toFixed(1)} А
            </span>
            <button
              className="ml-2 px-1.5 py-0.5 border border-gray-300 rounded hover:bg-gray-100 bg-white"
              onClick={e => {
                e.stopPropagation();
                onVfdClick &&
                  onVfdClick({
                    channel: ch,
                    device: null,
                  });
              }}
            >
              Детали
            </button>
          </div>
          {ch.vfd.alarmText && (
            <div className="font-semibold">{ch.vfd.alarmText}</div>
          )}
        </div>
      )}

      {open && ch.devices && (
        <div className="mt-1 ml-3 border-l border-gray-200 pl-2 space-y-0.5">
          {ch.devices.map(d => {
            const devAlarm = d.vfd && d.vfd.alarmText;
            const badgeClass = devAlarm
              ? "bg-red-100 text-red-700"
              : d.state === "ON"
              ? "bg-green-100 text-green-700"
              : "bg-gray-200 text-gray-700";

            return (
              <div
                key={d.id}
                className={
                  "flex justify-between text-[10px] items-center " +
                  (d.vfd ? "cursor-pointer " : "") +
                  (devAlarm ? "bg-red-50 text-red-700 rounded px-1 -mx-1" : "")
                }
                onClick={() => {
                  if (d.vfd && onVfdClick) {
                    onVfdClick({ channel: ch, device: d });
                  }
                }}
              >
                <span className="truncate">
                  {d.name}
                  {d.vfd && " • ПЧ"}
                </span>
                <span
                  className={
                    "px-1.5 py-0.5 rounded-full text-[10px] font-semibold " +
                    badgeClass
                  }
                >
                  {d.state === "ON" ? "ВКЛ" : "ВЫКЛ"}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
// расшифровка аварий ПЧ
function getAlarmDetails(alarmCode) {
  if (!alarmCode) return null;

  if (["U0-54", "U0-55", "U0-56"].includes(alarmCode)) {
    return (
      "Авария по фазам питания (код " +
      alarmCode +
      "). Точную расшифровку смотрим в руководстве ПЧ."
    );
  }

  return (
    "Авария ПЧ (код " +
    alarmCode +
    "). Детали зависят от модели, см. руководство конкретного ПЧ."
  );
}

// модал тренда датчика
function MetricDashboardModal({ selection, controllers, onClose }) {
  const [rangeId, setRangeId] = useState("1h");

  if (!selection) return null;

  const controller = controllers.find(c => c.code === selection.controllerCode);
  if (!controller) return null;

  const metricKey = selection.metricKey;

  const configMap = {
    temperature: { label: "Температура", unit: "°C", min: 0, max: 35 },
    humidity: { label: "Влажность", unit: "%", min: 20, max: 100 },
    nh3: { label: "Аммиак", unit: "ppm", min: 0, max: 80 },
  };

  const config = configMap[metricKey];
  if (!config) return null;

  let data = controller.history[metricKey] || [];
  let times = controller.history.times || [];

  if (data.length !== times.length) {
    const len = Math.min(data.length, times.length);
    data = data.slice(-len);
    times = times.slice(-len);
  }

  let slicedData = data;
  let slicedTimes = times;

  // диапазоны
  if (times.length > 0) {
    const range = METRIC_TIME_RANGES.find(r => r.id === rangeId) || METRIC_TIME_RANGES[2];
    const lastTs = new Date(times[times.length - 1]).getTime();
    const fromTs = lastTs - range.ms;

    const filteredPairs = times
      .map((t, i) => ({ i, ts: new Date(t).getTime() }))
      .filter(p => p.ts >= fromTs)
      .map(p => p.i);

    if (filteredPairs.length > 1) {
      slicedData = filteredPairs.map(i => data[i]);
      slicedTimes = filteredPairs.map(i => times[i]);
    }
  }

  // downsampling
  if (slicedData.length > 500) {
    const k = Math.ceil(slicedData.length / 500);
    const nd = [];
    const nt = [];
    for (let i = 0; i < slicedData.length; i += k) {
      nd.push(slicedData[i]);
      nt.push(slicedTimes[i]);
    }
    slicedData = nd;
    slicedTimes = nt;
  }

  const current = controller.sensors[metricKey];

  const start = slicedTimes[0] ? new Date(slicedTimes[0]) : null;
  const end = slicedTimes[slicedTimes.length - 1]
    ? new Date(slicedTimes[slicedTimes.length - 1])
    : null;

  const intervalSec = Math.round((HISTORY_SAMPLE_INTERVAL_MS / 1000) || 30);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-lg p-4 w-full max-w-xl">
        <div className="flex justify-between items-center mb-3">
          <div>
            <div className="text-xs text-gray-500">{controller.title}</div>
            <div className="text-lg font-semibold">{config.label}</div>
          </div>
          <button
            className="text-xs px-2 py-1 rounded border border-gray-300 hover:bg-gray-100"
            onClick={onClose}
          >
            Закрыть
          </button>
        </div>

        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="text-sm text-gray-600">
            Текущее значение:{" "}
            <span className="font-semibold">
              {current} {config.unit}
            </span>
          </div>

          <div className="text-xs flex items-center gap-1">
            <span className="text-gray-500">Масштаб:</span>
            <select
              className="border border-gray-300 rounded px-2 py-0.5 text-xs"
              value={rangeId}
              onChange={e => setRangeId(e.target.value)}
            >
              {METRIC_TIME_RANGES.map(r => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {start && end && (
          <div className="mb-2 text-xs text-gray-500">
            Интервал:{" "}
            <span className="font-mono">
              {start.toLocaleTimeString()} — {end.toLocaleTimeString()}
            </span>{" "}
            (шаг ~{intervalSec} c, точек: {slicedData.length})
          </div>
        )}

        <MetricChart
          data={slicedData}
          times={slicedTimes}
          min={config.min}
          max={config.max}
        />
      </div>
    </div>
  );
}

// полные параметры ПЧ
function VfdDashboardModal({ selection, controllers, onClose }) {
  if (!selection) return null;

  const controller = controllers.find(c => c.code === selection.controllerCode);
  if (!controller) return null;

  const channel = controller.channels.find(ch => ch.id === selection.channelId);
  if (!channel) return null;

  const device = selection.deviceId
    ? channel.devices?.find(d => d.id === selection.deviceId)
    : null;

  const vfd = device?.vfd || channel.vfd;
  if (!vfd) return null;

  const alarmDetails = getAlarmDetails(vfd.alarmCode);

  const renderCurrentGF = () => (
    <table className="w-full text-[11px]">
      <tbody>
        <tr>
          <td className="pr-2 text-gray-500">U0-00 Состояние работы</td>
          <td className="text-right">{vfd.runState || "—"}</td>
        </tr>
        <tr>
          <td className="pr-2 text-gray-500">U0-01 Код ошибки</td>
          <td className="text-right">{vfd.faultCode || "—"}</td>
        </tr>
        <tr>
          <td className="pr-2 text-gray-500">U0-02 Заданная частота, Гц</td>
          <td className="text-right">
            {vfd.setFreq != null ? vfd.setFreq.toFixed(1) : "—"}
          </td>
        </tr>
        <tr>
          <td className="pr-2 text-gray-500">U0-03 Рабочая частота, Гц</td>
          <td className="text-right">
            {vfd.runFreq != null ? vfd.runFreq.toFixed(1) : "—"}
          </td>
        </tr>
        <tr>
          <td className="pr-2 text-gray-500">U0-04 Скорость, об/мин</td>
          <td className="text-right">
            {vfd.speedRpm != null ? Math.round(vfd.speedRpm) : "—"}
          </td>
        </tr>
        <tr>
          <td className="pr-2 text-gray-500">U0-05 Выходное напряжение, В</td>
          <td className="text-right">
            {vfd.outVoltage != null ? vfd.outVoltage.toFixed(0) : "—"}
          </td>
        </tr>
        <tr>
          <td className="pr-2 text-gray-500">U0-06 Выходной ток, А</td>
          <td className="text-right">
            {vfd.outCurrent != null ? vfd.outCurrent.toFixed(1) : "—"}
          </td>
        </tr>
        <tr>
          <td className="pr-2 text-gray-500">U0-07 Выходная мощность, кВт</td>
          <td className="text-right">
            {vfd.outPower != null ? vfd.outPower.toFixed(1) : "—"}
          </td>
        </tr>
      </tbody>
    </table>
  );

  // группы аварий GF (показываются только если есть alarmCode!)
  const renderFaultGroup = (title, baseCode, f) => {
    if (!f) return null;

    return (
      <div className="mb-1">
        <div className="font-semibold text-xs mb-0.5">{title}</div>
        <table className="w-full text-[11px]">
          <tbody>
            <tr>
              <td className="pr-2 text-gray-500">{baseCode + 0} Частота, Гц</td>
              <td className="text-right">{f.freq != null ? f.freq.toFixed(1) : "—"}</td>
            </tr>
            <tr>
              <td className="pr-2 text-gray-500">{baseCode + 1} Ток, А</td>
              <td className="text-right">{f.current != null ? f.current.toFixed(1) : "—"}</td>
            </tr>
            <tr>
              <td className="pr-2 text-gray-500">{baseCode + 2} DC-шина, В</td>
              <td className="text-right">{f.dcBus != null ? f.dcBus.toFixed(0) : "—"}</td>
            </tr>
            <tr>
              <td className="pr-2 text-gray-500">{baseCode + 3} Темп. радиатора, °C</td>
              <td className="text-right">{f.heatsinkTemp != null ? f.heatsinkTemp.toFixed(1) : "—"}</td>
            </tr>
            <tr>
              <td className="pr-2 text-gray-500">{baseCode + 4} Время от включения, мин</td>
              <td className="text-right">{f.timePowerMin != null ? f.timePowerMin : "—"}</td>
            </tr>
            <tr>
              <td className="pr-2 text-gray-500">{baseCode + 5} Время от пуска, ч</td>
              <td className="text-right">{f.timeRunHours != null ? f.timeRunHours.toFixed(1) : "—"}</td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  };

  const renderCurrentESQ = () => (
    <table className="w-full text-[11px]">
      <tbody>
        <tr>
          <td className="pr-2 text-gray-500">1001 Заданная частота, Гц</td>
          <td className="text-right">
            {vfd.esqSetFreq1001 != null ? vfd.esqSetFreq1001.toFixed(1) : "—"}
          </td>
        </tr>
        <tr>
          <td className="pr-2 text-gray-500">1003 Выходное напряжение, В</td>
          <td className="text-right">
            {vfd.esqOutVolt1003 != null ? vfd.esqOutVolt1003.toFixed(0) : "—"}
          </td>
        </tr>
        <tr>
          <td className="pr-2 text-gray-500">1004 Выходной ток, А</td>
          <td className="text-right">
            {vfd.esqOutCurrent1004 != null
              ? vfd.esqOutCurrent1004.toFixed(1)
              : "—"}
          </td>
        </tr>
        <tr>
          <td className="pr-2 text-gray-500">1005 Выходная мощность, кВт</td>
          <td className="text-right">
            {vfd.esqOutPower1005 != null
              ? vfd.esqOutPower1005.toFixed(1)
              : "—"}
          </td>
        </tr>
        <tr>
          <td className="pr-2 text-gray-500">1007 Рабочая скорость</td>
          <td className="text-right">
            {vfd.esqRunSpeed1007 != null
              ? vfd.esqRunSpeed1007.toFixed(0)
              : "—"}
          </td>
        </tr>
      </tbody>
    </table>
  );

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-lg p-4 w-full max-w-md">
        <div className="flex justify-between items-center mb-3">
          <div>
            <div className="text-xs text-gray-500">{controller.title}</div>
            <div className="text-lg font-semibold">
              {device ? device.name : channel.name}
            </div>
          </div>
          <button
            className="text-xs px-2 py-1 rounded border border-gray-300 hover:bg-gray-100"
            onClick={onClose}
          >
            Закрыть
          </button>
        </div>

        <div className="space-y-1 text-sm text-gray-700 mb-3">
          <div>
            Тип ПЧ: <span className="font-semibold">{vfd.type}</span>
          </div>
          <div>
            Текущая частота:{" "}
            <span className="font-semibold">
              {vfd.freq != null ? vfd.freq.toFixed(1) : "—"} Гц
            </span>
          </div>
          <div>
            Текущий ток:{" "}
            <span className="font-semibold">
              {vfd.current != null ? vfd.current.toFixed(1) : "—"} А
            </span>
          </div>

          {vfd.alarmText ? (
            <>
              <div className="text-red-600 font-semibold">{vfd.alarmText}</div>
              {alarmDetails && (
                <div className="text-xs text-red-700">{alarmDetails}</div>
              )}
            </>
          ) : (
            <div className="text-green-600 text-xs">Аварий нет</div>
          )}
        </div>

        <div className="mb-3">
          <div className="text-xs font-semibold mb-1">Текущие параметры</div>
          {vfd.type === "GF" ? renderCurrentGF() : renderCurrentESQ()}
        </div>

        {/* показывать параметры аварий GF только если есть реальный alarmCode */}
        {vfd.type === "GF" && vfd.alarmCode && (
          <div className="mb-3">
            <div className="text-xs font-semibold mb-1">
              Параметры аварии (U0-54…U0-71)
            </div>

            {vfd.thirdFault &&
              renderFaultGroup("3-я авария (U0-54…U0-59)", "U0-5", vfd.thirdFault)}

            {vfd.secondFault &&
              renderFaultGroup("2-я авария (U0-60…U0-65)", "U0-6", vfd.secondFault)}

            {vfd.firstFault &&
              renderFaultGroup("1-я авария (U0-66…U0-71)", "U0-6", vfd.firstFault)}
          </div>
        )}

        <div className="text-xs text-gray-500">
          Параметры обновляются онлайн вместе с данными контроллера.
        </div>
      </div>
    </div>
  );
}

// карточка контроллера
function ControllerCard({ data, onMetricClick, onVfdClick }) {
  let firstAlarmSource = null;
  let firstAlarmChannel = null;
  let firstAlarmDevice = null;

  data.channels.forEach(ch => {
    if (!firstAlarmSource && ch.vfd && ch.vfd.alarmText) {
      firstAlarmSource = ch.name;
      firstAlarmChannel = ch;
      firstAlarmDevice = null;
    }
    if (!firstAlarmSource && ch.devices) {
      const devAlarm = ch.devices.find(d => d.vfd && d.vfd.alarmText);
      if (devAlarm) {
        firstAlarmSource = devAlarm.name;
        firstAlarmChannel = ch;
        firstAlarmDevice = devAlarm;
      }
    }
  });

  const hasVfdAlarm = !!firstAlarmSource;

  return (
    <div className="bg-white shadow rounded-xl p-4">
      <div className="flex justify-between items-baseline mb-2">
        <div>
          <div className="text-xs text-gray-500">Контроллер {data.num}</div>
          <h3 className="font-semibold text-lg flex items-center gap-2">
            {data.title}
            {hasVfdAlarm && (
              <button
                type="button"
                className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-semibold hover:bg-red-200 cursor-pointer"
                onClick={() => {
                  if (onVfdClick && firstAlarmChannel) {
                    onVfdClick({
                      channel: firstAlarmChannel,
                      device: firstAlarmDevice,
                    });
                  }
                }}
              >
                Авария ПЧ: {firstAlarmSource}
              </button>
            )}
          </h3>
        </div>

        <span className="text-xs text-gray-500">
          {new Date(data.lastUpdate).toLocaleTimeString()}
        </span>
      </div>

      <div className="grid grid-cols-4 gap-2 mb-3">
        <div
          className="p-2 bg-gray-50 rounded text-center cursor-pointer hover:ring-1 hover:ring-blue-300"
          onClick={() => onMetricClick && onMetricClick("temperature")}
        >
          <div className="text-[10px] text-gray-500">T, °C</div>
          <div className="text-lg font-medium">{data.sensors.temperature}</div>
          <div className="h-6 mt-1">
            <Trend data={data.history.temperature} min={0} max={35} />
          </div>
        </div>

        <div
          className="p-2 bg-gray-50 rounded text-center cursor-pointer hover:ring-1 hover:ring-blue-300"
          onClick={() => onMetricClick && onMetricClick("humidity")}
        >
          <div className="text-[10px] text-gray-500">RH, %</div>
          <div className="text-lg font-medium">{data.sensors.humidity}</div>
          <div className="h-6 mt-1">
            <Trend data={data.history.humidity} min={20} max={100} />
          </div>
        </div>

        <div
          className="p-2 bg-gray-50 rounded text-center cursor-pointer hover:ring-1 hover:ring-blue-300"
          onClick={() => onMetricClick && onMetricClick("nh3")}
        >
          <div className="text-[10px] text-gray-500">NH₃, ppm</div>
          <div className="text-lg font-medium">{data.sensors.nh3}</div>
          <div className="h-6 mt-1">
            <Trend data={data.history.nh3} min={0} max={80} />
          </div>
        </div>

        <div className="p-2 bg-gray-50 rounded text-center">
          <div className="text-[10px] text-gray-500">Уставка T, °C</div>
          <div className="text-lg font-medium">{data.sensors.setpoint}</div>
        </div>
      </div>

      <div className="mb-2 border-t border-gray-100 pt-2 max-h-36 overflow-y-auto">
        {data.channels.map(ch => (
          <ChannelRow key={ch.id} ch={ch} onVfdClick={payload => onVfdClick(payload)} />
        ))}
      </div>

      <div className="flex items-center text-xs mt-1">
        <StatusDot status={data.comm} />
        <span className="text-gray-600">Связь: {data.comm}</span>
      </div>
    </div>
  );
}
// обновление ПЧ с фиксацией новых аварий в историю
function updateVfdWithContext(v, ctx) {
  if (!v) return v;

  const alarmFlip = Math.random() < 0.03;
  let alarmCode = v.alarmCode;
  let alarmText = v.alarmText;

  if (alarmFlip) {
    const codes = ["U0-54", "U0-55", "U0-56", "U0-60", "U0-61"];
    alarmCode =
      Math.random() < 0.5
        ? codes[Math.floor(Math.random() * codes.length)]
        : null;

    alarmText = alarmCode
      ? "Авария частотника (" + alarmCode + ")"
      : null;
  }

  const wasAlarm = !!v.alarmCode;
  const isAlarm = !!alarmCode;

  // фиксируем только новые аварии
  if (!wasAlarm && isAlarm && ctx && ctx.faultsCollector) {
    ctx.faultsCollector.push({
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      time: new Date().toISOString(),
      controllerCode: ctx.controller.code,
      controllerTitle: ctx.controller.title,
      channelId: ctx.channel.id,
      channelName: ctx.channel.name,
      deviceId: ctx.device ? ctx.device.id : null,
      deviceName: ctx.device ? ctx.device.name : null,
      vfdType: v.type,
      alarmCode,
    });
  }

  if (v.type === "GF") {
    const setFreq = v.setFreq + randomBetween(-1, 1);
    const runFreq = setFreq + randomBetween(-1, 1);
    const outCurrent = v.outCurrent + randomBetween(-0.5, 0.5);
    const outVoltage = v.outVoltage + randomBetween(-5, 5);
    const outPower = v.outPower + randomBetween(-0.3, 0.3);

    return {
      ...v,
      alarmCode,
      alarmText,
      setFreq,
      runFreq,
      outCurrent,
      outVoltage,
      outPower,
      speedRpm: runFreq * 30,
      ai1Before: v.ai1Before + randomBetween(-0.1, 0.1),
      ai1: v.ai1 + randomBetween(-0.1, 0.1),
      motorTemp: v.motorTemp + randomBetween(-0.5, 0.5),
      igbtTemp: v.igbtTemp + randomBetween(-0.5, 0.5),
      fbSpeed: v.fbSpeed + randomBetween(-0.5, 0.5),
      freq: runFreq,
      current: outCurrent,
    };
  }

  // ESQ
  const setFreq1001 = v.esqSetFreq1001 + randomBetween(-1, 1);
  const outCurrent1004 = v.esqOutCurrent1004 + randomBetween(-0.5, 0.5);
  const outVolt1003 = v.esqOutVolt1003 + randomBetween(-5, 5);
  const outPower1005 = v.esqOutPower1005 + randomBetween(-0.3, 0.3);
  const runSpeed1007 = setFreq1001 * 30;

  return {
    ...v,
    alarmCode,
    alarmText,
    esqSetFreq1001: setFreq1001,
    esqOutCurrent1004: outCurrent1004,
    esqOutVolt1003: outVolt1003,
    esqOutPower1005: outPower1005,
    esqRunSpeed1007: runSpeed1007,
    freq: setFreq1001,
    current: outCurrent1004,
  };
}

export default function App() {
  const [controllers, setControllers] = useState(generateInitialState);
  const [metricSelection, setMetricSelection] = useState(null);
  const [vfdSelection, setVfdSelection] = useState(null);
  const [vfdFaultHistory, setVfdFaultHistory] = useState([]);

  useEffect(() => {
    const interval = setInterval(() => {
      const faultsToAppend = [];

      setControllers(prev =>
        prev.map(c => {
          const comm =
            Math.random() < 0.02
              ? "ALARM"
              : Math.random() < 0.05
              ? "WARN"
              : "OK";

          const newT = +(c.sensors.temperature + (Math.random() * 2 - 1)).toFixed(1);
          const newRH = Math.max(
            10,
            +(c.sensors.humidity + (Math.random() * 4 - 2)).toFixed(1)
          );
          const newNH3 = Math.max(0, Math.round(c.sensors.nh3 + (Math.random() * 4 - 2)));

          const nowMs = Date.now();
          const nowIso = new Date(nowMs).toISOString();

          let newHistory = c.history;

          const lastTimeIso =
            c.history.times && c.history.times.length
              ? c.history.times[c.history.times.length - 1]
              : null;
          const lastTimeMs = lastTimeIso ? new Date(lastTimeIso).getTime() : 0;

          const shouldSample =
            !lastTimeIso || nowMs - lastTimeMs >= HISTORY_SAMPLE_INTERVAL_MS;

          if (shouldSample) {
            newHistory = {
              temperature: pushHistory(c.history.temperature, newT),
              humidity: pushHistory(c.history.humidity, newRH),
              nh3: pushHistory(c.history.nh3, newNH3),
              times: pushHistory(c.history.times, nowIso),
            };
          }

          const updatedChannels = c.channels.map(ch => {
            const devices =
              ch.devices?.map(d => {
                const flip = Math.random() < 0.02;
                let nextState = d.state;
                if (flip) nextState = d.state === "ON" ? "OFF" : "ON";

                return {
                  ...d,
                  state: nextState,
                  vfd: d.vfd
                    ? updateVfdWithContext(d.vfd, {
                        controller: c,
                        channel: ch,
                        device: d,
                        faultsCollector: faultsToAppend,
                      })
                    : d.vfd,
                };
              }) || [];

            const groupOn = devices.some(d => d.state === "ON");

            return {
              ...ch,
              state: groupOn ? "ON" : "OFF",
              vfd: ch.vfd
                ? updateVfdWithContext(ch.vfd, {
                    controller: c,
                    channel: ch,
                    device: null,
                    faultsCollector: faultsToAppend,
                  })
                : ch.vfd,
              devices,
            };
          });

          return {
            ...c,
            sensors: {
              temperature: newT,
              humidity: newRH,
              nh3: newNH3,
              setpoint: c.sensors.setpoint,
            },
            history: newHistory,
            channels: updatedChannels,
            comm,
            lastUpdate: nowIso,
          };
        })
      );

      if (faultsToAppend.length) {
        setVfdFaultHistory(prev => {
          const merged = [...prev, ...faultsToAppend];
          const maxLen = 100;
          return merged.length > maxLen
            ? merged.slice(merged.length - maxLen)
            : merged;
        });
      }
    }, DISPLAY_UPDATE_INTERVAL_MS);

    return () => clearInterval(interval);
  }, []);

  const handleMetricClick = (controller, metricKey) => {
    setMetricSelection({
      controllerCode: controller.code,
      metricKey,
    });
  };

  const handleVfdClick = (controller, payload) => {
    const { channel, device } = payload || {};
    if (!channel && !device) return;

    setVfdSelection({
      controllerCode: controller.code,
      channelId: channel.id,
      deviceId: device ? device.id : null,
    });
  };

  const visibleFaults = [...vfdFaultHistory].reverse();
  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Обзор фермы — MVP</h1>
          <div className="text-xs text-gray-500 mt-1">
            Обновление показаний ~5 с • точки истории ~30 с
          </div>
        </div>

        <span className="text-xs text-gray-500">
          {controllers.length} контроллеров • mock данные
        </span>
      </header>

      <main>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {controllers.map(c => (
            <ControllerCard
              key={c.code}
              data={c}
              onMetricClick={metricKey => handleMetricClick(c, metricKey)}
              onVfdClick={payload => handleVfdClick(c, payload)}
            />
          ))}
        </div>

        {visibleFaults.length > 0 && (
          <section className="mt-6">
            <h2 className="text-sm font-semibold mb-2">
              История аварий ПЧ (mock)
            </h2>

            <div className="bg-white shadow rounded-xl p-3 max-h-60 overflow-y-auto text-xs">
              {visibleFaults.map(f => (
                <div
                  key={f.id}
                  className="border border-red-200 bg-red-50 rounded-lg px-2 py-1 mb-1 last:mb-0 flex justify-between"
                >
                  <div>
                    <div className="font-semibold text-red-700">
                      {f.alarmCode} • {f.vfdType}
                    </div>
                    <div className="text-gray-700">
                      {f.controllerTitle} • {f.channelName}
                      {f.deviceName ? " • " + f.deviceName : ""}
                    </div>
                  </div>

                  {/* удаление аварии */}
                  <button
                    className="text-[10px] ml-3 px-1.5 py-0.5 border border-red-300 rounded bg-white hover:bg-red-100 text-red-700 h-fit"
                    onClick={() =>
                      setVfdFaultHistory(prev =>
                        prev.filter(x => x.id !== f.id)
                      )
                    }
                  >
                    удалить
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      <MetricDashboardModal
        selection={metricSelection}
        controllers={controllers}
        onClose={() => setMetricSelection(null)}
      />

      <VfdDashboardModal
        selection={vfdSelection}
        controllers={controllers}
        onClose={() => setVfdSelection(null)}
      />
    </div>
  );
}
