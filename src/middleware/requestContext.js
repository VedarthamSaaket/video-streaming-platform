const crypto = require('crypto');
const config = require('../config');

function requestContext(req, res, next) {
  req.id = req.headers['x-request-id'] || crypto.randomUUID();
  req.startTime = process.hrtime.bigint();
  res.setHeader('X-Request-Id', req.id);
  res.setHeader('X-Served-By', config.instanceId);
  next();
}

module.exports = requestContext;
