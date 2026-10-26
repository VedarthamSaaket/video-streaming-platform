const pino = require('pino');
const request = require('supertest');

const { createApp } = require('../../src/app');

let app;

beforeAll(() => {
  app = createApp({ logger: pino({ level: 'silent' }) });
});

describe('health endpoints without MongoDB', () => {
  test('liveness still succeeds', async () => {
    await request(app).get('/healthz').expect(200);
  });

  test('readiness fails with a 503', async () => {
    const res = await request(app).get('/readyz').expect(503);
    expect(res.body.status).toBe('not_ready');
    expect(res.body.checks.mongodb).toBe('down');
    expect(res.body.checks.storage).toBe('down');
  });

  test('detailed health reports degraded', async () => {
    const res = await request(app).get('/health').expect(200);
    expect(res.body.status).toBe('degraded');
    expect(res.body.checks.mongodb).toBe('disconnected');
  });

  test('metrics remain available', async () => {
    const res = await request(app).get('/metrics').expect(200);
    expect(res.text).toContain('streamvault_nodejs_');
  });
});
