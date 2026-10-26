const fs = require('fs');
const os = require('os');
const path = require('path');
const mongoose = require('mongoose');
const { GridFSBucket } = require('mongodb');
const { MongoMemoryServer } = require('mongodb-memory-server');

const { createStorage } = require('../../src/storage');
const { parseRange } = require('../../src/utils/range');

const PAYLOAD = Buffer.from(Array.from({ length: 8192 }, (_, index) => index % 251));

function collect(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(Buffer.concat(chunks)));
  });
}

let mongod;
let storage;
let sourceFile;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri(), { dbName: 'streamvault_storage_test' });
  storage = createStorage();
  sourceFile = path.join(os.tmpdir(), `streamvault-source-${Date.now()}.mp4`);
  await fs.promises.writeFile(sourceFile, PAYLOAD);
});

afterAll(async () => {
  await new GridFSBucket(mongoose.connection.db, { bucketName: 'media' }).drop().catch(() => {});
  await mongoose.disconnect();
  await mongod.stop();
  await fs.promises.rm(sourceFile, { force: true });
});

describe('GridFS storage driver', () => {
  test('stores a file and reports its size and content type', async () => {
    const result = await storage.putFile(sourceFile, 'clip-one.mp4', 'video/mp4');
    expect(result.size).toBe(PAYLOAD.length);

    const stat = await storage.stat('clip-one.mp4');
    expect(stat.size).toBe(PAYLOAD.length);
    expect(stat.contentType).toBe('video/mp4');
  });

  test('reads the whole object', async () => {
    const body = await collect(await storage.createReadStream('clip-one.mp4'));
    expect(Buffer.compare(body, PAYLOAD)).toBe(0);
  });

  test('reads an inclusive byte range', async () => {
    const range = parseRange('bytes=1000-1999', PAYLOAD.length);
    const body = await collect(await storage.createReadStream('clip-one.mp4', range));
    expect(body).toHaveLength(1000);
    expect(Buffer.compare(body, PAYLOAD.subarray(1000, 2000))).toBe(0);
  });

  test('reads the last byte of an object', async () => {
    const range = parseRange('bytes=-1', PAYLOAD.length);
    const body = await collect(await storage.createReadStream('clip-one.mp4', range));
    expect(body).toEqual(PAYLOAD.subarray(PAYLOAD.length - 1));
  });

  test('deletes the object', async () => {
    await storage.delete('clip-one.mp4');
    await expect(storage.stat('clip-one.mp4')).rejects.toMatchObject({ code: 'ENOENT' });
  });

  test('health check succeeds against the database', async () => {
    await expect(storage.healthCheck()).resolves.toBe(true);
  });
});
