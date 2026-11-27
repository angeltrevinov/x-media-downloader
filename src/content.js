// ISOLATED world. Stores media captured by inject.js and adds a ⬇ button
// to the action bar of every tweet that has media.
const store = new Map(); // tweetId -> { user, items: [{ id, url }] }

window.addEventListener('message', (e) => {
  if (e.source !== window || e.data?.source !== 'xmd-inject') return;
  for (const [id, v] of Object.entries(e.data.media || {})) store.set(id, v);
  schedule();
});

function tweetIdOf(article) {
  const link = article.querySelector('a[href*="/status/"] time')?.closest('a');
  return link?.getAttribute('href').match(/\/status\/(\d+)/)?.[1];
}

function addButton(article) {
  const id = tweetIdOf(article);
  const old = article.querySelector('.xmd-btn');
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
  btn.textContent = '⬇';
  btn.title = `Download ${entry.items.length} media`;
  btn.style.cssText = 'background:none;border:0;cursor:pointer;color:rgb(113,118,123);font-size:17px;padding:0 8px;';
  btn.addEventListener('click', (ev) => {
    ev.preventDefault();
    ev.stopPropagation();
    chrome.runtime.sendMessage({ type: 'xmd-download', user: entry.user, items: entry.items });
    btn.textContent = '✓';
    setTimeout(() => { btn.textContent = '⬇'; }, 1500);
  });
  bar.appendChild(btn);
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
