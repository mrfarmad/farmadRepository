import React, { useEffect, useState } from "react";
import { fetchControllerSnapshot, getKubValue } from "../services/controllerApi";
import { KUB_GROUPS } from "../domain/kub1063m";

// генератор мок-значений
function genMockValues(controller, tick) {
  const seed = controller.num * 37 + tick * 17;
  const rnd = (k, min, max) => {
    const x = Math.sin(seed * k) * 10000;
    const frac = x - Math.floor(x);
    return +(min + (max - min) * frac).toFixed(1);
  };

  return {
    temp: rnd(1, 10, 30), // °C
    rh: rnd(2, 40, 80), // %
    nh3: Math.round(rnd(3, 0, 50)), // ppm
    u0_02: rnd(4, 0, 50), // Set frequency
    u0_03: rnd(5, 0, 50), // Running frequency
    u0_06: rnd(6, 0, 30), // Current
    u0_07: rnd(7, 0, 7), // Power
  };
}

// маппинг значений из снапшота сервера
function valuesFromSnapshot(controller, snapshot) {
  if (!snapshot) return null;

  const { kub, gf } = snapshot;

  // предположение: T, RH, NH3 сидят в группе env
  const envRegs = KUB_GROUPS.env.regs || [];
  const tReg = envRegs[0];
  const rhReg = envRegs[1];
  const nh3Reg = envRegs[2];

  const temp = tReg != null ? getKubValue(kub, tReg) : null;
  const rh = rhReg != null ? getKubValue(kub, rhReg) : null;
  const nh3 = nh3Reg != null ? getKubValue(kub, nh3Reg) : null;

  // GF-значения — заготовка, ожидаем dto.gf["main"] и поля u0_02/… по договорённости
  const gfMain = gf?.main || {};

  return {
    temp: temp ?? null,
    rh: rh ?? null,
    nh3: nh3 ?? null,
    u0_02: gfMain.u0_02 ?? null,
    u0_03: gfMain.u0_03 ?? null,
    u0_06: gfMain.u0_06 ?? null,
    u0_07: gfMain.u0_07 ?? null,
  };
}

function LiveParams({ controller }) {
  if (!controller) return null;
  const { health, link } = controller;

  const [tick, setTick] = useState(0);
  const [values, setValues] = useState(null);
  const [apiError, setApiError] = useState(null);
  const [loading, setLoading] = useState(false);

  // MOCK-таймер
  useEffect(() => {
    if (!health.mockEnabled) {
      return;
    }

    setApiError(null); // mock = локальные данные, API не трогаем
    setValues(genMockValues(controller, 0));
    setTick(0);

    const id = setInterval(() => {
      setTick((t) => t + 1);
    }, 5000); // 5 c

    return () => clearInterval(id);
  }, [controller.code, health.mockEnabled]);

  useEffect(() => {
    if (!health.mockEnabled) {
      setValues(null); // очистка mock-данных
      return;
    }
    setValues(genMockValues(controller, tick));
  }, [controller, health.mockEnabled, tick]);

  // API-опрос при mockEnabled = false
  useEffect(() => {
    if (health.mockEnabled) {
      return;
    }

    // если связь запрещена на уровне контроллера — API не трогаем
    if (!link.enabled) {
      setValues(null);
      setApiError(null);
      return;
    }

    let cancelled = false;

    const pollOnce = async () => {
      setLoading(true);
      try {
        const snapshot = await fetchControllerSnapshot(controller.code);
        if (cancelled) return;
        const v = valuesFromSnapshot(controller, snapshot);
        setValues(v);
        setApiError(null);
      } catch (err) {
        if (cancelled) return;
        setApiError(err.message || String(err));
        setValues(null);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    // первое чтение
    pollOnce();

    const intervalMs = link.pollMs > 0 ? link.pollMs : 5000;

    const id = setInterval(() => {
      pollOnce();
    }, intervalMs);

    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [controller, health.mockEnabled, link.enabled, link.pollMs]);

  const srcLabel = health.mockEnabled
    ? "mock"
    : link.enabled
    ? "сервер (snapshot)"
    : "отключено";

  const v = values;

  const fmt = (val, suffix = "") => {
    if (!health.mockEnabled && apiError) return "ошибка";
    if (!health.mockEnabled && !link.enabled) return "off";
    if (!health.mockEnabled && loading && val == null) return "…";
    if (val == null) return "—";
    return suffix ? `${val} ${suffix}` : `${val}`;
  };

  return (
    <div style={{ marginTop: 10 }}>
      <div className="panel-title">
        <span>Онлайн-параметры</span>
        <span>
          источник: {srcLabel}
          {apiError ? " · ошибка API" : loading ? " · опрос…" : ""}
        </span>
      </div>
      <div className="live-grid">
        <div className="live-chip">
          <span>T, °C</span>
          <span>{fmt(v?.temp)}</span>
        </div>
        <div className="live-chip">
          <span>RH, %</span>
          <span>{fmt(v?.rh)}</span>
        </div>
        <div className="live-chip">
          <span>NH₃, ppm</span>
          <span>{fmt(v?.nh3)}</span>
        </div>
        <div className="live-chip">
          <span>U0-02, freq set</span>
          <span>{fmt(v?.u0_02, "Hz")}</span>
        </div>
        <div className="live-chip">
          <span>U0-03, freq run</span>
          <span>{fmt(v?.u0_03, "Hz")}</span>
        </div>
        <div className="live-chip">
          <span>U0-06, ток</span>
          <span>{fmt(v?.u0_06, "A")}</span>
        </div>
        <div className="live-chip">
          <span>U0-07, мощность</span>
          <span>{fmt(v?.u0_07, "kW")}</span>
        </div>
        <div className="live-chip">
          <span>КУБ: базовый опрос</span>
          <span>0x0020 + базовый набор</span>
        </div>
      </div>
    </div>
  );
}

export default LiveParams;
