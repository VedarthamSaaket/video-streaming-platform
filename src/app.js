const path = require('path');
const fs = require('fs');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const pinoHttp = require('pino-http');

const config = require('./config');
const { createLogger } = require('./utils/logger');
const requestContext = require('./middleware/requestContext');
const healthRoutes = require('./routes/health');
const videoRoutes = require('./routes/videos');
const statsRoutes = require('./routes/stats');
const metrics = require('./metrics');
const notFound = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');

function createApp({ logger = createLogger() } = {}) {
  fs.mkdirSync(config.storage.uploadTmpDir, { recursive: true });

  const app = express();
  app.disable('x-powered-by');
  // NGINX is exactly one hop in front of the API. Trusting every proxy would
  // let a client spoof X-Forwarded-For and bypass the upload rate limiter.
  app.set('trust proxy', 1);

  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    })
  );
  app.use(cors());
  app.use(requestContext);
  app.use(
    pinoHttp({
      logger,
      genReqId: (req) => req.id,
      autoLogging: {
        ignore: (req) => ['/healthz', '/readyz', '/metrics'].includes(req.url),
      },
      customLogLevel: (_req, res, error) => {
        if (error || res.statusCode >= 500) return 'error';
        if (res.statusCode >= 400) return 'warn';
        return 'info';
      },
    })
  );
  app.use(metrics.metricsMiddleware);
  app.use(compression());
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: false }));

  app.use(healthRoutes);
  app.get('/metrics', metrics.metricsHandler);
  app.use('/api/videos', videoRoutes);
  app.use('/api', statsRoutes);

  app.use(express.static(path.join(__dirname, '..', 'public'), { maxAge: '1h' }));

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
