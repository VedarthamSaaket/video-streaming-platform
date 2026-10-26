const express = require('express');
const rateLimit = require('express-rate-limit');
const { uploadMiddleware } = require('../middleware/upload');
const controller = require('../controllers/videoController');
const config = require('../config');

const router = express.Router();

const uploadLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  limit: config.rateLimit.max,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many uploads, try again later', statusCode: 429 },
});

router.get('/', controller.listVideos);
router.post('/', uploadLimiter, uploadMiddleware, controller.createVideo);
router.get('/:id', controller.getVideo);
router.patch('/:id', controller.updateVideo);
router.delete('/:id', controller.deleteVideo);
router.get('/:id/stream', controller.streamVideoHandler);
router.get('/:id/download', controller.downloadVideoHandler);

module.exports = router;
