const Video = require('../../src/models/Video');

function validVideo(overrides = {}) {
  return new Video({
    title: 'Demo',
    storageKey: 'media-key',
    originalName: 'demo.mp4',
    mimeType: 'video/mp4',
    sizeBytes: 1024,
    ...overrides,
  });
}

describe('Video model', () => {
  test('applies defaults', () => {
    const video = validVideo();
    expect(video.description).toBe('');
    expect(video.uploadedBy).toBe('anonymous');
    expect(video.views).toBe(0);
    expect(video.validateSync()).toBeUndefined();
  });

  test('requires a title', () => {
    const video = validVideo({ title: '' });
    const error = video.validateSync();
    expect(error.errors.title).toBeDefined();
  });

  test('requires a storage key', () => {
    const video = validVideo({ storageKey: undefined });
    const error = video.validateSync();
    expect(error.errors.storageKey).toBeDefined();
  });

  test('serialises id and hides the storage key', () => {
    const json = validVideo().toJSON();
    expect(json.id).toBeTruthy();
    expect(json.storageKey).toBeUndefined();
    expect(json.__v).toBeUndefined();
    expect(json._id).toBeUndefined();
    expect(json.title).toBe('Demo');
  });

  test('exposes a findRecent helper', () => {
    expect(typeof Video.findRecent).toBe('function');
  });
});
