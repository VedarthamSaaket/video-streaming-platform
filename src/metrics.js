const client = require('prom-client');

client.collectDefaultMetrics({ prefix: 'streamvault_' });

const httpRequestDuration = new client.Histogram({
  name: 'streamvault_http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
});

const uploadsTotal = new client.Counter({
  name: 'streamvault_video_uploads_total',
  help: 'Total number of uploaded videos',
  labelNames: ['status'],
});

const streamRequestsTotal = new client.Counter({
  name: 'streamvault_stream_requests_total',
  help: 'Total number of stream requests',
  labelNames: ['range'],
});

const bytesStreamedTotal = new client.Counter({
  name: 'streamvault_bytes_streamed_total',
  help: 'Total bytes streamed to clients',
});

const activeStreams = new client.Gauge({
  name: 'streamvault_active_streams',
  help: 'Number of streams currently in flight',
});

const storageErrorsTotal = new client.Counter({
  name: 'streamvault_storage_errors_total',
  help: 'Storage backend errors',
  labelNames: ['operation'],
});

function metricsMiddleware(req, res, next) {
  const end = httpRequestDuration.startTimer();
  res.on('finish', () => {
    const route = req.route ? `${req.baseUrl}${req.route.path}` : 'unmatched';
    end({ method: req.method, route, status: res.statusCode });
  });
  next();
}

async function metricsHandler(_req, res) {
  res.setHeader('Content-Type', client.register.contentType);
  res.send(await client.register.metrics());
}

module.exports = {
  client,
  uploadsTotal,
  streamRequestsTotal,
  bytesStreamedTotal,
  activeStreams,
  storageErrorsTotal,
  metricsMiddleware,
  metricsHandler,
};
