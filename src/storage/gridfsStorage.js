const fs = require('fs');
const fsp = require('fs/promises');
const mongoose = require('mongoose');
const { GridFSBucket } = require('mongodb');
const config = require('../config');

class GridFSStorage {
  constructor({ bucketName = config.storage.bucketName } = {}) {
    this.driver = 'gridfs';
    this.bucketName = bucketName;
  }

  _db() {
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('MongoDB is not connected');
    }
    return db;
  }

  _bucket() {
    return new GridFSBucket(this._db(), { bucketName: this.bucketName });
  }

  get _filesCollection() {
    return this._db().collection(`${this.bucketName}.files`);
  }

  async ensureReady() {
    this._db();
  }

  async putFile(sourcePath, key, contentType) {
    this._db();
    const stats = await fsp.stat(sourcePath);
    await new Promise((resolve, reject) => {
      const upload = this._bucket().openUploadStream(key, {
        contentType: contentType || 'application/octet-stream',
      });
      const source = fs.createReadStream(sourcePath);
      source.on('error', reject);
      upload.on('error', reject);
      upload.on('finish', resolve);
      source.pipe(upload);
    });
    return { key, size: stats.size };
  }

  async stat(key) {
    const file = await this._filesCollection.findOne({ filename: key });
    if (!file) {
      const error = new Error(`file not found: ${key}`);
      error.code = 'ENOENT';
      throw error;
    }
    return { size: file.length, contentType: file.contentType };
  }

  async createReadStream(key, range) {
    const options = range
      ? { start: range.start, end: range.end + 1 }
      : {};
    return this._bucket().openDownloadStreamByName(key, options);
  }

  async delete(key) {
    const file = await this._filesCollection.findOne({ filename: key });
    if (file) {
      await this._bucket().delete(file._id);
    }
  }

  async healthCheck() {
    await this._db().command({ ping: 1 });
    return true;
  }

  async drop() {
    await this._bucket().drop().catch(() => {});
  }
}

module.exports = GridFSStorage;
