import {
    API_BASE_URL,
    API_CONTROLLERS_PATH,
  } from "../config";
  
  // безопасное чтение значения регистра КУБ по адресу
  export function getKubValue(kubMap, addr) {
    if (!kubMap) return null;
  
    const hexKey = "0x" + addr.toString(16).toLowerCase();
    const decKey = String(addr);
  
    if (hexKey in kubMap) return kubMap[hexKey];
    if (decKey in kubMap) return kubMap[decKey];
  
    return null;
  }
  
  // DTO: ожидаемый формат снапшота контроллера от сервера
  export function mapSnapshotDto(dto) {
    if (!dto) return null;
  
    return {
      controllerCode: dto.controller_code,
      ts: dto.ts, // ISO-строка
      kub: dto.kub || {}, // карта "адрес -> значение"
      gf: dto.gf || {}, // карта по частотникам
      health: {
        online: !!dto.online,
        errors: dto.errors ?? 0,
        lastSeenMs: dto.last_seen_ms ?? null,
      },
    };
  }
  
  // базовый fetch-снапшота
  export async function fetchControllerSnapshot(controllerCode) {
    const url = `${API_BASE_URL}${API_CONTROLLERS_PATH}/${encodeURIComponent(
      controllerCode
    )}/snapshot`;
  
    const resp = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });
  
    if (!resp.ok) {
      throw new Error(`Snapshot fetch failed: ${resp.status}`);
    }
  
    const dto = await resp.json();
    return mapSnapshotDto(dto);
  }
  