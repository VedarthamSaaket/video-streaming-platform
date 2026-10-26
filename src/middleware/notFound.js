const HttpError = require('../utils/HttpError');

function notFound(req, _res, next) {
  next(new HttpError(404, `Route ${req.method} ${req.originalUrl} not found`));
}

module.exports = notFound;
