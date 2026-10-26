const { z } = require('zod');
const mongoose = require('mongoose');
const errorHandler = require('../../src/middleware/errorHandler');
const HttpError = require('../../src/utils/HttpError');

function mockResponse() {
  return {
    headers: {},
    statusCode: null,
    body: null,
    destroyed: null,
    headersSent: false,
    setHeader(name, value) {
      this.headers[name] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
    destroy(error) {
      this.destroyed = error;
    },
  };
}

function run(error) {
  const res = mockResponse();
  const req = { id: 'req-1', log: { error: () => {} } };
  errorHandler(error, req, res, () => {});
  return res;
}

describe('errorHandler', () => {
  test('renders an HttpError with its headers', () => {
    const res = run(new HttpError(416, 'bad range', { headers: { 'Content-Range': 'bytes */10' } }));
    expect(res.statusCode).toBe(416);
    expect(res.headers['Content-Range']).toBe('bytes */10');
    expect(res.body).toMatchObject({
      error: 'bad range',
      statusCode: 416,
      requestId: 'req-1',
    });
  });

  test('hides the message of an unexpected error', () => {
    const res = run(new Error('database password is hunter2'));
    expect(res.statusCode).toBe(500);
    expect(res.body.error).toBe('Internal server error');
    expect(JSON.stringify(res.body)).not.toContain('hunter2');
  });

  test('renders a ZodError as a 400', () => {
    const error = z.object({ title: z.string() }).safeParse({}).error;
    const res = run(error);
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('Invalid request');
    expect(res.body.details.fieldErrors.title).toBeDefined();
  });

  test('renders a mongoose CastError as a 400', () => {
    const error = new mongoose.Error.CastError('ObjectId', 'nope', '_id');
    const res = run(error);
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('Invalid _id');
  });

  test('renders a mongoose ValidationError as a 400 with details', () => {
    const error = new mongoose.Error.ValidationError();
    error.addError('title', new mongoose.Error.ValidatorError({ message: 'title required' }));
    const res = run(error);
    expect(res.statusCode).toBe(400);
    expect(res.body.details.title).toBe('title required');
  });

  test('renders a JSON parse error as a 400', () => {
    const error = new SyntaxError('Unexpected token');
    error.type = 'entity.parse.failed';
    const res = run(error);
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('Malformed JSON body');
  });

  test('destroys the response when headers were already sent', () => {
    const res = mockResponse();
    res.headersSent = true;
    const error = new Error('broken pipe');
    errorHandler(error, { id: 'r', log: { error: () => {} } }, res, () => {});
    expect(res.destroyed).toBe(error);
  });
});
