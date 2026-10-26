const os = require('os');
const path = require('path');

require('dotenv').config();

function int(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

const config = {
  env: process.env.NODE_ENV || 'development',
  port: int(process.env.PORT, 3000),
  instanceId: process.env.INSTANCE_ID || process.env.HOSTNAME || os.hostname(),
  logLevel: process.env.LOG_LEVEL || 'info',
  mongo: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/streamvault',
    dbName: process.env.MONGODB_DB || 'streamvault',
    serverSelectionTimeoutMs: int(process.env.MONGO_TIMEOUT_MS, 5000),
  },
  storage: {
    bucketName: process.env.MEDIA_BUCKET || 'media',
    uploadTmpDir: process.env.UPLOAD_TMP_DIR || path.join(os.tmpdir(), 'streamvault-uploads'),
    maxUploadBytes: int(process.env.MAX_UPLOAD_BYTES, 200 * 1024 * 1024),
  },
  rateLimit: {
    windowMs: int(process.env.UPLOAD_RATE_WINDOW_MS, 15 * 60 * 1000),
    max: int(process.env.UPLOAD_RATE_MAX, 60),
  },
  version: process.env.APP_VERSION || '1.0.0',
};

module.exports = config;
