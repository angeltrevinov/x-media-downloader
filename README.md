# X Media Downloader

Browser extension (Chrome/Chromium + Firefox 128+, Manifest V3) that adds a **⬇** button to every tweet with media on x.com / twitter.com. One click downloads all of the tweet's media:

- Photos at original quality (`name=orig`)
- Videos and GIFs as the highest-bitrate MP4

Files are named `<handle>_<mediaId>.<ext>` (e.g. `alice_1789012345.jpg`). Where they go follows your browser's own setting (Downloads folder, or "ask where to save each file").

## Install (unpacked)

**Chrome / Chromium / Edge / Brave**
1. Open `chrome://extensions`, enable **Developer mode**
2. **Load unpacked** → select this folder

**Firefox (128+)**
1. Open `about:debugging#/runtime/this-firefox`
2. **Load Temporary Add-on…** → select `manifest.json`

## How it works

- `src/inject.js` runs in the page and reads X's GraphQL API responses (the real MP4 URLs aren't in the DOM).
- `src/content.js` matches tweets on screen to that data and adds the button.
- `src/background.js` performs the downloads (only `pbs.twimg.com` / `video.twimg.com` URLs are allowed).

The button only appears for tweets whose data was loaded after the extension started — reload the tab after installing.

## Development

```sh
npm install
npm test
```

`src/inject.js` contains copies of functions from `src/lib/media.js` (page scripts can't import modules); `test/sync.test.js` fails if they drift.

## Known limitations (v0.1)

- Quote tweets where only the quoted tweet has media get no button on the outer tweet.
- Relies on X's current GraphQL shape and DOM (`article[data-testid="tweet"]`); X changes may break it.
