const fs = require('fs');
const http = require('http');
const config = require('./config');
const { createLogger } = require('./utils/logger');
const { createApp } = require('./app');
const { connectToMongo, disconnectFromMongo } = require('./db/mongo');
const { getStorage } = require('./storage');

const logger = createLogger({ name: 'server' });

async function main() {
  fs.mkdirSync(config.storage.uploadTmpDir, { recursive: true });

  const app = createApp({ logger });
  const server = http.createServer(app);

  server.listen(config.port, '0.0.0.0', () => {
    logger.info(
      { port: config.port, env: config.env, storage: config.storage.driver, instance: config.instanceId },
      'StreamVault API listening'
    );
  });

  let shuttingDown = false;
  async function shutdown(signal) {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info({ signal }, 'shutting down');

    const forceExit = setTimeout(() => {
      logger.error('graceful shutdown timed out');
      process.exit(1);
    }, 25000);
    forceExit.unref();

    server.close(async (error) => {
      if (error) logger.error({ err: error }, 'error closing HTTP server');
      await disconnectFromMongo().catch(() => {});
      clearTimeout(forceExit);
      process.exit(error ? 1 : 0);
    });
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('unhandledRejection', (reason) => {
    logger.error({ err: reason }, 'unhandled rejection');
  });

  try {
    await getStorage().ensureReady?.();
  } catch (error) {
    logger.warn({ err: error.message }, 'storage is not ready yet');
  }

  connectToMongo({ retries: Infinity, retryDelayMs: 3000 }).catch((error) => {
    logger.error({ err: error }, 'unable to connect to MongoDB');
  });
}

main().catch((error) => {
  logger.error({ err: error }, 'fatal startup error');
  process.exit(1);
});
