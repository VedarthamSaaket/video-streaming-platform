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

// Busboy decodes multipart filenames as latin1. Recover UTF-8 names while
// leaving plain ASCII and genuine latin1 names untouched.
function normalizeFilename(name) {
  if (!name) return name;
  const decoded = Buffer.from(name, 'latin1').toString('utf8');
  return decoded.includes('\uFFFD') ? name : decoded;
}

function uploadMiddleware(req, res, next) {
  uploadSingleVideo(req, res, (error) => {
    if (error) {
      if (error instanceof multer.MulterError) {
        const status = error.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
        next(new HttpError(status, error.message));
        return;
      }
      next(error);
      return;
    }
    if (req.file) {
      req.file.originalname = normalizeFilename(req.file.originalname);
    }
    next();
  });
}

module.exports = { uploadMiddleware };
