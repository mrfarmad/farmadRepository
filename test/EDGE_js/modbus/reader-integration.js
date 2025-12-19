const { UniversalReader } = require('./universal-reader');

async function initializeReader({ port, baudRate, timeout }) {
  const reader = new UniversalReader({ port, baudRate, timeout });
  return {
    async start() {
      await reader.start();
      return true;
    },
    async stop() {
      await reader.stop();
    },
  };
}

module.exports = { initializeReader };
