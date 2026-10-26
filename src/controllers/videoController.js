const crypto = require('crypto');
const fsp = require('fs/promises');
const path = require('path');
const Video = require('../models/Video');
const { getStorage } = require('../storage');
const { parseRange } = require('../utils/range');
const { createVideoSchema, updateVideoSchema, listQuerySchema, parse } = require('../utils/validation');
const asyncHandler = require('../utils/asyncHandler');
const HttpError = require('../utils/HttpError');
const metrics = require('../metrics');

function extensionFor(file) {
  const fromName = path.extname(file.originalname).toLowerCase();
  if (fromName && fromName.length <= 12) return fromName;
  const subtypes = {
    'video/mp4': '.mp4',
    'video/webm': '.webm',
    'video/quicktime': '.mov',
    'video/x-matroska': '.mkv',
    'video/ogg': '.ogv',
  };
  return subtypes[file.mimetype] || '.bin';
}

async function safeUnlink(filePath) {
  if (!filePath) return;
  await fsp.rm(filePath, { force: true }).catch(() => {});
}

const listVideos = asyncHandler(async (req, res) => {
  const parsed = parse(listQuerySchema, req.query);
  if (!parsed.ok) {
    throw new HttpError(400, 'Invalid query parameters', { details: parsed.error });
  }
  const { page, limit, search } = parsed.data;
  const filter = search ? { $text: { $search: search } } : {};

  const [items, total] = await Promise.all([
    Video.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Video.countDocuments(filter),
  ]);

  res.json({
    items: items.map((item) => item.toJSON()),
    page,
    limit,
    total,
    pages: Math.max(Math.ceil(total / limit), 1),
  });
});

const getVideo = asyncHandler(async (req, res) => {
  const video = await Video.findById(req.params.id);
  if (!video) throw new HttpError(404, 'Video not found');
  res.json(video.toJSON());
});

const createVideo = asyncHandler(async (req, res) => {
  const parsed = parse(createVideoSchema, req.body);
  if (!parsed.ok) {
    await safeUnlink(req.file?.path);
    throw new HttpError(400, 'Invalid request body', { details: parsed.error });
  }
  if (!req.file) {
    throw new HttpError(400, 'A video file is required in the "file" field');
  }

  const storage = getStorage();
  const key = `${Date.now()}-${crypto.randomUUID()}${extensionFor(req.file)}`;
  let stored;

  try {
    stored = await storage.putFile(req.file.path, key, req.file.mimetype);
    const video = await Video.create({
      ...parsed.data,
      storageKey: key,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      sizeBytes: stored.size,
    });
    metrics.uploadsTotal.inc({ status: 'success' });
    res.status(201).json(video.toJSON());
  } catch (error) {
    metrics.uploadsTotal.inc({ status: 'error' });
    metrics.storageErrorsTotal.inc({ operation: 'put' });
    await storage.delete(key).catch(() => {});
    throw error;
  } finally {
    await safeUnlink(req.file.path);
  }
});

const updateVideo = asyncHandler(async (req, res) => {
  const parsed = parse(updateVideoSchema, req.body);
  if (!parsed.ok) {
    throw new HttpError(400, 'Invalid request body', { details: parsed.error });
  }
  const video = await Video.findByIdAndUpdate(req.params.id, parsed.data, {
    new: true,
    runValidators: true,
  });
  if (!video) throw new HttpError(404, 'Video not found');
  res.json(video.toJSON());
});

const deleteVideo = asyncHandler(async (req, res) => {
  const video = await Video.findById(req.params.id);
  if (!video) throw new HttpError(404, 'Video not found');

  await getStorage().delete(video.storageKey).catch((error) => {
    metrics.storageErrorsTotal.inc({ operation: 'delete' });
    req.log?.warn({ err: error.message, videoId: video.id }, 'storage delete failed');
  });
  await video.deleteOne();
  res.status(204).end();
});

function setStreamHeaders(res, video, size, range) {
  res.setHeader('Accept-Ranges', 'bytes');
  res.setHeader('Content-Type', video.mimeType || 'application/octet-stream');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.setHeader(
    'Content-Disposition',
    `inline; filename*=UTF-8''${encodeURIComponent(video.originalName)}`
  );
  res.setHeader('X-Video-Id', video.id);
  if (range) {
    res.status(206);
    res.setHeader('Content-Range', `bytes ${range.start}-${range.end}/${size}`);
    res.setHeader('Content-Length', range.length);
  } else {
    res.status(200);
    res.setHeader('Content-Length', size);
  }
}

async function streamVideo(req, res, next, { download = false } = {}) {
  const video = await Video.findById(req.params.id);
  if (!video) throw new HttpError(404, 'Video not found');

  const storage = getStorage();
  let stat;
  try {
    stat = await storage.stat(video.storageKey);
  } catch (error) {
    metrics.storageErrorsTotal.inc({ operation: 'stat' });
    if (error.$metadata?.httpStatusCode === 404 || error.code === 'ENOENT') {
      throw new HttpError(404, 'Video file is missing from storage');
    }
    throw error;
  }

  const range = parseRange(req.headers.range, stat.size);
  setStreamHeaders(res, video, stat.size, range);
  if (download) {
    res.setHeader(
      'Content-Disposition',
      `attachment; filename*=UTF-8''${encodeURIComponent(video.originalName)}`
    );
  }

  metrics.streamRequestsTotal.inc({ range: range ? 'yes' : 'no' });
  metrics.bytesStreamedTotal.inc(range ? range.length : stat.size);
  metrics.activeStreams.inc();
  Video.updateOne({ _id: video._id }, { $inc: { views: 1 } }).catch(() => {});

  let closed = false;
  res.on('close', () => {
    if (!closed) {
      closed = true;
      metrics.activeStreams.dec();
    }
  });

  let stream;
  try {
    stream = await storage.createReadStream(video.storageKey, range);
  } catch (error) {
    metrics.storageErrorsTotal.inc({ operation: 'get' });
    if (!closed) {
      closed = true;
      metrics.activeStreams.dec();
    }
    throw error;
  }

  stream.on('error', (error) => {
    req.log?.warn({ err: error.message, videoId: video.id }, 'stream failed');
    if (!res.headersSent) {
      next(error);
    } else {
      res.destroy(error);
    }
  });
  stream.pipe(res);
}

const streamVideoHandler = asyncHandler((req, res, next) => streamVideo(req, res, next));
const downloadVideoHandler = asyncHandler((req, res, next) =>
  streamVideo(req, res, next, { download: true })
);

module.exports = {
  listVideos,
  getVideo,
  createVideo,
  updateVideo,
  deleteVideo,
  streamVideoHandler,
  downloadVideoHandler,
};
