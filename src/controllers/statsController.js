const Video = require('../models/Video');
const config = require('../config');
const asyncHandler = require('../utils/asyncHandler');

const stats = asyncHandler(async (_req, res) => {
  const [videos, aggregate] = await Promise.all([
    Video.countDocuments(),
    Video.aggregate([
      {
        $group: {
          _id: null,
          totalBytes: { $sum: '$sizeBytes' },
          totalViews: { $sum: '$views' },
        },
      },
    ]),
  ]);

  const totals = aggregate[0] || { totalBytes: 0, totalViews: 0 };
  res.json({
    videoCount: videos,
    totalBytes: totals.totalBytes,
    totalViews: totals.totalViews,
    instance: config.instanceId,
    uptimeSeconds: Math.round(process.uptime()),
  });
});

module.exports = { stats };
