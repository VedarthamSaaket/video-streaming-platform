const fs = require('fs');
const mongoose = require('mongoose');
const pino = require('pino');
const request = require('supertest');
const { GridFSBucket } = require('mongodb');
const { MongoMemoryServer } = require('mongodb-memory-server');

const { createApp } = require('../../src/app');
const Video = require('../../src/models/Video');

const VIDEO_BYTES = Buffer.from(
  Array.from({ length: 4096 }, (_, index) => index % 256)
);

function binaryParser(res, callback) {
  res.setEncoding('binary');
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => callback(null, Buffer.from(data, 'binary')));
}

function uploadVideo(app, overrides = {}) {
  return request(app)
    .post('/api/videos')
    .field('title', overrides.title ?? 'Demo clip')
    .field('description', overrides.description ?? 'A short demo clip')
    .field('uploadedBy', overrides.uploadedBy ?? 'jest')
    .attach('file', VIDEO_BYTES, {
      filename: overrides.filename ?? 'demo.mp4',
      contentType: overrides.contentType ?? 'video/mp4',
    });
}

let mongod;
let app;
let mediaBucket;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri(), { dbName: 'streamvault_test' });
  await Video.init();
  mediaBucket = new GridFSBucket(mongoose.connection.db, { bucketName: 'media' });
  app = createApp({ logger: pino({ level: 'silent' }) });
});

afterAll(async () => {
  await mediaBucket.drop().catch(() => {});
  await mongoose.disconnect();
  await mongod.stop();
  fs.rmSync(process.env.UPLOAD_TMP_DIR, { recursive: true, force: true });
});

beforeEach(async () => {
  await Video.deleteMany({});
  await mediaBucket.drop().catch(() => {});
});

describe('health endpoints', () => {
  test('GET /healthz reports the instance', async () => {
    const res = await request(app).get('/healthz').expect(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.instance).toBeTruthy();
    expect(res.headers['x-served-by']).toBeTruthy();
  });

  test('GET /readyz reports mongo and storage as up', async () => {
    const res = await request(app).get('/readyz').expect(200);
    expect(res.body.checks).toEqual({ mongodb: 'up', storage: 'up' });
  });

  test('GET /metrics exposes Prometheus metrics', async () => {
    const res = await request(app).get('/metrics').expect(200);
    expect(res.text).toContain('streamvault_http_request_duration_seconds');
    expect(res.text).toContain('streamvault_active_streams');
  });
});

