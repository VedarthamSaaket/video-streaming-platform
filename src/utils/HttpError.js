class HttpError extends Error {
  constructor(statusCode, message, options = {}) {
    super(message);
    this.name = 'HttpError';
    this.statusCode = statusCode;
    this.details = options.details;
    this.headers = options.headers;
    this.expose = statusCode < 500;
    Error.captureStackTrace?.(this, HttpError);
  }
}

module.exports = HttpError;
