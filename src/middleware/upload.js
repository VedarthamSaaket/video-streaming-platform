const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const config = require('../config');
const HttpError = require('../utils/HttpError');

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, config.storage.uploadTmpDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).slice(0, 12);
    cb(null, `${Date.now()}-${crypto.randomUUID()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: config.storage.maxUploadBytes,
    files: 1,
  },
  fileFilter: (_req, file, cb) => {
    const allowed = /^(video\/|application\/octet-stream)/.test(file.mimetype);
    if (!allowed) {
      cb(new HttpError(415, 'Only video files can be uploaded'));
      return;
    }
    cb(null, true);
  },
});

const uploadSingleVideo = upload.single('file');

function uploadMiddleware(req, res, next) {
  uploadSingleVideo(req, res, (error) => {
    if (!error) {
      next();
      return;
    }
    if (error instanceof multer.MulterError) {
      const status = error.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
      next(new HttpError(status, error.message));
      return;
    }
    next(error);
  });
}

module.exports = { uploadMiddleware };
