#!/usr/bin/env node
/*
 * Modbus RTU bus simulator in Node.js (single PTY, multiple slave IDs).
 *
 * Creates one PTY (virtual serial port) and responds to FC03 for multiple
 * devices (slave IDs) on the same port, emulating an RS‑485 bus.
 *
 * Usage examples:
 *   node tools/simulators/rtu-simulator.js --vfd 10-33 --kub 1-6
 *   node tools/simulators/rtu-simulator.js --kub 1-3 --vfd 4-5
 */

const { Command } = require('commander');
const pty = require('node-pty');
const crc = require('crc');

// ---------- Helpers ----------

function parseIdRanges(spec) {
  if (!spec) return [];
  const ids = new Set();
  for (const part of spec.split(/[ ,]+/).filter(Boolean)) {
    if (part.includes('-')) {
      const [a, b] = part.split('-', 2).map((x) => parseInt(x, 10));
      const start = Math.min(a, b);
      const end = Math.max(a, b);
      for (let i = start; i <= end; i += 1) ids.add(i);
    } else {
      ids.add(parseInt(part, 10));
    }
  }
  return Array.from(ids).sort((a, b) => a - b);
}

function modbusCrc(frame) {
  // crc.crc16modbus returns BE; convert to LE bytes
  const val = crc.crc16modbus(frame) & 0xffff;
  const lo = val & 0xff;
  const hi = (val >> 8) & 0xff;
  return Buffer.from([lo, hi]);
}

function packCrc(frame) {
  return Buffer.concat([frame, modbusCrc(frame)]);
}

// ---------- Device maps ----------

class BaseMap {
  read() {
    throw new Error('read not implemented');
  }
}

class VFDMap extends BaseMap {
  constructor() {
    super();
    this.regs = {
      0x1000: 3,
      0x1001: 0,
      0x1002: 263,
      0x1003: 0,
      0x1004: 0,
      0x1005: 0,
      0x1006: 0,
      0x101A: 29,
      0x101B: 35,
      0x102B: 0xAAAA,
      0x102C: 0xBBBB,
    };
  }

  read(start, count) {
    const vals = [];
    for (let i = 0; i < count; i += 1) {
      const addr = start + i;
      vals.push(this.regs[addr] ?? 0);
    }
    return vals;
  }
}

class KUBMap extends BaseMap {
  constructor() {
    super();
    this.regs = {
      0x0083: 1010,
      0x0084: 550,
      0x0085: 3000,
      0x0086: 0,
      0x0087: 0,
      0x0088: 0,
      0x0089: 450,
      0x008A: 100,
      0x008B: 200,
      0x008C: 300,
      0x0092: 400,
      0x0093: 500,
      0x0094: 0,
      0x0095: 0,
      0x0096: 0,
      0x0097: 0,
      0x0098: 0,
      0x0099: 0,
      0x009A: 0,
      0x009B: 0,
      0x009C: 0,
      0x009D: 0,
      0x009E: 0,
      0x009F: 0,
      0x0081: 0,
      0x0082: 0,
      0x00A2: 0,
      0x00D5: 230,
      0x00D4: 220,
      0x00D6: 250,
      0x00D1: 500,
      0x00D2: 1,
      0x00D0: 600,
      0x00D3: 1234,
      0x00C0: 0,
      0x00C1: 0,
      0x00C2: 0,
      0x00C3: 0,
      0x00C4: 0,
      0x00C5: 0,
      0x00C6: 0,
      0x00C7: 0,
      0x00C8: 0,
      0x00C9: 0,
      0x00CA: 0,
      0x00CB: 0,
      0x00CC: 0,
      0x00CD: 0,
      0x00CE: 0,
      0x00CF: 0,
      0x0301: 0x0102,
      0x0302: 0,
      0x0303: 0,
    };
  }

  read(start, count) {
    const vals = [];
    for (let i = 0; i < count; i += 1) {
      const addr = start + i;
      vals.push(this.regs[addr] ?? 0);
    }
    return vals;
  }
}

// ---------- Core bus loop ----------