describe('video API', () => {
  test('uploads a video and hides the storage key', async () => {
    const res = await uploadVideo(app).expect(201);
    expect(res.body.title).toBe('Demo clip');
    expect(res.body.sizeBytes).toBe(VIDEO_BYTES.length);
    expect(res.body.mimeType).toBe('video/mp4');
    expect(res.body.id).toBeTruthy();
    expect(res.body.storageKey).toBeUndefined();
    expect(res.body.views).toBe(0);
  });

  test('rejects an upload without a file', async () => {
    const res = await request(app).post('/api/videos').field('title', 'No file').expect(400);
    expect(res.body.error).toMatch(/file is required/);
  });

  test('rejects a non-video file', async () => {
    await request(app)
      .post('/api/videos')
      .field('title', 'Text file')
      .attach('file', Buffer.from('hello'), { filename: 'notes.txt', contentType: 'text/plain' })
      .expect(415);
  });

  test('rejects a missing title', async () => {
    await request(app)
      .post('/api/videos')
      .attach('file', VIDEO_BYTES, { filename: 'demo.mp4', contentType: 'video/mp4' })
      .expect(400);
  });

  test('lists uploaded videos newest first', async () => {
    await uploadVideo(app, { title: 'First' });
    await uploadVideo(app, { title: 'Second' });
    const res = await request(app).get('/api/videos').expect(200);
    expect(res.body.total).toBe(2);
    expect(res.body.items.map((video) => video.title)).toEqual(['Second', 'First']);
  });

  test('paginates the list', async () => {
    await uploadVideo(app, { title: 'One' });
    await uploadVideo(app, { title: 'Two' });
    await uploadVideo(app, { title: 'Three' });
    const res = await request(app).get('/api/videos?page=2&limit=1').expect(200);
    expect(res.body.pages).toBe(3);
    expect(res.body.items).toHaveLength(1);
  });

  test('searches by text', async () => {
    await uploadVideo(app, { title: 'Kubernetes autoscaling demo' });
    await uploadVideo(app, { title: 'Cooking show' });
    const res = await request(app).get('/api/videos?search=autoscaling').expect(200);
    expect(res.body.total).toBe(1);
    expect(res.body.items[0].title).toMatch(/autoscaling/);
  });

  test('gets one video by id', async () => {
    const created = await uploadVideo(app).expect(201);
    const res = await request(app).get(`/api/videos/${created.body.id}`).expect(200);
    expect(res.body.id).toBe(created.body.id);
  });

  test('returns 404 for an unknown video', async () => {
    await request(app).get(`/api/videos/${new mongoose.Types.ObjectId()}`).expect(404);
  });

  test('returns 400 for a malformed id', async () => {
    await request(app).get('/api/videos/not-an-id').expect(400);
  });

  test('streams the whole file with 200', async () => {
    const created = await uploadVideo(app).expect(201);
    const res = await request(app)
      .get(`/api/videos/${created.body.id}/stream`)
      .buffer(true)
      .parse(binaryParser)
      .expect(200);

    expect(res.headers['accept-ranges']).toBe('bytes');
    expect(res.headers['content-type']).toBe('video/mp4');
    expect(res.headers['content-length']).toBe(String(VIDEO_BYTES.length));
    expect(Buffer.compare(res.body, VIDEO_BYTES)).toBe(0);
  });

  test('serves a byte range with 206 and Content-Range', async () => {
    const created = await uploadVideo(app).expect(201);
    const res = await request(app)
      .get(`/api/videos/${created.body.id}/stream`)
      .set('Range', 'bytes=100-199')
      .buffer(true)
      .parse(binaryParser)
      .expect(206);

    expect(res.headers['content-range']).toBe(`bytes 100-199/${VIDEO_BYTES.length}`);
    expect(res.headers['content-length']).toBe('100');
    expect(Buffer.compare(res.body, VIDEO_BYTES.subarray(100, 200))).toBe(0);
  });

  test('serves a suffix range', async () => {
    const created = await uploadVideo(app).expect(201);
    const res = await request(app)
      .get(`/api/videos/${created.body.id}/stream`)
      .set('Range', 'bytes=-64')
      .buffer(true)
      .parse(binaryParser)
      .expect(206);

    expect(res.body).toHaveLength(64);
    expect(Buffer.compare(res.body, VIDEO_BYTES.subarray(VIDEO_BYTES.length - 64))).toBe(0);
  });

  test('returns 416 for an unsatisfiable range', async () => {
    const created = await uploadVideo(app).expect(201);
    const res = await request(app)
      .get(`/api/videos/${created.body.id}/stream`)
      .set('Range', `bytes=${VIDEO_BYTES.length}-`)
      .expect(416);
    expect(res.headers['content-range']).toBe(`bytes */${VIDEO_BYTES.length}`);
  });

  test('increments the view counter when streamed', async () => {
    const created = await uploadVideo(app).expect(201);
    await request(app)
      .get(`/api/videos/${created.body.id}/stream`)
      .buffer(true)
      .parse(binaryParser)
      .expect(200);
    const res = await request(app).get(`/api/videos/${created.body.id}`).expect(200);
    expect(res.body.views).toBe(1);
  });

  test('downloads as an attachment', async () => {
    const created = await uploadVideo(app).expect(201);
    const res = await request(app)
      .get(`/api/videos/${created.body.id}/download`)
      .expect(200);
    expect(res.headers['content-disposition']).toMatch(/^attachment/);
  });

  test('updates metadata', async () => {
    const created = await uploadVideo(app).expect(201);
    const res = await request(app)
      .patch(`/api/videos/${created.body.id}`)
      .send({ title: 'Renamed', description: 'New description' })
      .expect(200);
    expect(res.body.title).toBe('Renamed');
    expect(res.body.description).toBe('New description');
  });

  test('rejects an empty update', async () => {
    const created = await uploadVideo(app).expect(201);
    await request(app).patch(`/api/videos/${created.body.id}`).send({}).expect(400);
  });

  test('deletes a video and its GridFS file', async () => {
    const created = await uploadVideo(app).expect(201);
    await request(app).delete(`/api/videos/${created.body.id}`).expect(204);
    await request(app).get(`/api/videos/${created.body.id}`).expect(404);
    const remaining = await mongoose.connection.db
      .collection('media.files')
      .countDocuments();
    expect(remaining).toBe(0);
  });
});

describe('stats and fallbacks', () => {
  test('GET /api/stats summarises the library', async () => {
    await uploadVideo(app);
    await uploadVideo(app);
    const res = await request(app).get('/api/stats').expect(200);
    expect(res.body.videoCount).toBe(2);
    expect(res.body.totalBytes).toBe(VIDEO_BYTES.length * 2);
  });

  test('unknown routes return a JSON 404', async () => {
    const res = await request(app).get('/api/nope').expect(404);
    expect(res.body.error).toMatch(/not found/);
  });

  test('malformed JSON returns 400', async () => {
    const res = await request(app)
      .post('/api/videos')
      .set('Content-Type', 'application/json')
      .send('{"title":')
      .expect(400);
    expect(res.body.error).toMatch(/Malformed JSON/);
  });
});
