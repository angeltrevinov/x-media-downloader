// Pure helpers. src/inject.js embeds copies of bestMediaUrl and
// extractTweetMedia (test/sync.test.js keeps them identical).

export function bestMediaUrl(m) {
  if (m.type === 'photo') {
    const u = m.media_url_https;
    const dot = u.lastIndexOf('.');
    return `${u.slice(0, dot)}?format=${u.slice(dot + 1)}&name=orig`;
  }
  if (m.type === 'video' || m.type === 'animated_gif') {
    const mp4 = (m.video_info?.variants || []).filter((v) => v.content_type === 'video/mp4');
    if (!mp4.length) return null;
    return mp4.reduce((a, b) => ((b.bitrate || 0) > (a.bitrate || 0) ? b : a)).url;
  }
  return null;
}

export function extractTweetMedia(json) {
  const out = {};
  const seen = new Set();
  const walk = (node) => {
    if (!node || typeof node !== 'object' || seen.has(node)) return;
    seen.add(node);
    if (Array.isArray(node)) { node.forEach(walk); return; }
    const media = node.legacy?.extended_entities?.media;
    if (node.rest_id && media?.length) {
      const u = node.core?.user_results?.result;
      const user = u?.core?.screen_name || u?.legacy?.screen_name || 'unknown';
      const items = media.map((m) => ({ id: m.id_str, url: bestMediaUrl(m) })).filter((i) => i.url);
      if (items.length) out[node.rest_id] = { user, items };
    }
    for (const k in node) walk(node[k]);
  };
  walk(json);
  return out;
}

const ALLOWED_HOSTS = ['pbs.twimg.com', 'video.twimg.com'];

export function isAllowedUrl(url) {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' && ALLOWED_HOSTS.includes(u.hostname);
  } catch {
    return false;
  }
}

export function filenameFor(user, id, url) {
  const u = new URL(url);
  const ext = u.searchParams.get('format') || u.pathname.match(/\.(\w+)$/)?.[1] || 'bin';
  return `${String(user).replace(/[^\w-]/g, '_')}_${String(id).replace(/\D/g, '')}.${ext}`;
}