function formatFrame(buf) {
  return [...buf].map((b) => b.toString(16).padStart(2, '0')).join(' ');
}

function createDevices(vfdIds, kubIds) {
  const devices = new Map();
  for (const id of vfdIds) devices.set(id, new VFDMap());
  for (const id of kubIds) if (!devices.has(id)) devices.set(id, new KUBMap());
  return devices;
}

function startPty() {
  const term = pty.spawn('cat', [], {
    name: 'rtu-sim',
    cols: 80,
    rows: 30,
    cwd: process.cwd(),
    env: process.env,
    encoding: null,
  });
  return term;
}

function printIntro(path, vfdIds, kubIds) {
  console.log('────────────────────────────────────────────────────────────────');
  console.log('🚌 RTU BUS simulator (Node.js, single PTY, multi-slave)');
  console.log(`• Port: ${path}`);
  if (vfdIds.length) console.log(`• VFD IDs: ${vfdIds.join(', ')}`);
  if (kubIds.length) console.log(`• KUB IDs: ${kubIds.join(', ')}`);
  console.log('────────────────────────────────────────────────────────────────');
}

function runBus(devices, reader, writer) {
  let buffer = Buffer.alloc(0);
  reader.onData((data) => {
    buffer = Buffer.concat([buffer, Buffer.from(data)]);
    while (buffer.length >= 8) {
      const frame = buffer.subarray(0, 8);
      const addr = frame[0];
      const func = frame[1];
      const start = (frame[2] << 8) | frame[3];
      const count = (frame[4] << 8) | frame[5];
      const recvCrc = (frame[7] << 8) | frame[6];
      const calcCrc = crc.crc16modbus(frame.subarray(0, 6));
      if (recvCrc !== calcCrc) {
        buffer = buffer.subarray(1);
        continue;
      }
      buffer = buffer.subarray(8);
      const dev = devices.get(addr);
      if (!dev) continue;
      if (func !== 0x03) {
        const error = packCrc(Buffer.from([addr, func | 0x80, 0x01]));
        writer.write(error);
        console.log(`REQ ${addr}: ${formatFrame(frame)} | ERR`);
        continue;
      }
      const regs = dev.read(start, count) || [];
      const payload = Buffer.alloc(3 + regs.length * 2);
      payload[0] = addr;
      payload[1] = func;
      payload[2] = regs.length * 2;
      regs.forEach((val, idx) => {
        payload[3 + idx * 2] = (val >> 8) & 0xff;
        payload[4 + idx * 2] = val & 0xff;
      });
      const response = packCrc(payload);
      writer.write(response);
      console.log(`REQ ${addr}: ${formatFrame(frame)} | RESP: ${formatFrame(response)}`);
    }
  });
}

// ---------- CLI ----------

function main() {
  const program = new Command();
  program
    .option('--vfd <ids>', 'VFD slave IDs', '10-33')
    .option('--kub <ids>', 'KUB-1063 slave IDs', '1-6')
    .option('--stdio', 'Use stdin/stdout instead of PTY')
    .parse(process.argv);

  const opts = program.opts();
  const vfdIds = parseIdRanges(opts.vfd);
  const kubIds = parseIdRanges(opts.kub);
  const devices = createDevices(vfdIds, kubIds);

  if (opts.stdio) {
    if (process.stdin.isTTY && process.stdin.setRawMode) process.stdin.setRawMode(true);
    process.stdin.resume();
    printIntro('<stdio>', vfdIds, kubIds);
    const reader = { onData: (cb) => process.stdin.on('data', cb) };
    const writer = { write: (buf) => process.stdout.write(buf) };
    runBus(devices, reader, writer);
    return;
  }

  const term = startPty();
  const slavePath = term.pty || term._pty || '<unknown PTY>';
  printIntro(slavePath, vfdIds, kubIds);
  console.log(`Slave PTY created: ${slavePath}`);
  const reader = { onData: (cb) => term.on('data', cb) };
  const writer = { write: (buf) => term.write(buf) };
  runBus(devices, reader, writer);
}

main();
