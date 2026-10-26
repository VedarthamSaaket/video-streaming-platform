const requestContext = require('../../src/middleware/requestContext');

function mockResponse() {
  return {
    headers: {},
    setHeader(name, value) {
      this.headers[name] = value;
    },
  };
}

describe('requestContext', () => {
  test('reuses an incoming request id', () => {
    const req = { headers: { 'x-request-id': 'client-request-id' } };
    const res = mockResponse();
    let called = false;
    requestContext(req, res, () => {
      called = true;
    });

    expect(called).toBe(true);
    expect(req.id).toBe('client-request-id');
    expect(res.headers['X-Request-Id']).toBe('client-request-id');
    expect(res.headers['X-Served-By']).toBeTruthy();
    expect(typeof req.startTime).toBe('bigint');
  });

  test('generates a UUID when the header is missing', () => {
    const req = { headers: {} };
    const res = mockResponse();
    requestContext(req, res, () => {});
    expect(req.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(res.headers['X-Request-Id']).toBe(req.id);
  });
});
