const { ZodError } = require('zod');
const HttpError = require('../utils/HttpError');

function errorHandler(error, req, res, _next) {
  if (res.headersSent) {
    req.log?.error({ err: error }, 'error after response started');
    res.destroy(error);
    return;
  }

  let statusCode = 500;
  let message = 'Internal server error';
  let details;
  let headers;

  if (error instanceof HttpError) {
    statusCode = error.statusCode;
    message = error.message;
    details = error.details;
    headers = error.headers;
  } else if (error instanceof ZodError) {
    statusCode = 400;
    message = 'Invalid request';
    details = error.flatten();
  } else if (error.name === 'CastError') {
    statusCode = 400;
    message = `Invalid ${error.path}`;
  } else if (error.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation failed';
    details = Object.fromEntries(
      Object.entries(error.errors).map(([field, value]) => [field, value.message])
    );
  } else if (error.type === 'entity.parse.failed') {
    statusCode = 400;
    message = 'Malformed JSON body';
  }

  if (headers) {
    Object.entries(headers).forEach(([name, value]) => res.setHeader(name, value));
  }

  if (statusCode >= 500) {
    req.log?.error({ err: error }, 'request failed');
  }

  res.status(statusCode).json({
    error: message,
    statusCode,
    ...(details ? { details } : {}),
    requestId: req.id,
    instance: require('../config').instanceId,
  });
}

module.exports = errorHandler;
