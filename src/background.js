import { filenameFor, isAllowedUrl } from './lib/media.js';

const api = globalThis.browser ?? chrome;

// No saveAs: the browser's own "ask where to save" setting decides.
api.runtime.onMessage.addListener((msg) => {
  if (msg?.type !== 'xmd-download' || !Array.isArray(msg.items)) return;
  for (const it of msg.items) {
    if (!isAllowedUrl(it.url)) continue;
    api.downloads.download({
      url: it.url,
      filename: filenameFor(msg.user, it.id, it.url),
      conflictAction: 'uniquify',
    });
  }
});
