/* eslint-disable no-console */
const { setTimeout: wait } = require('timers/promises');
const WebSocket = require('ws');

const HEALTH_URL = process.env.HEALTH_URL || 'http://localhost:8090/health';
const WS_URL = process.env.WS_URL || 'ws://localhost:8000';

async function checkHealth() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(HEALTH_URL, { signal: controller.signal });
    if (!res.ok) throw new Error(`Health endpoint returned ${res.status}`);
    const payload = await res.json();
    if (!payload || payload.status === 'unhealthy' || payload.status === 'error') {
      throw new Error('Health status is not healthy');
    }
    return payload;
  } finally {
    clearTimeout(timer);
  }
}

async function checkWebSocket() {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(WS_URL);
    const timer = setTimeout(() => {
      socket.terminate();
      reject(new Error('WebSocket timeout'));
    }, 5000);

    socket.on('open', () => {
      setTimeout(() => {
        clearTimeout(timer);
        socket.close();
        resolve('open');
      }, 500);
    });

    socket.on('message', (msg) => {
      clearTimeout(timer);
      socket.close();
      resolve(msg.toString());
    });

    socket.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

async function main() {
  try {
    await wait(2000);
    await checkHealth();
    await checkWebSocket();
    console.log('✅ Backend + Dashboard fullstack check passed');
    process.exit(0);
  } catch (err) {
    console.error(`❌ Fullstack check failed: ${err.message}`);
    process.exit(1);
  }
}

main();
