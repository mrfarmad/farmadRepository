const fastify = require('fastify');

function startHealthApi({ port, registry, scheduler }) {
  const app = fastify();

  app.get('/health', async () => ({ status: 'ok' }));
  app.get('/devices', async () => registry.list());
  app.get('/scheduler', async () => ({ running: Boolean(scheduler?.timer), interval: scheduler?.intervalMs }));

  const start = async () => {
    await app.listen({ port, host: '0.0.0.0' });
    console.log(`💓 Health API listening on ${port}`);
  };

  const stop = async () => {
    try {
      await app.close();
    } catch (err) {
      console.error('Health API shutdown error', err);
    }
  };

  start();
  return { stop };
}

module.exports = { startHealthApi };
