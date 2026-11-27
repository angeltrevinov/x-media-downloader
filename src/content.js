// ISOLATED world. Stores media captured by inject.js and adds a download button
// to the action bar of every tweet that has media.
const store = new Map(); // tweetId -> { user, items: [{ id, url }] }

window.addEventListener('message', (e) => {
  if (e.source !== window || e.data?.source !== 'xmd-inject') return;
  for (const [id, v] of Object.entries(e.data.media || {})) store.set(id, v);
  schedule();
});

// Icons drawn in X's style: 24x24 filled paths, same tray as X's Share icon.
const SVG_NS = 'http://www.w3.org/2000/svg';
const ICON_DOWNLOAD = 'M12 16.41l-5.7-5.7 1.41-1.42L11 12.59V3h2v9.59l3.3-3.3 1.41 1.42L12 16.41zM21 15l-.02 3.51c0 1.38-1.12 2.49-2.5 2.49H5.5C4.11 21 3 19.88 3 18.5V15h2v3.5c0 .28.22.5.5.5h12.98c.28 0 .5-.22.5-.5L19 15h2z';
const ICON_DONE = 'M9.64 18.952l-5.55-4.861 1.317-1.504 3.951 3.459 8.459-10.948L19.4 6.32 9.64 18.952z';

// Matches X's action-bar buttons: 18.75px icon, grey, blue circle on hover.
const style = document.createElement('style');
style.textContent = `
.xmd-btn{display:flex;align-items:center;background:none;border:0;padding:0;margin:0;cursor:pointer;color:rgb(113,118,123);flex:0 0 auto}
.xmd-ring{display:flex;align-items:center;justify-content:center;width:34.75px;height:34.75px;margin:-8px;border-radius:9999px;transition:background-color .2s,color .2s}
.xmd-btn svg{width:18.75px;height:18.75px;fill:currentColor}
.xmd-btn:hover,.xmd-btn:focus-visible{color:rgb(29,155,240)}
.xmd-btn:hover .xmd-ring,.xmd-btn:focus-visible .xmd-ring{background-color:rgba(29,155,240,.1)}
.xmd-btn:focus-visible{outline:none}
.xmd-btn.xmd-done{color:rgb(0,186,124)}
.xmd-bar{justify-content:space-between!important}
.xmd-bar>*{flex:0 0 auto!important}
.xmd-wrap{display:flex;align-items:center}
`;
(document.head || document.documentElement).appendChild(style);

function tweetIdOf(article) {
  const link = article.querySelector('a[href*="/status/"] time')?.closest('a');
  return link?.getAttribute('href').match(/\/status\/(\d+)/)?.[1];
}

function addButton(article) {
  const id = tweetIdOf(article);
  const old = article.querySelector('.xmd-wrap');
  if (old && old.dataset.id === id) return;
  old?.remove(); // X recycles article nodes; drop stale buttons
  const entry = id && store.get(id);
  if (!entry) return;
  const bar = [...article.querySelectorAll('[role="group"]')].pop();
  if (!bar) return;

  const btn = document.createElement('button');
  btn.className = 'xmd-btn';
  btn.type = 'button';
  btn.dataset.id = id;
  btn.title = `Download ${entry.items.length} media`;
  btn.setAttribute('aria-label', btn.title);
  const ring = document.createElement('div');
  ring.className = 'xmd-ring';
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute('d', ICON_DOWNLOAD);
  svg.appendChild(path);
  ring.appendChild(svg);
  btn.appendChild(ring);
  btn.addEventListener('click', (ev) => {
    ev.preventDefault();
    ev.stopPropagation();
    chrome.runtime.sendMessage({ type: 'xmd-download', user: entry.user, items: entry.items });
    path.setAttribute('d', ICON_DONE);
    btn.classList.add('xmd-done');
    setTimeout(() => { path.setAttribute('d', ICON_DOWNLOAD); btn.classList.remove('xmd-done'); }, 1500);
  });
  // Match X's icon size for this view (timeline vs. expanded tweet differ).
  const ref = bar.querySelector('svg');
  if (ref) {
    const size = getComputedStyle(ref).width;
    svg.style.width = size;
    svg.style.height = size;
  }

  // Last slot on the far right; .xmd-bar spaces every slot evenly.
  const wrap = document.createElement('div');
  wrap.className = 'xmd-wrap';
  wrap.dataset.id = id;
  wrap.appendChild(btn);
  bar.classList.add('xmd-bar');
  bar.appendChild(wrap);
}

let pending = false;
function schedule() {
  if (pending) return;
  pending = true;
  requestAnimationFrame(() => {
    pending = false;
    document.querySelectorAll('article[data-testid="tweet"]').forEach(addButton);
  });
}

new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true });
