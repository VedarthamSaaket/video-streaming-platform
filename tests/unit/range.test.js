const { parseRange } = require('../../src/utils/range');

describe('parseRange', () => {
  test('returns null when no range header is sent', () => {
    expect(parseRange(undefined, 1000)).toBeNull();
    expect(parseRange('', 1000)).toBeNull();
  });

  test('parses a closed byte range', () => {
    expect(parseRange('bytes=0-99', 1000)).toEqual({ start: 0, end: 99, length: 100 });
  });

  test('clamps the end of the range to the object size', () => {
    expect(parseRange('bytes=900-9999', 1000)).toEqual({ start: 900, end: 999, length: 100 });
  });

  test('parses an open ended range', () => {
    expect(parseRange('bytes=500-', 1000)).toEqual({ start: 500, end: 999, length: 500 });
  });

  test('parses a suffix range', () => {
    expect(parseRange('bytes=-200', 1000)).toEqual({ start: 800, end: 999, length: 200 });
  });

  test('clamps a suffix range larger than the object', () => {
    expect(parseRange('bytes=-5000', 1000)).toEqual({ start: 0, end: 999, length: 1000 });
  });

  test('rejects a start beyond the object', () => {
    expect(() => parseRange('bytes=1000-', 1000)).toThrow(/not satisfiable/);
  });

  test('rejects a reversed range', () => {
    expect(() => parseRange('bytes=900-100', 1000)).toThrow(/not satisfiable/);
  });

  test('rejects multiple ranges', () => {
    expect(() => parseRange('bytes=0-10,20-30', 1000)).toThrow(/not satisfiable/);
  });

  test('rejects a zero length suffix', () => {
    expect(() => parseRange('bytes=-0', 1000)).toThrow(/not satisfiable/);
  });

  test('returns null for an empty object without a range header', () => {
    expect(parseRange(undefined, 0)).toBeNull();
    expect(parseRange('', 0)).toBeNull();
  });

  test('rejects a range request on an empty object', () => {
    expect(() => parseRange('bytes=0-0', 0)).toThrow(/not satisfiable/);
  });
});
