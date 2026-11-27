// Runs in the page (MAIN world). Watches X's GraphQL responses, pulls out
// media URLs, and hands them to content.js via postMessage.
(() => {
  function bestMediaUrl(m) {
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

  function extractTweetMedia(json) {
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

  const isApi = (url) => /\/i\/api\/graphql\//.test(url || '');

  const emit = (json) => {
    try {
      const media = extractTweetMedia(json);
      if (Object.keys(media).length) window.postMessage({ source: 'xmd-inject', media }, location.origin);
    } catch { /* never break the page */ }
  };

  const origFetch = window.fetch;
  window.fetch = async function (...args) {
    const res = await origFetch.apply(this, args);
    try {
      const url = args[0] instanceof Request ? args[0].url : String(args[0]);
      if (isApi(url)) res.clone().json().then(emit, () => {});
    } catch { /* ignore */ }
    return res;
  };

  const origOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (method, url, ...rest) {
    this.__xmdUrl = String(url);
    return origOpen.call(this, method, url, ...rest);
  };
  const origSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.send = function (...a) {
    if (isApi(this.__xmdUrl)) {
      this.addEventListener('load', () => {
        try { emit(this.responseType === 'json' ? this.response : JSON.parse(this.responseText)); } catch { /* ignore */ }
      });
    }
    return origSend.apply(this, a);
  };
})();
