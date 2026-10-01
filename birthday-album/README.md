# Birthday Album

A cinematic photo album / memory book. Plain HTML + CSS + vanilla JS — no build step, no dependencies.

## Customise
Edit **`config.js`** only: her name, birthday, message, photos, captions, dates, music, and UI text.

- Put photos in `assets/photos/` and list them under `memories` (a missing file shows a placeholder plate).
- Put a track in `assets/music/` and set `music.src`. It starts when she taps "Open the album".
- Optional grain/paper textures can live in `assets/textures/`.

## Run locally
Open `index.html`, or serve the folder: `python3 -m http.server`.

## Deploy
Serve this folder as a static site (set it as the root/publish directory on Vercel, Netlify or GitHub Pages).

## Controls
Swipe · ← → · PageUp/PageDown · Home/End · Esc (back to the cover) · `#3` in the URL opens page 3.

## Code map (`script.js`)
Utilities → Config → Page builders → Image loading → Album controller → Input → Music → Boot.
Motion hooks: `album.on('change' | 'view')`, `.page.is-current/.is-before/.is-after`, `--drag-x`, `--progress`, `--mx/--my`, `.fine-pointer`.
