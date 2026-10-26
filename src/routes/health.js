const express = require('express');
const config = require('../config');
const { isMongoReady, mongoState } = require('../db/mongo');
const { getStorage } = require('../storage');

const router = express.Router();

router.get('/healthz', (_req, res) => {
  res.json({
    status: 'ok',
    instance: config.instanceId,
    uptimeSeconds: Math.round(process.uptime()),
  });
});

router.get('/readyz', async (_req, res) => {
  const checks = { mongodb: 'down', storage: 'down' };
  let ready = true;

  if (isMongoReady()) {
    checks.mongodb = 'up';
  } else {
    ready = false;
  }

  try {
    await getStorage().healthCheck();
    checks.storage = 'up';
  } catch {
    ready = false;
  }

  res.status(ready ? 200 : 503).json({
    status: ready ? 'ready' : 'not_ready',
    instance: config.instanceId,
    checks,
  });
});

router.get('/health', async (_req, res) => {
  const checks = { mongodb: mongoState(), storage: 'unknown' };
  try {
    await getStorage().healthCheck();
    checks.storage = 'up';
  } catch {
    checks.storage = 'down';
  }
  res.json({
    status: isMongoReady() ? 'ok' : 'degraded',
    version: config.version,
    instance: config.instanceId,
    uptimeSeconds: Math.round(process.uptime()),
    memory: process.memoryUsage(),
    checks,
  });
});

module.exports = router;
