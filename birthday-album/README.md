# Birthday Album

A cinematic photo album / memory book. Plain HTML + CSS + vanilla JS — no build step, no dependencies.

## Customise
Edit **`config.js`** only: her name, birthday, cover text, the `pages` list (each page picks a `layout`: title, full, single, duo, corners, strip, mosaic, chapter, note, closing), music, and UI text.

- Put photos in `assets/photos/` and name them in the pages (a missing file shows a placeholder plate).
- Put a track in `assets/music/` and set `music.src`. It starts when she taps "Open the album".
- Optional grain/paper textures can live in `assets/textures/`.

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
