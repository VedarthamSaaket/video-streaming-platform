const HttpError = require('./HttpError');

function unsatisfiable(size) {
  return new HttpError(416, 'Requested range not satisfiable', {
    headers: { 'Content-Range': `bytes */${size}` },
  });
}

/**
 * Parses a single HTTP Range header against a known object size.
 * Returns null when the client asked for the whole object.
 */
function parseRange(header, size) {
  if (!Number.isInteger(size) || size < 0) {
    throw new TypeError('size must be a non-negative integer');
  }
  if (header === undefined || header === null || header === '') {
    return null;
  }
  if (size === 0) {
    throw unsatisfiable(0);
  }
  if (typeof header !== 'string') {
    throw new HttpError(400, 'Range header must be a string');
  }

  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!match || (match[1] === '' && match[2] === '')) {
    throw unsatisfiable(size);
  }

  const [, startRaw, endRaw] = match;
  let start;
  let end;

  if (startRaw === '') {
    const suffixLength = Number.parseInt(endRaw, 10);
    if (!Number.isFinite(suffixLength) || suffixLength === 0) {
      throw unsatisfiable(size);
    }
    start = Math.max(size - suffixLength, 0);
    end = size - 1;
  } else {
    start = Number.parseInt(startRaw, 10);
    end = endRaw === '' ? size - 1 : Number.parseInt(endRaw, 10);
    if (!Number.isFinite(start) || !Number.isFinite(end) || start > end) {
      throw unsatisfiable(size);
    }
    if (start >= size) {
      throw unsatisfiable(size);
    }
    end = Math.min(end, size - 1);
  }

  return { start, end, length: end - start + 1 };
}

module.exports = { parseRange };
