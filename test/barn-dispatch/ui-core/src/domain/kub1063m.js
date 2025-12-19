// базовая модель параметров КУБ-1063М для ui-core

export const KUB_BASE_ADDR = 0x0020;

// минимальный базовый набор для опроса (проектный)
export const KUB_REG_LIST = [
  0x0081,
  0x0082,
  0x0084,
  0x0086,
  0x0087,
  0x008D,
  0x00c0, 0x00c1, 0x00c2, 0x00c3,
  0x00c4, 0x00c5, 0x00c6, 0x00c7,
  0x00c8, 0x00c9, 0x00ca, 0x00cb,
  0x00cc, 0x00cd, 0x00ce, 0x00cf,
  0x00d0,
  0x00d1,
  0x00d4,
];

// простая группировка для будущей привязки к UI
export const KUB_GROUPS = {
  env: {
    label: "Микроклимат",
    regs: [0x0081, 0x0082, 0x0084], // T, RH, NH3 (будет уточнено по паспорту)
  },
  alarms: {
    label: "Аварии / статусы",
    regs: [0x0086, 0x0087, 0x008d],
  },
  analog1: {
    label: "Аналоговые входы 1–4",
    regs: [0x00c0, 0x00c1, 0x00c2, 0x00c3],
  },
  analog2: {
    label: "Аналоговые входы 5–8",
    regs: [0x00c4, 0x00c5, 0x00c6, 0x00c7],
  },
  analog3: {
    label: "Аналоговые выходы 1–4",
    regs: [0x00c8, 0x00c9, 0x00ca, 0x00cb],
  },
  bits: {
    label: "Дискретные / служебные",
    regs: [0x00cc, 0x00cd, 0x00ce, 0x00cf, 0x00d0, 0x00d1, 0x00d4],
  },
};

export function getKubRangeString() {
  const min = Math.min(...KUB_REG_LIST);
  const max = Math.max(...KUB_REG_LIST);
  return `0x${min.toString(16)}…0x${max.toString(16)}`;
}
