import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { bestMediaUrl, extractTweetMedia, filenameFor, isAllowedUrl } from '../src/lib/media.js';

const fixture = JSON.parse(readFileSync(new URL('./fixtures/tweet-detail.json', import.meta.url), 'utf8'));

describe('bestMediaUrl', () => {
  it('photo -> orig quality', () => {
    expect(bestMediaUrl({ type: 'photo', media_url_https: 'https://pbs.twimg.com/media/ABC.jpg' }))
      .toBe('https://pbs.twimg.com/media/ABC?format=jpg&name=orig');
  });
  it('video -> highest bitrate mp4', () => {
    expect(bestMediaUrl({ type: 'video', video_info: { variants: [
      { content_type: 'application/x-mpegURL', url: 'm3u8' },
      { content_type: 'video/mp4', bitrate: 1, url: 'low' },
      { content_type: 'video/mp4', bitrate: 9, url: 'high' }] } })).toBe('high');
  });
  it('unknown -> null', () => expect(bestMediaUrl({ type: 'x' })).toBeNull());
});

describe('extractTweetMedia', () => {
  it('finds tweets incl. quoted ones', () => {
    const out = extractTweetMedia(fixture);
    expect(out['111']).toEqual({ user: 'alice', items: [
      { id: '901', url: 'https://pbs.twimg.com/media/ABC?format=jpg&name=orig' },
      { id: '902', url: 'https://video.twimg.com/high.mp4?tag=1' }] });
    expect(out['222']).toEqual({ user: 'bob', items: [{ id: '903', url: 'https://video.twimg.com/gif.mp4' }] });
  });
  it('ignores tweets without media', () => {
    expect(extractTweetMedia({ rest_id: '1', legacy: {} })).toEqual({});
  });
});

describe('filenameFor', () => {
  it('handle_mediaId.ext', () => {
    expect(filenameFor('alice', '901', 'https://pbs.twimg.com/media/ABC?format=jpg&name=orig')).toBe('alice_901.jpg');
    expect(filenameFor('bob', '903', 'https://video.twimg.com/a/b.mp4?tag=1')).toBe('bob_903.mp4');
    expect(filenameFor('we!rd', '1', 'https://x.test/y.png')).toBe('we_rd_1.png');
  });
  it('cannot escape the downloads folder', () => {
    expect(filenameFor('../../etc', '1/../2', 'https://pbs.twimg.com/a.jpg')).toBe('______etc_12.jpg');
  });
});

describe('isAllowedUrl', () => {
  it('only twimg media hosts over https', () => {
    expect(isAllowedUrl('https://pbs.twimg.com/media/A?format=jpg')).toBe(true);
    expect(isAllowedUrl('https://video.twimg.com/a.mp4')).toBe(true);
    expect(isAllowedUrl('http://pbs.twimg.com/a.jpg')).toBe(false);
    expect(isAllowedUrl('https://evil.com/a.jpg')).toBe(false);
    expect(isAllowedUrl('not a url')).toBe(false);
  });
});
