import React from "react";
import { KUB_BASE_ADDR, getKubRangeString } from "../domain/kub1063m";

function fmtLastSeen(ms) {
  if (!ms) return "нет данных";
  const sec = Math.round(ms / 1000);
  if (sec < 5) return "онлайн";
  if (sec < 60) return `${sec} c назад`;
  const min = Math.round(sec / 60);
  return `${min} мин назад`;
}

function ControllerStatus({ controller }) {
  if (!controller) return null;

  const { link, health } = controller;

  return (
    <div>
      <div className="status-grid">
        <div className={"status-chip" + (link.enabled ? "" : " bad")}>
          <span className="status-chip-label">Связь</span>
          <span className="status-chip-value">
            {link.enabled ? "разрешена" : "запрещена"}
          </span>
        </div>

        <div
          className={
            "status-chip" +
            (health.errors > 0 ? " bad" : "")
          }
        >
          <span className="status-chip-label">Режим данных</span>
          <span className="status-chip-value">
            {health.mockEnabled ? "mock" : "реальные"}
          </span>
        </div>

        <div className={"status-chip" + (health.errors ? " error" : "")}>
          <span className="status-chip-label">Ошибки опроса</span>
          <span className="status-chip-value">{health.errors}</span>
        </div>

        <div className="status-chip">
          <span className="status-chip-label">Последний ответ</span>
          <span className="status-chip-value">
            {fmtLastSeen(health.lastSeenMs)}
          </span>
        </div>

        <div className="status-chip">
          <span className="status-chip-label">Базовый регистр КУБ</span>
          <span className="status-chip-value">
            0x{KUB_BASE_ADDR.toString(16)}
          </span>
        </div>

        <div className="status-chip">
          <span className="status-chip-label">Диапазон опроса</span>
          <span className="status-chip-value">
            {getKubRangeString()}
          </span>
        </div>
      </div>
    </div>
  );
}

export default ControllerStatus;
