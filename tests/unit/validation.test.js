const { createVideoSchema, updateVideoSchema, listQuerySchema, parse } = require('../../src/utils/validation');

describe('request validation', () => {
  test('accepts a minimal create payload and applies defaults', () => {
    const result = parse(createVideoSchema, { title: 'Launch demo' });
    expect(result.ok).toBe(true);
    expect(result.data).toEqual({
      title: 'Launch demo',
      description: '',
      uploadedBy: 'anonymous',
    });
  });

  test('rejects a create payload without a title', () => {
    const result = parse(createVideoSchema, { description: 'no title' });
    expect(result.ok).toBe(false);
    expect(result.error.fieldErrors.title).toBeDefined();
  });

  test('rejects a title longer than 200 characters', () => {
    const result = parse(createVideoSchema, { title: 'a'.repeat(201) });
    expect(result.ok).toBe(false);
  });

  test('rejects an empty update payload', () => {
    const result = parse(updateVideoSchema, {});
    expect(result.ok).toBe(false);
  });

  test('accepts a partial update', () => {
    const result = parse(updateVideoSchema, { description: 'updated' });
    expect(result.ok).toBe(true);
    expect(result.data.description).toBe('updated');
  });

  test('coerces pagination query parameters', () => {
    const result = parse(listQuerySchema, { page: '2', limit: '5' });
    expect(result.ok).toBe(true);
    expect(result.data).toEqual({ page: 2, limit: 5, search: undefined });
  });

  test('rejects a limit above 100', () => {
    const result = parse(listQuerySchema, { limit: '500' });
    expect(result.ok).toBe(false);
  });
});
