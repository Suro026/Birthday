# Birthday Album

A cinematic photo album / memory book. Plain HTML + CSS + vanilla JS — no build step, no dependencies.

## Customise
Edit **`config.js`** only: her name, birthday, cover text, music, UI text and the `pages` list. Each page picks a
`layout`: `opening`, `collage`, `full`, `list`, `timeline`, `polaroids`, `interactive`, `reveal` (plus the simple
`title`, `chapter`, `note`, `closing`).

### Photographs
Every photograph is a small object — the same shape on every layout:

```js
{ image: '/assets/photos/photo-01.webp',   // "/assets/…" works from any folder / sub-path
  ratio: '4/5',                             // shape of the print (prevents layout jumps)
  caption: 'the first photograph of us',    // handwritten
  date: '2023-02-14',                       // or free text
  description: 'Shown on the paper slip when the photograph is tapped.',
  focus: '50% 40%',                         // keep faces in frame
  position: { x: 12, y: 5, w: 52 },         // % of the page: left, top, width
  rotation: -2.2,                           // degrees — small numbers look like real prints
  tape: 'top' }                             // 'top' | 'corner' | 'both' | ''
```
Every layout has good defaults, so `position`, `rotation` and `tape` are optional. A missing file shows a placeholder plate.

**Tap a photograph** → it lifts slightly (on the interactive page it comes to the middle) and a paper slip shows its
caption, date and description. Tap again, tap elsewhere, press Esc or turn the page to put it back.

### Keeping it light
- Only the page being read, and its neighbours, are downloaded; images are `decoding="async"` and prioritised.
- Export photos as WebP at about **1200px on the long edge** (≈100–200 KB). For phones add smaller versions and a
  `srcset`: `srcset: '/assets/photos/photo-01-640.webp 640w, /assets/photos/photo-01.webp 1200w'`.
- Optional `full: '/assets/photos/photo-01-2400.webp'` is fetched only when that photograph is tapped.
- Batch-convert: `for f in *.jpg; do cwebp -q 78 -resize 1200 0 "$f" -o "${f%.jpg}.webp"; done` (or use Squoosh / ImageMagick).

- Put a track in `assets/music/` and set `music.src`. It starts when she taps "Open the album".
- `motion: { quality: 'auto' | 'full' | 'lite' | 'off' }` — `off` behaves like reduced-motion.

## Run locally
Open `index.html`, or serve the folder: `python3 -m http.server`.

## Deploy
Serve this folder as a static site (set it as the root/publish directory on Vercel, Netlify or GitHub Pages).

## Controls
Swipe or mouse-drag a page · click/tap a page edge · ← → · PageUp/PageDown · Home/End · trackpad two-finger scroll · Esc (back to the cover) · `#3` in the URL opens page 3.

## Code map (`script.js`)
Utilities → Config → Page layouts → Image loading → Book engine → Album controller → Input → Music → Boot.

## How the page turn works
Each page is a leaf hinged on its left edge with a progress `p` (0 flat, 1 turned). Per frame the engine writes only
`transform` and `opacity` (leaf rotation, shade, cast shadow, photo parallax) — no layout, filters or animated shadows.
Dragging sets `p` from the finger; buttons/keys/taps/releases tween it, so interrupted or overlapping turns just work.
Only the visible leaves are rendered. Add `data-depth` / `data-zoom` to any element in a page for parallax.
Hooks: `album.on('change' | 'view')`, `album.book.leaves[i].p`, `--mx/--my`, `.fine-pointer`.
