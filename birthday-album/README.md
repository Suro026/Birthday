# A private birthday album

A hand-made digital photo album: ivory paper, burgundy cloth, a little gold. Plain HTML, CSS and JavaScript — no build step,
no framework, no libraries (the only outside request is Google Fonts).

## Files

```
birthday-album/
├── index.html        the page shell (cover, album frame, music words)
├── config.js         ← THE ONLY FILE YOU EDIT: her name, the message, every photo, caption, date, the music
├── style.css         the design
├── script.js         the behaviour (page turn, gestures, motion, music, finale)
├── README.md
└── assets/
    ├── photos/       ← your photographs go here
    ├── music/        ← your song goes here
    └── textures/     (optional, empty)
```

## Where to put things

| What | Where |
| --- | --- |
| **Her name** | `config.js` → top of the file → `birthdayConfig.name` |
| **The birthday message** | `config.js` → top of the file → `birthdayConfig.finalMessage` (between the backticks). A blank line starts a new paragraph; each sentence is revealed on its own. |
| **Photographs** | `assets/photos/` — named `photo-01.webp` … `photo-23.webp` (or use any names and change them in `config.js`) |
| **Captions, dates, descriptions** | `config.js` → `pages: [ … ]` — each photo has `caption`, `date`, `description` |
| **The song** | `assets/music/birthday-song.mp3` |
| **Closing line, "One last thing…", button labels** | `config.js` → the last entry of `pages` (`layout: 'finale'`) |

Which photo is where (all in `config.js`, in this order):

| Page | Layout | Photos |
| --- | --- | --- |
| 1 | Opening memory | `photo-01` |
| 2 | Collage | `photo-02` … `photo-06` |
| 3 | Full-screen photograph | `photo-07` |
| 4 | "Little things I love about you" | `photo-08` (optional small print, shown on larger screens) |
| 5 | Timeline | `photo-09` … `photo-12` |
| 6 | Polaroids | `photo-13` … `photo-16` |
| 7 | Proof sheet (tap a frame) | `photo-17` … `photo-22` |
| 8 | Finale | `photo-23` — **choose the strongest photograph you have** |

A missing photo shows a quiet placeholder, so you can add them gradually. (Your browser's developer console will list a
"404" for each missing file — that disappears once the files are in place.)

### Photograph format
Export as **WebP, about 1200 px on the long edge** (≈100–200 KB each). Only the page being read and its neighbours are
downloaded. Optional extras per photo: `srcset` (smaller versions for phones), `full` (a larger file fetched only when
the photo is tapped), `focus` (`"50% 30%"` keeps faces in frame), `position`, `rotation`, `tape`. Batch-convert:
`for f in *.jpg; do cwebp -q 78 -resize 1200 0 "$f" -o "${f%.jpg}.webp"; done`

### Music
Save the track as `assets/music/birthday-song.mp3` (128 kbps, 2–4 MB). Use a recording you have the rights to.

- Nothing is requested or played until she presses **Open the album** (browsers don't allow music before a tap).
- It plays through the whole album without restarting. Closing the album or switching tabs pauses it; reopening continues.
- Two quiet words in the header: **♪ Pause / Play** and **Mute / Unmute**. Both choices (and the position) are remembered
  for the session.
- `music.volume` (0–1) and `music.fadeMs` are in `config.js`. iPhones ignore volume — master the file quieter if needed.
- If the file is missing the music words stay hidden and everything else works.

### Motion
`motion: { quality: 'auto' | 'full' | 'lite' | 'off' }` in `config.js`. `auto` follows the device (phones get lighter
motion) and honours the system "reduce motion" setting, which turns movement into plain fades. `off` forces that.

## Controls
Swipe or drag a page · click or tap a page edge · ← → · PageUp/PageDown · Home/End · Esc (back to the cover) · tap a
photograph for its caption · `#3` in the URL opens page 3.

## Run and deploy
Open `index.html`, or serve the folder (`python3 -m http.server`). To deploy, publish **this folder** as a static site
(Vercel, Netlify, GitHub Pages). If it lives inside a larger repository, set the site's root/publish directory to
`birthday-album`. The page is marked `noindex` so search engines leave it alone.

## Code map (`script.js`)
Utilities → Configuration (+ motion settings) → Page layouts → Image loading → Book engine → Album controller →
Motion → Memories (tap a photo) → Input → Music → Boot. The page turn writes only `transform` and `opacity`
(see the comment at the top of the file). Other layouts available in `config.js` if you want to rearrange the book:
`title`, `chapter`, `note`, `closing`.
