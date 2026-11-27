import { readFileSync, existsSync } from 'fs';
import { it, expect } from 'vitest';

// src/inject.js runs in the page (MAIN world) and can't import modules,
// so it embeds copies of these functions. Keep them identical.
const body = (src, fn) => {
  const start = src.indexOf(fn);
  return start < 0 ? null : src.slice(start, src.indexOf('\n}\n', start));
};

it('inject.js embeds lib functions verbatim', () => {
  const lib = readFileSync('src/lib/media.js', 'utf8').replace(/^export /gm, '');
  const inj = readFileSync('src/inject.js', 'utf8').replace(/^  /gm, '');
  for (const fn of ['function bestMediaUrl', 'function extractTweetMedia']) {
    expect(body(inj, fn)).not.toBeNull();
    expect(body(inj, fn)).toBe(body(lib, fn));
  }
});

it('manifest is valid and references existing files', () => {
  const m = JSON.parse(readFileSync('manifest.json', 'utf8'));
  expect(m.manifest_version).toBe(3);
  const files = [m.background.service_worker, ...m.content_scripts.flatMap((c) => c.js)];
  for (const f of files) expect(existsSync(f), f).toBe(true);
});
