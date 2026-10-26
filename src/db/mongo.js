const mongoose = require('mongoose');
const config = require('../config');
const { createLogger } = require('../utils/logger');

const logger = createLogger({ name: 'mongo' });

async function connectToMongo(options = {}) {
  const { retries = 0, retryDelayMs = 3000 } = options;
  mongoose.set('strictQuery', true);

  for (let attempt = 0; ; attempt += 1) {
    try {
      await mongoose.connect(config.mongo.uri, {
        dbName: config.mongo.dbName,
        serverSelectionTimeoutMS: config.mongo.serverSelectionTimeoutMs,
        maxPoolSize: 20,
      });
      logger.info({ db: config.mongo.dbName }, 'connected to MongoDB');
      return mongoose.connection;
    } catch (error) {
      logger.error({ err: error.message, attempt: attempt + 1 }, 'MongoDB connection failed');
      if (attempt >= retries) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
    }
  }
}

async function disconnectFromMongo() {
  await mongoose.disconnect();
  logger.info('disconnected from MongoDB');
}

function mongoState() {
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  return states[mongoose.connection.readyState] || 'unknown';
}

function isMongoReady() {
  return mongoose.connection.readyState === 1;
}

module.exports = { connectToMongo, disconnectFromMongo, mongoState, isMongoReady };
