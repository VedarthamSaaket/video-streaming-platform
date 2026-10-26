const pino = require('pino');
const config = require('../config');

function createLogger(options = {}) {
  return pino({
    level: process.env.LOG_LEVEL || config.logLevel,
    base: { service: 'streamvault', instance: config.instanceId },
    timestamp: pino.stdTimeFunctions.isoTime,
    ...options,
  });
}

module.exports = { createLogger };
