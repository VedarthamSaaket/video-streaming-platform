const mongoose = require('mongoose');

const videoSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: '',
    },
    storageKey: {
      type: String,
      required: true,
      unique: true,
    },
    originalName: {
      type: String,
      required: true,
    },
    mimeType: {
      type: String,
      required: true,
      default: 'video/mp4',
    },
    sizeBytes: {
      type: Number,
      required: true,
      min: 0,
    },
    uploadedBy: {
      type: String,
      trim: true,
      maxlength: 100,
      default: 'anonymous',
    },
    views: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.storageKey;
        return ret;
      },
    },
  }
);

videoSchema.index({ createdAt: -1 });
videoSchema.index({ title: 'text', description: 'text' });

videoSchema.statics.findRecent = function findRecent(limit = 20) {
  return this.find().sort({ createdAt: -1 }).limit(limit);
};

module.exports = mongoose.model('Video', videoSchema);
