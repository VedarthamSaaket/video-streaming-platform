const GridFSStorage = require('./gridfsStorage');

let instance = null;

function createStorage(options = {}) {
  return new GridFSStorage(options);
}

function getStorage() {
  if (!instance) {
    instance = createStorage();
  }
  return instance;
}

module.exports = { GridFSStorage, createStorage, getStorage };
