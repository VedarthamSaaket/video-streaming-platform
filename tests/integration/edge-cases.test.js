const mongoose = require('mongoose');
const pino = require('pino');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');

const { createApp } = require('../../src/app');
const Video = require('../../src/models/Video');

const SMALL_VIDEO = Buffer.from('0123456789abcdef');

function binaryParser(res, callback) {
  res.setEncoding('binary');
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => callback(null, Buffer.from(data, 'binary')));
}

function upload(app, options = {}) {
  return request(app)
    .post('/api/videos')
    .field('title', options.title ?? 'Edge case clip')
    .attach('file', options.buffer ?? SMALL_VIDEO, {
      filename: options.filename ?? 'edge.mp4',
      contentType: options.contentType ?? 'video/mp4',
    });
}

let mongod;
let app;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri(), { dbName: 'streamvault_edge_test' });
  await Video.init();
  app = createApp({ logger: pino({ level: 'silent' }) });
});

afterAll(async () => {
  await mongoose.connection.db.dropDatabase();
  await mongoose.disconnect();
  await mongod.stop();
});

beforeEach(async () => {
  await Video.deleteMany({});
  await mongoose.connection.db.collection('media.files').deleteMany({});
  await mongoose.connection.db.collection('media.chunks').deleteMany({});
});

describe('upload edge cases', () => {
  test('accepts an empty file and streams it back empty', async () => {
    const created = await upload(app, { buffer: Buffer.alloc(0) }).expect(201);
    expect(created.body.sizeBytes).toBe(0);

    const res = await request(app)
      .get(`/api/videos/${created.body.id}/stream`)
      .buffer(true)
      .parse(binaryParser)
      .expect(200);
    expect(res.headers['content-length']).toBe('0');
    expect(res.body).toHaveLength(0);
  });

  test('rejects a range on an empty file', async () => {
    const created = await upload(app, { buffer: Buffer.alloc(0) }).expect(201);
    await request(app)
      .get(`/api/videos/${created.body.id}/stream`)
      .set('Range', 'bytes=0-0')
      .expect(416);
  });

  test('rejects a file larger than the configured limit', async () => {
    const tooLarge = Buffer.alloc(1024 * 1024 + 16, 1);
    await upload(app, { buffer: tooLarge }).expect(413);
    expect(await Video.countDocuments()).toBe(0);
  });

  test('cleans up the GridFS file when validation fails', async () => {
    await request(app)
      .post('/api/videos')
      .field('title', 'x'.repeat(201))
      .attach('file', SMALL_VIDEO, { filename: 'x.mp4', contentType: 'video/mp4' })
      .expect(400);
    const files = await mongoose.connection.db.collection('media.files').countDocuments();
    expect(files).toBe(0);
  });

  test('supports a one byte range', async () => {
    const created = await upload(app).expect(201);
    const res = await request(app)
      .get(`/api/videos/${created.body.id}/stream`)
      .set('Range', 'bytes=0-0')
      .buffer(true)
      .parse(binaryParser)
      .expect(206);
    expect(res.body).toEqual(Buffer.from('0'));
  });

  test('supports a one byte suffix range', async () => {
    const created = await upload(app).expect(201);
    const res = await request(app)
      .get(`/api/videos/${created.body.id}/stream`)
      .set('Range', 'bytes=-1')
      .buffer(true)
      .parse(binaryParser)
      .expect(206);
    expect(res.body).toEqual(Buffer.from('f'));
  });

  test('rejects multiple ranges', async () => {
    const created = await upload(app).expect(201);
    await request(app)
      .get(`/api/videos/${created.body.id}/stream`)
      .set('Range', 'bytes=0-1,4-5')
      .expect(416);
  });

  test('answers HEAD requests with headers and no body', async () => {
    const created = await upload(app).expect(201);
    const res = await request(app).head(`/api/videos/${created.body.id}/stream`).expect(200);
    expect(res.headers['accept-ranges']).toBe('bytes');
    expect(res.headers['content-length']).toBe(String(SMALL_VIDEO.length));
  });

  test('encodes unicode filenames in Content-Disposition', async () => {
    const created = await upload(app, { filename: 'naïve clip.mp4' }).expect(201);
    const res = await request(app)
      .get(`/api/videos/${created.body.id}/download`)
      .expect(200);
    expect(res.headers['content-disposition']).toContain(
      "filename*=UTF-8''na%C3%AFve%20clip.mp4"
    );
  });
});

describe('metadata edge cases', () => {
  test('rejects a too long title on update', async () => {
    const created = await upload(app).expect(201);
    await request(app)
      .patch(`/api/videos/${created.body.id}`)
      .send({ title: 'y'.repeat(201) })
      .expect(400);
  });

  test('updates the uploader', async () => {
    const created = await upload(app).expect(201);
    const res = await request(app)
      .patch(`/api/videos/${created.body.id}`)
      .send({ uploadedBy: 'Nandini' })
      .expect(200);
    expect(res.body.uploadedBy).toBe('Nandini');
  });

  test('deleting twice returns 404', async () => {
    const created = await upload(app).expect(201);
    await request(app).delete(`/api/videos/${created.body.id}`).expect(204);
    await request(app).delete(`/api/videos/${created.body.id}`).expect(404);
  });

  test('returns an empty search result', async () => {
    await upload(app).expect(201);
    const res = await request(app).get('/api/videos?search=zzzzz').expect(200);
    expect(res.body.total).toBe(0);
    expect(res.body.items).toEqual([]);
  });

  test('rejects a zero limit', async () => {
    await request(app).get('/api/videos?limit=0').expect(400);
  });

  test('returns instance and request id on a 404 route', async () => {
    const res = await request(app).get('/api/missing').expect(404);
    expect(res.body.requestId).toBeTruthy();
    expect(res.body.instance).toBeTruthy();
  });
});

describe('metrics edge cases', () => {
  test('counts successful uploads and stream requests', async () => {
    const created = await upload(app).expect(201);
    await request(app)
      .get(`/api/videos/${created.body.id}/stream`)
      .buffer(true)
      .parse(binaryParser)
      .expect(200);

    const metrics = await request(app).get('/metrics').expect(200);
    expect(metrics.text).toMatch(/streamvault_video_uploads_total\{status="success"\} \d+/);
    expect(metrics.text).toMatch(/streamvault_stream_requests_total\{range="no"\} \d+/);
  });
});
