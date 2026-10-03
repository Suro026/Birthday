/* ==========================================================================
   Birthday Album — application script
   --------------------------------------------------------------------------
   Plain script (no modules, no build) so it runs from file:// and any host.

   Layout of this file
     1. Utilities          small helpers
     2. Configuration      defaults + merge of window.ALBUM_CONFIG
     3. Page layouts       config entry  ->  page content + its entrance storyboard
     4. Image loading      lazy loading with a graceful "missing photo" plate
     5. Book engine        leaves, page-turn physics, painting (transform/opacity only)
     6. Album controller   single source of truth: current page + events
     7. Motion             entrances, particle fields, pointer parallax, landing settle
     7b Memories           tap a photograph: lift + caption slip
     8. Input              keyboard, gestures (touch/pen/mouse), wheel, hot-spots
     9. Music              optional background track
    10. Boot               wires everything together

   Motion (section 7)
     Entrances are authored per layout in section 3 (fx(el, kind, delay, time))
     and played by CSS when a page gets `.is-entered`. createSettings() decides
     how much motion this device gets (phone / tablet / desktop, lite,
     reduced-motion); the canvas particle fields live in createMotion().

   How a page turn works
     Every page is a "leaf" hinged on its left edge. Each leaf has a progress
     `p` from 0 (lying flat on the right-hand stack) to 1 (turned away).
     A leaf at progress p is painted with exactly three GPU-friendly writes:
         transform  rotateY / rotateX      (the turn and a slight lift)
         opacity    of the leaf, its shade (it darkens as it turns away) and
                    of the cast shadow that falls on the page beneath
         transform  on [data-depth] children (photo parallax)
     No layout, no filters, no box-shadow animation. Dragging sets `p` straight
     from the finger; buttons, keys, taps and releases tween it.

   Hooks for later motion work
     - album.on('change', ({ from, to, direction, source }) => …)
     - album.on('view',   ({ view }) => …)           'gate' | 'album'
     - album.book.leaves[i].p                         live progress of each leaf
     - <html data-tier="phone|tablet|desktop" data-lite data-reduced>
     - [data-depth="3"] [data-zoom="1.08"] on any element inside a page to
       give it parallax while that page is turned or revealed.
   ========================================================================== */
(() => {
  'use strict';

  /* ------------------------------------------------------------------------
     1. Utilities
     ------------------------------------------------------------------------ */
  const $ = (selector, root = document) => root.querySelector(selector);
  const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
  const pad2 = (n) => String(n).padStart(2, '0');
  const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
  const now = () => performance.now();

  /** Create an element. Text is always set via textContent (never innerHTML). */
  function h(tag, props = {}, children = []) {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(props)) {
      if (value === undefined || value === null || value === false) continue;
      if (key === 'class') node.className = value;
      else if (key === 'text') node.textContent = value;
      else if (key === 'dataset') Object.assign(node.dataset, value);
      else node.setAttribute(key, value === true ? '' : value);
    }
    for (const child of [].concat(children)) if (child) node.append(child);
    return node;
  }

  /** Deep-merge plain objects; arrays and primitives from `over` replace `base`. */
  function merge(base, over) {
    if (!isObject(over)) return base;
    const out = { ...base };
    for (const key of Object.keys(over)) {
      out[key] = isObject(base[key]) && isObject(over[key]) ? merge(base[key], over[key]) : over[key];
    }
    return out;
  }

  const getPath = (obj, path) => path.split('.').reduce((o, k) => (o == null ? o : o[k]), obj);

  /** "YYYY-MM-DD" -> localised long date. Anything else is returned untouched. */
  function formatDate(value, lang) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || '');
    if (!m) return value || '';
    const date = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    try {
      return new Intl.DateTimeFormat(lang, { day: 'numeric', month: 'long', year: 'numeric' }).format(date);
    } catch {
      return value;
    }
  }

  /** Resolve a file name against a base folder; leave absolute URLs alone. */
  function resolveAsset(file, base) {
    if (!file) return '';
    // "/assets/photos/x.webp" is read as relative to the album, so it works when
    // the site is served from a sub-folder (GitHub Pages) as well as from a root.
    if (/^\/assets\//.test(file)) return file.slice(1);
    return /^([a-z][a-z0-9+.-]*:|\/)/i.test(file) ? file : base + file;
  }

  /** Minimal event emitter. */
  function emitter() {
    const handlers = {};
    return {
      on(event, fn) {
        (handlers[event] ||= []).push(fn);
        return () => { handlers[event] = handlers[event].filter((f) => f !== fn); };
      },
      emit(event, detail) {
        (handlers[event] || []).forEach((fn) => fn(detail));
      },
    };
  }

  /* ------------------------------------------------------------------------
     2. Configuration
     ------------------------------------------------------------------------ */
  const DEFAULTS = {
    site: { title: 'A Book of Memories', language: 'en' },
    recipient: { name: '' },
    birthday: { date: '' },
    cover: { eyebrow: '', lead: '', button: 'Open the album', hint: '' },
    base: { photos: 'assets/photos/', music: 'assets/music/' },
    pages: [],
    music: { src: '', title: '', volume: 0.6, loop: true, fadeMs: 1200 },
    motion: { quality: 'auto' },
    ui: {
      previous: 'Previous', next: 'Next', close: 'Close album',
      play: 'Play', pause: 'Pause', mute: 'Mute', unmute: 'Unmute',
      playMusic: 'Play music', pauseMusic: 'Pause music', muteMusic: 'Mute music', unmuteMusic: 'Unmute music',
      page: 'Page', of: 'of', photograph: 'Photograph',
    },
  };

  function loadConfig() {
    if (!isObject(window.ALBUM_CONFIG)) {
      console.warn('[album] config.js did not load; using defaults.');
    }
    const cfg = merge(DEFAULTS, window.ALBUM_CONFIG);

    const withSlash = (s) => (s && !s.endsWith('/') ? s + '/' : s);
    cfg.base.photos = withSlash(cfg.base.photos);
    cfg.base.music = withSlash(cfg.base.music);
    cfg.pages = (Array.isArray(cfg.pages) ? cfg.pages : []).filter((p) => {
      if (isObject(p)) return true;
      console.warn('[album] Ignoring a page that is not an object:', p);
      return false;
    });
    if (!cfg.pages.length) cfg.pages = [{ layout: 'title' }];
    cfg.music.volume = clamp(Number.isFinite(Number(cfg.music.volume)) ? Number(cfg.music.volume) : 0.6, 0, 1);
    cfg.music.fadeMs = clamp(Number(cfg.music.fadeMs) || 0, 0, 5000);
    if (!cfg.recipient.name) console.warn('[album] recipient.name is empty.');
    return cfg;
  }

  /* ------------------------------------------------------------------------
     2b. Motion settings
         One object describes how much motion this device should get. Phones get
         a lighter treatment (less parallax, fewer particles, less blur, shorter
         travel), tablets a little more, desktops the full one. Reduced-motion
         replaces movement with simple fades. CSS reads the same tiers through
         media queries; JS reads this object. It updates live when the window
         or the OS preference changes.
     ------------------------------------------------------------------------ */
  function createSettings(cfg) {
    const mq = {
      reduced: window.matchMedia('(prefers-reduced-motion: reduce)'),
      tablet: window.matchMedia('(min-width: 768px)'),
      desktop: window.matchMedia('(min-width: 1024px) and (hover: hover) and (pointer: fine)'),
    };
    const quality = String(cfg.motion.quality || 'auto').toLowerCase(); // auto | full | lite | off
    const weak = (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 2;
    const subs = [];
    const fxs = { reduced: false, lite: false, tier: 'phone', parallax: 1, dust: 0, onChange: (fn) => subs.push(fn) };

    function update() {
      fxs.reduced = quality === 'off' || mq.reduced.matches;
      fxs.lite = quality === 'lite' || (quality === 'auto' && weak);
      fxs.tier = mq.desktop.matches ? 'desktop' : mq.tablet.matches ? 'tablet' : 'phone';
      const k = fxs.lite ? 0.65 : 1;
      fxs.parallax = fxs.reduced ? 0 : { phone: 0.5, tablet: 0.8, desktop: 1 }[fxs.tier] * k;
      fxs.dust = fxs.reduced ? 0 : Math.round({ phone: 9, tablet: 16, desktop: 28 }[fxs.tier] * k);
      const root = document.documentElement;
      root.dataset.tier = fxs.tier;
      root.toggleAttribute('data-lite', fxs.lite);
      root.toggleAttribute('data-reduced', fxs.reduced);
      subs.forEach((fn) => fn(fxs));
    }
    Object.values(mq).forEach((m) => m.addEventListener('change', update));
    update();
    return fxs;
  }

  /* ------------------------------------------------------------------------
     3. Page layouts
        Each layout function takes (spec, ctx) and returns
          { layout, tone, label, imgs, el }
        `el` is the page content; the book engine wraps it in a leaf.
        ctx = { cfg, no (1-based page number), photo() -> next photo number }.
        Compositions are sized with container-query units in style.css, so the
        same markup scales from a 320px phone to a desktop.

        Photographs are described by a "memory":
          { image, srcset, full, ratio, caption, date, description, alt, focus,
            position: { x, y, w }, rotation, tape }
        A layout supplies sensible default positions and tilts; anything in
        the config overrides them. Tapping a photograph lifts it slightly and
        reveals its caption, date and description on a paper slip.

        Motion is authored here as data, not code: fx(el, kind, delay, time)
        tags an element for the entrance choreography (see "Motion" in
        style.css). Delays are in ms from the moment the page is revealed, so
        each layout reads like a small storyboard.
     ------------------------------------------------------------------------ */
  const text = (tag, cls, value) => (value ? h(tag, { class: cls, text: value }) : null);

  /* All storyboard delays below are written at a relaxed pace and tightened here, in one place. */
  const STAGE = 0.78;
  const tighten = (ms) => Math.round(ms * STAGE);

  /** Tag an element for the entrance choreography. kinds: rise | fade | drop | draw | wipe | words */
  function fx(el, kind, delay = 0, time = 0) {
    if (!el) return el;
    el.dataset.fx = kind;
    if (delay) el.style.setProperty('--d', `${tighten(delay)}ms`);
    if (time) el.style.setProperty('--t', `${time}ms`);
    return el;
  }

  /** A heading whose words rise one after another out of a mask. */
  function words(tag, cls, value, delay = 0, time = 1200) {
    if (!value) return null;
    const el = h(tag, { class: cls });
    const list = String(value).split(/\s+/);
    list.forEach((word, i) => {
      const mask = h('span', { class: 'mw' }, [h('span', { class: 'mw__in', text: word })]);
      mask.style.setProperty('--wi', String(i));
      el.append(mask);
      if (i < list.length - 1) el.append(' ');
    });
    return fx(el, 'words', delay, time);
  }

  /** Handwritten text that is written on, left to right. */
  const hand = (tag, cls, value, delay, time = 1500) => fx(text(tag, `hand ${cls}`, value), 'wipe', delay, time);

  /* ---- memories ---- */

  /** "photo-01.webp" -> assets/photos/photo-01.webp; "/assets/…" works from any sub-folder too. */
  function assetUrl(file, cfg) {
    return resolveAsset(file, cfg.base.photos);
  }

  /** srcset string with every URL resolved: "a-480.webp 480w, a-960.webp 960w". */
  function srcsetUrl(value, cfg) {
    if (!value) return '';
    return String(value).split(',').map((part) => {
      const [url, ...rest] = part.trim().split(/\s+/);
      return [assetUrl(url, cfg), ...rest].join(' ');
    }).join(', ');
  }

  const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

  /**
   * Normalise any photo description into one memory object.
   *   raw     string (an image path) or an object from config.js
   *   preset  the layout's defaults for this slot
   *   page    page-level spec, used to fill gaps (single-photo layouts)
   */
  function memoryOf(raw, preset = {}, page = {}) {
    const src = typeof raw === 'string' ? { image: raw } : (isObj(raw) ? raw : {});
    const pos = { ...preset, ...(isObj(src.position) ? src.position : {}) };
    return {
      image: src.image || src.photo || '',
      srcset: src.srcset || '',
      full: src.full || '',
      ratio: src.ratio || preset.ratio || '4/5',
      alt: src.alt || '',
      caption: src.caption ?? page.caption ?? '',
      date: src.date ?? page.date ?? '',
      description: src.description ?? page.description ?? '',
      focus: src.focus || '',
      x: pos.x, y: pos.y, w: pos.w,
      rotation: src.rotation ?? preset.rotation ?? 0,
      tape: src.tape ?? preset.tape ?? '',
    };
  }

  /** The first photograph of a single-photo page. */
  function firstMemory(spec, preset) {
    const raw = Array.isArray(spec.photos) ? spec.photos[0] : spec.photo ?? spec.image;
    return memoryOf(raw, preset, spec);
  }

  /** Photos of a multi-photo page, padded with empty slots so placeholders still show. */
  function memoriesOf(spec, presets) {
    const list = Array.isArray(spec.photos) ? spec.photos : [];
    return presets.map((preset, i) => memoryOf(list[i], preset, {}));
  }

  /**
   * A photograph as a printed object. Returns { el, img }.
   *   opts.frame   'mat' | 'polaroid' | 'bleed' | 'frame'
   *   opts.kind    entrance of the whole print: 'rise' | 'drop' | 'fade' | ''
   *   opts.reveal  how the picture itself is uncovered: 'up' | 'left' | 'fade' | 'develop'
   *   opts.delay / opts.time   storyboard timing (ms)
   *   opts.depth   parallax strength while the page turns (% of image width)
   *   opts.pointer desktop pointer parallax in px (0 = none)
   *   opts.sway    gentle idle rotation (a print resting loosely on the page)
   *   opts.sizes   the `sizes` attribute for responsive images
   */
  function photoFigure(mem, ctx, opts = {}) {
    const { frame = 'mat', kind = '', reveal = 'fade', delay = 0, time = 1500, depth = 3, pointer = 0, sway = false, sizes = '' } = opts;
    const n = ctx.photo();
    const img = h('img', {
      class: 'photo__img',
      alt: mem.alt || mem.caption || '',
      decoding: 'async',
      loading: 'lazy',
      draggable: 'false',
      dataset: {
        src: assetUrl(mem.image, ctx.cfg),
        srcset: srcsetUrl(mem.srcset, ctx.cfg),
        sizes,
        depth: String(depth),
        zoom: '1.08',
      },
    });
    if (mem.focus) img.style.objectPosition = mem.focus;
    const stage = h('div', { class: 'photo__reveal' }, [
      img,
      h('div', { class: 'photo__missing', 'aria-hidden': 'true' }, [
        h('span', { text: ctx.cfg.ui.photograph }),
        h('span', { text: pad2(n) }),
      ]),
    ]);
    if (pointer) stage.dataset.pointer = String(pointer);
    const el = h('figure', {
      class: `photo photo--${frame}`,
      dataset: { tone: String(n % 3), reveal },
    }, [
      h('div', { class: 'photo__well' }, [
        stage,
        h('span', { class: 'photo__veil', 'aria-hidden': 'true' }),
      ]),
      frame === 'polaroid' && mem.caption ? h('figcaption', { class: 'photo__chin hand', text: mem.caption }) : null,
      frame === 'polaroid' || frame === 'mat' ? h('span', { class: 'photo__paper', 'aria-hidden': 'true' }) : null,
    ]);
    if (sway) el.dataset.sway = '';
    el.style.setProperty('--stock', STOCKS[n % STOCKS.length]); // no two cards are quite the same cream
    el.style.setProperty('--d', `${tighten(delay)}ms`);
    el.style.setProperty('--t', `${time}ms`);
    if (kind) el.dataset.fx = kind;
    return { el, img };
  }

  /**
   * Places a print on the page and makes it tappable.
   *   flow   true = take part in normal layout; false = absolutely positioned by x/y/w
   *   tapes  strips of tape holding it down ('top', 'corner', 'both' or '')
   */
  function printSlot(mem, ctx, figOpts, { flow = false, interactive = true, tapeDelay = 900, lift = 1.07, label = '' } = {}) {
    const fig = photoFigure(mem, ctx, figOpts);
    const [a, b] = String(mem.ratio).split('/').map(Number);
    const slot = h('div', { class: `slot${flow ? ' slot--flow' : ''}` }, [fig.el]);
    slot.style.setProperty('--tilt', `${mem.rotation || 0}deg`);
    slot.style.setProperty('--open-zoom', String(lift));
    slot.style.aspectRatio = `${a || 4} / ${b || 5}`;
    if (!flow && mem.w != null) {
      slot.style.left = `${mem.x}%`;
      slot.style.top = `${mem.y}%`;
      slot.style.width = `${mem.w}%`;
    }
    for (const kind of mem.tape === 'both' ? ['top', 'corner'] : mem.tape ? [mem.tape] : []) {
      slot.append(fx(h('span', { class: `tape tape--${kind}`, 'aria-hidden': 'true' }), 'fade', tapeDelay, 700));
    }
    if (label) slot.append(fx(h('span', { class: 'slot__no', 'aria-hidden': 'true', text: label }), 'fade', tapeDelay, 600));
    const hasText = mem.caption || mem.description || mem.date;
    if (interactive && hasText) {
      Object.assign(slot.dataset, {
        memory: '',
        caption: mem.caption,
        date: mem.date ? formatDate(mem.date, ctx.cfg.site.language) : '',
        description: mem.description,
        full: mem.full ? assetUrl(mem.full, ctx.cfg) : '',
      });
      slot.setAttribute('role', 'button');
      slot.setAttribute('tabindex', '0');
      slot.setAttribute('aria-expanded', 'false');
      slot.setAttribute('aria-label', mem.alt || mem.caption || ctx.cfg.ui.photograph);
    }
    return { el: slot, img: fig.img };
  }

  /** The paper slip that carries the caption, date and description of the open photograph. */
  const memoSlip = () => h('div', { class: 'memo', 'aria-live': 'polite' }, [
    h('span', { class: 'tape tape--top', 'aria-hidden': 'true' }),
    h('p', { class: 'eyebrow memo__date' }),
    h('p', { class: 'hand memo__cap' }),
    h('p', { class: 'memo__desc' }),
  ]);

  const STOCKS = ['#faf6ec', '#f6efdf', '#fcfaf3', '#f3ebd9'];

  const metaLine = (ctx, date) =>
    h('p', { class: 'eyebrow meta' }, [
      h('span', { text: `No. ${pad2(ctx.no)}` }),
      date ? h('span', { class: 'meta__date', text: formatDate(date, ctx.cfg.site.language) }) : null,
    ]);

  function result(layout, spec, el, imgs = [], tone = 'ivory') {
    return { layout, tone, imgs, el, label: spec.title || spec.heading || spec.caption || spec.numeral || '' };
  }

  /** A hand-drawn botanical sprig; its strokes draw themselves on. */
  function sprig() {
    const NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 60 130');
    svg.setAttribute('class', 'sprig');
    svg.setAttribute('aria-hidden', 'true');
    [
      'M30 128 C27 96 34 62 30 8',
      'M29 98 C13 94 7 80 9 70 C22 72 28 84 29 98',
      'M31 84 C47 80 53 66 51 56 C38 58 32 70 31 84',
      'M29.5 66 C16 62 11 50 13 41 C24 43 29 54 29.5 66',
      'M30.5 52 C43 48 48 37 46 29 C36 31 31 40 30.5 52',
      'M30 34 C21 30 18 22 19 15 C27 17 30 25 30 34',
    ].forEach((d, i) => {
      const path = document.createElementNS(NS, 'path');
      path.setAttribute('d', d);
      path.setAttribute('pathLength', '1');
      path.style.setProperty('--pi', String(i));
      svg.append(path);
    });
    return svg;
  }

  /* Default placement of each print, in % of the page (x, y = top-left, w = width),
     with a slight tilt. Overridden by `position` / `rotation` in config.js. */
  const PRESETS = {
    collage: [
      { x: 12, y: 5,  w: 52, ratio: '4/5', rotation: -2.2, tape: 'top' },
      { x: 57, y: 13, w: 33, ratio: '1/1', rotation: 3.1,  tape: 'corner' },
      { x: 14, y: 52, w: 40, ratio: '5/4', rotation: 1.6 },
      { x: 52, y: 44, w: 38, ratio: '4/5', rotation: -2.8, tape: 'top' },
      { x: 32, y: 71, w: 30, ratio: '1/1', rotation: 2.4,  tape: 'corner' },
    ],
    polaroids: [
      { x: 10, y: 5,  w: 47, ratio: '5/6', rotation: -3.2, tape: 'top' },
      { x: 51, y: 12, w: 42, ratio: '5/6', rotation: 2.6 },
      { x: 8,  y: 46, w: 42, ratio: '5/6', rotation: 1.8,  tape: 'corner' },
      { x: 46, y: 51, w: 46, ratio: '5/6', rotation: -2.1, tape: 'top' },
    ],
    // a tidy proof sheet: two columns of square frames, almost straight
    interactive: [
      { x: 15, y: 13,   w: 31, ratio: '1/1', rotation: -0.4 },
      { x: 55, y: 13.4, w: 31, ratio: '1/1', rotation: 0.5 },
      { x: 15, y: 39.6, w: 31, ratio: '1/1', rotation: 0.4 },
      { x: 55, y: 39,   w: 31, ratio: '1/1', rotation: -0.5 },
      { x: 15, y: 66,   w: 31, ratio: '1/1', rotation: -0.3 },
      { x: 55, y: 66.4, w: 31, ratio: '1/1', rotation: 0.4 },
    ],
  };

  /** A message written in a template literal -> paragraphs. A blank line starts a new paragraph;
      single line breaks and indentation are folded into ordinary flowing text. */
  function messageParagraphs(message) {
    return String(message || '').replace(/\r/g, '').split(/\n\s*\n/)
      .map((p) => p.split('\n').map((line) => line.trim()).filter(Boolean).join(' '))
      .filter(Boolean);
  }

  /** Splits a paragraph into sentences, keeping their punctuation. */
  function sentencesOf(paragraph) {
    const found = paragraph.match(/[^.!?…]+(?:[.!?…]+["”’')\]]*)?\s*/g);
    return found ? found.map((s) => s.trim()).filter(Boolean) : [paragraph];
  }

  const LAYOUTS = {
    /* 1 · Opening memory: one large print, taped down, with her name above and
       a handwritten line below. The picture is uncovered slowly. */
    opening(spec, ctx) {
      const mem = firstMemory(spec, { ratio: '4/5', rotation: -1.8, tape: 'top' });
      const slot = printSlot(mem, ctx,
        { frame: 'mat', kind: 'fade', reveal: 'up', time: 2400, depth: 5, pointer: 10, sizes: '(min-width: 768px) 40vw, 80vw' },
        { flow: true, tapeDelay: 1700, lift: 1.05 });
      const el = h('div', { class: 'page page--opening' }, [
        h('div', { class: 'opening__head' }, [
          fx(text('p', 'eyebrow', spec.eyebrow), 'fade', 200, 1100),
          words('h2', 'opening__name', spec.title || ctx.cfg.recipient.name, 450, 1500),
        ]),
        h('div', { class: 'opening__print' }, [slot.el]),
        h('div', { class: 'opening__foot' }, [
          hand('p', 'opening__caption', mem.caption, 2300, 1700),
          fx(text('p', 'eyebrow eyebrow--quiet', mem.date ? formatDate(mem.date, ctx.cfg.site.language) : ''), 'fade', 2900, 1200),
        ]),
        memoSlip(),
      ]);
      return result('opening', { title: spec.title || ctx.cfg.recipient.name, caption: mem.caption }, el, [slot.img]);
    },

    /* 2 · Photo collage: five prints laid down one by one, overlapping a little. */
    collage(spec, ctx) {
      const mems = memoriesOf(spec, PRESETS.collage);
      const slots = mems.map((mem, i) => {
        const s = printSlot(mem, ctx, {
          frame: i % 3 === 2 ? 'frame' : 'mat', kind: 'drop', reveal: 'fade',
          delay: i * 480, time: 1300, depth: [3, 6, 4, 7, 5][i], sway: i % 2 === 1, sizes: '(min-width: 768px) 28vw, 52vw',
        }, { tapeDelay: i * 480 + 1000 });
        s.el.style.setProperty('--z', String(i + 1));
        s.el.firstChild.style.setProperty('--fx-r', `${(i % 2 ? 1 : -1) * 4}deg`);
        s.el.firstChild.style.setProperty('--sway-delay', `${i * 1.1}s`);
        return s;
      });
      const el = h('div', { class: 'page page--collage' }, [...slots.map((s) => s.el), memoSlip()]);
      return result('collage', spec, el, slots.map((s) => s.img));
    },

    /* 3 · Full-screen-style photograph: the picture is the page. A curtain lifts,
       it settles from a slow push-in; tap for the caption. */
    full(spec, ctx) {
      const mem = firstMemory(spec, { ratio: '3/4' });
      const slot = printSlot(mem, ctx,
        { frame: 'bleed', reveal: 'up', time: 2800, depth: 4, pointer: 9, sizes: '(min-width: 768px) 50vw, 100vw' },
        { flow: true, lift: 1 });
      const el = h('div', { class: 'page page--full' }, [
        slot.el,
        h('div', { class: 'full__label' }, [
          fx(metaLine(ctx, mem.date), 'fade', 1700, 1300),
          words('h2', 'full__title', spec.title, 1900, 1300),
        ]),
        h('span', { class: 'full__scrim', 'aria-hidden': 'true' }),
        memoSlip(),
      ]);
      return result('full', { title: spec.title, caption: mem.caption }, el, [slot.img]);
    },

    /* 4 · Little things I love about you: a handwritten list, set down line by line. */
    list(spec, ctx) {
      const items = [].concat(spec.items || []).filter(Boolean);
      const mem = spec.photo || spec.photos ? firstMemory(spec, { ratio: '4/5', rotation: 3, tape: 'corner' }) : null;
      const photo = mem ? printSlot(mem, ctx,
        { frame: 'mat', kind: 'drop', reveal: 'fade', delay: 1100, time: 1300, depth: 5, sway: true, sizes: '(min-width: 768px) 24vw, 40vw' },
        { flow: true, tapeDelay: 2000 }) : null;
      const el = h('div', { class: 'page page--list' }, [
        h('div', { class: 'list__head' }, [
          fx(text('p', 'eyebrow', spec.eyebrow), 'fade', 150, 1000),
          words('h2', 'list__title', spec.heading, 300, 1300),
        ]),
        h('ol', { class: 'list__items' }, items.map((item, i) => {
          const li = h('li', { class: 'list__item' }, [
            h('span', { class: 'list__num', 'aria-hidden': 'true', text: pad2(i + 1) }),
            h('span', { class: 'list__text', text: typeof item === 'string' ? item : item.text }),
          ]);
          li.style.setProperty('--rd', `${tighten(900 + i * 560)}ms`);
          fx(li, 'rise', 0, 1100);
          li.dataset.line = '';
          return li;
        })),
        photo ? h('div', { class: 'list__photo' }, [photo.el]) : null,
        memoSlip(),
      ]);
      return result('list', { heading: spec.heading }, el, photo ? [photo.img] : []);
    },

    /* 5 · Timeline: a gold line grows down the page; each moment is set against it in turn. */
    timeline(spec, ctx) {
      const entries = memoriesOf(spec, [0, 1, 2, 3].map((i) => ({ ratio: '1/1', rotation: [-2, 1.6, -1.2, 2.2][i] })));
      const rows = entries.map((mem, i) => {
        const s = printSlot(mem, ctx,
          { frame: 'mat', reveal: 'left', time: 1200, delay: 160, depth: 4, sizes: '(min-width: 768px) 20vw, 30vw' },
          { flow: true, tapeDelay: 99999, lift: 1.1 });
        const date = mem.date ? formatDate(mem.date, ctx.cfg.site.language) : '';
        const row = h('div', { class: 'tl__row' }, [
          fx(h('span', { class: 'tl__node', 'aria-hidden': 'true' }), 'draw-dot', 0, 700),
          s.el,
          h('div', { class: 'tl__text' }, [
            date ? fx(h('p', { class: 'eyebrow', text: date }), 'fade', 420, 1000) : null,
            hand('p', 'tl__caption', mem.caption, 560, 1300),
          ]),
        ]);
        row.style.setProperty('--rd', `${tighten(900 + i * 850)}ms`);
        return { row, img: s.img };
      });
      const el = h('div', { class: 'page page--timeline' }, [
        h('div', { class: 'tl__head' }, [
          fx(metaLine(ctx), 'fade', 100, 1000),
          words('h2', 'tl__heading', spec.heading, 250, 1200),
        ]),
        h('div', { class: 'tl__rows' }, [
          fx(h('span', { class: 'tl__line', 'aria-hidden': 'true' }), 'draw-line', 700, 3400),
          ...rows.map((r) => r.row),
        ]),
        memoSlip(),
      ]);
      return result('timeline', { heading: spec.heading }, el, rows.map((r) => r.img));
    },

    /* 6 · Polaroids: instant prints with the caption written on the white border. */
    polaroids(spec, ctx) {
      const mems = memoriesOf(spec, PRESETS.polaroids);
      const slots = mems.map((mem, i) => {
        const s = printSlot(mem, ctx, {
          frame: 'polaroid', kind: 'drop', reveal: 'develop',
          delay: i * 650, time: 1500, depth: [4, 6, 3, 5][i], sway: i % 2 === 0, sizes: '(min-width: 768px) 24vw, 42vw',
        }, { tapeDelay: i * 650 + 1100 });
        s.el.style.setProperty('--z', String(i + 1));
        s.el.firstChild.style.setProperty('--fx-r', `${(i % 2 ? 1 : -1) * 5}deg`);
        s.el.firstChild.style.setProperty('--sway-delay', `${i * 1.4}s`);
        return s;
      });
      const el = h('div', { class: 'page page--polaroids' }, [...slots.map((s) => s.el), memoSlip()]);
      return result('polaroids', spec, el, slots.map((s) => s.img));
    },

    /* 7 · Interactive memory: a proof sheet of small frames. Tap one and it comes
       forward while the rest step back — an orderly page after the scattered ones. */
    interactive(spec, ctx) {
      const mems = memoriesOf(spec, PRESETS.interactive);
      const slots = mems.map((mem, i) => {
        const s = printSlot(mem, ctx, {
          frame: 'frame', kind: 'rise', reveal: 'fade',
          delay: 700 + i * 300, time: 1100, depth: 4, sizes: '(min-width: 768px) 20vw, 34vw',
        }, { tapeDelay: 700 + i * 300 + 500, lift: 1, label: pad2(i + 1) });
        s.el.style.setProperty('--z', String(i + 1));
        return s;
      });
      const el = h('div', { class: 'page page--interactive', dataset: { mode: 'lift' } }, [
        hand('p', 'interactive__title', spec.heading, 150, 1500),
        ...slots.map((s) => s.el),
        fx(text('p', 'interactive__hint eyebrow', spec.hint), 'fade', 2600, 1400),
        memoSlip(),
      ]);
      return result('interactive', { heading: spec.heading }, el, slots.map((s) => s.img), 'proof');
    },

    /* 8 · The finale. One photograph, almost no ornament, and a slow sequence of scenes
       (see createFinale): "One last thing…" -> the photograph develops with the greeting
       -> the message, one sentence at a time -> a closing line. CSS decides what each
       scene looks like; only the words and the photograph come from config.js. */
    finale(spec, ctx) {
      const name = ctx.cfg.recipient.name;
      const mem = firstMemory(spec, { ratio: '3/4' });
      const fig = photoFigure(mem, ctx,
        { frame: 'bleed', reveal: 'develop', depth: 4, pointer: 8, sizes: '(min-width: 768px) 50vw, 100vw' });
      fig.el.classList.add('finale__photo');

      // The name rises out of a mask. --chars lets CSS shrink a long name to fit a narrow phone.
      const parts = String(name || '').split(/\s+/).filter(Boolean);
      const nameEl = h('h2', { class: 'finale__name' });
      parts.forEach((word, i) => {
        const mask = h('span', { class: 'fn' }, [h('span', { class: 'fn__in', text: word })]);
        mask.style.setProperty('--wi', String(i));
        nameEl.append(mask);
        if (i < parts.length - 1) nameEl.append(' ');
      });
      nameEl.style.setProperty('--chars', String(Math.max(4, ...parts.map((w) => w.length))));

      // The message: blank line = new paragraph; each sentence is revealed on its own.
      const paragraphs = messageParagraphs(spec.message).map((p) => {
        const para = h('p', { class: 'finale__p' });
        const list = sentencesOf(p);
        list.forEach((sentence, i) => {
          const span = h('span', { class: 'fs', text: sentence, dataset: { w: String(sentence.split(/\s+/).length) } });
          if (i === list.length - 1) span.dataset.end = '';
          para.append(span, ' ');
        });
        return para;
      });

      const el = h('div', { class: 'page page--finale', dataset: { scene: 'idle', pace: String(Number(spec.pace) || 190) } }, [
        fig.el,
        h('span', { class: 'finale__shade', 'aria-hidden': 'true' }),
        h('span', { class: 'finale__scrim', 'aria-hidden': 'true' }),
        text('p', 'finale__lead', spec.lead),
        h('div', { class: 'finale__greet' }, [text('p', 'finale__hb', spec.greeting), nameEl]),
        h('div', { class: 'finale__scroll', tabindex: '0', role: 'region', 'aria-label': spec.messageLabel || 'Message' }, [
          h('div', { class: 'finale__inner' }, [
            ...paragraphs,
            h('div', { class: 'finale__end' }, [
              h('span', { class: 'rule', 'aria-hidden': 'true' }),
              text('p', 'finale__closing', spec.closing),
              spec.restartLabel
                ? h('button', { class: 'finale__again', type: 'button', dataset: { action: 'restart' }, text: spec.restartLabel })
                : null,
            ]),
          ]),
        ]),
      ]);
      return result('finale', { title: `${spec.greeting || ''} ${name || ''}`.trim() }, el, [fig.img], 'ink');
    },

    /* ---- simple typographic pages, kept for flexibility ---- */

    /* Cover plate. */
    title(spec, ctx) {
      const { cfg } = ctx;
      const date = spec.showDate === false ? '' : formatDate(cfg.birthday.date, cfg.site.language);
      const el = h('div', { class: 'page page--title' }, [
        fx(text('p', 'eyebrow', spec.eyebrow), 'fade', 700, 1400),
        h('div', { class: 'title__mid' }, [
          words('h2', 'title__name', cfg.recipient.name, 1000, 1700),
          fx(h('span', { class: 'rule', 'aria-hidden': 'true' }), 'draw', 1900, 1200),
          fx(text('p', 'title__subtitle', spec.subtitle), 'rise', 2200, 1500),
        ]),
        fx(text('p', 'eyebrow eyebrow--quiet', date), 'fade', 3000, 1600),
      ]);
      return { ...result('title', { title: cfg.recipient.name }, el), imgs: [] };
    },

    /* Wine divider. */
    chapter(spec) {
      const el = h('div', { class: 'page page--chapter' }, [
        fx(text('p', 'chapter__numeral', spec.numeral), 'rise', 300, 1800),
        h('div', { class: 'chapter__text' }, [
          fx(h('span', { class: 'rule', 'aria-hidden': 'true' }), 'draw', 1300, 1200),
          words('h2', 'chapter__title', spec.title, 1600, 1400),
          fx(text('p', 'chapter__caption', spec.caption), 'rise', 2300, 1500),
        ]),
      ]);
      return result('chapter', spec, el, [], 'wine');
    },

    /* The written message; tap the page for a small surprise. */
    note(spec) {
      const paragraphs = [].concat(spec.paragraphs || []).filter(Boolean);
      const el = h('div', { class: 'page page--note' }, [
        fx(text('p', 'eyebrow', spec.heading), 'fade', 200, 1100),
        h('div', { class: 'note__body' }, paragraphs.map(
          (p, i) => fx(h('p', { class: 'note__p', text: p }), 'rise', 600 + i * 1000, 1500),
        )),
        h('div', { class: 'note__sign' }, [
          fx(text('p', 'note__signoff', spec.signoff), 'fade', 600 + paragraphs.length * 1000, 1200),
          hand('p', 'note__signature', spec.signature, 900 + paragraphs.length * 1000, 1700),
          fx(h('span', { class: 'note__spark', 'aria-hidden': 'true' }), 'fade', 3600 + paragraphs.length * 600, 1200),
        ]),
        h('div', { class: 'note__sprig', style: '--d:500ms', 'aria-hidden': 'true' }, [sprig()]),
      ]);
      return result('note', spec, el);
    },

    /* Plain closing page. */
    closing(spec) {
      const el = h('div', { class: 'page page--closing' }, [
        words('h2', 'closing__heading', spec.heading, 1700, 2400),
        fx(h('span', { class: 'rule', 'aria-hidden': 'true' }), 'draw', 3600, 2000),
        fx(text('p', 'closing__text', spec.text), 'rise', 4200, 2200),
        spec.restartLabel
          ? fx(h('button', { class: 'btn btn--onwine', type: 'button', dataset: { action: 'restart' } }, [
              h('span', { text: spec.restartLabel }),
            ]), 'fade', 6000, 2000)
          : null,
      ]);
      return result('closing', spec, el, [], 'wine-deep');
    },
  };

  function buildPages(cfg) {
    let photoCount = 0;
    return cfg.pages.map((spec, i) => {
      let build = LAYOUTS[spec.layout];
      if (!build) {
        console.warn(`[album] Unknown layout "${spec.layout}" on page ${i + 1}; using "opening".`);
        build = LAYOUTS.opening;
      }
      return build(spec, { cfg, no: i + 1, photo: () => ++photoCount });
    });
  }

  /* ------------------------------------------------------------------------
     4. Image loading
        Photos get their `src` only when the reader gets near them. A photo
        that is missing or fails to load shows an intentional placeholder plate
        instead of a broken-image icon.
     ------------------------------------------------------------------------ */
  function loadImage(img, priority = 'auto') {
    if (img.dataset.state) return;
    if (img.offsetParent === null && img.dataset.src) return; // hidden at this size (e.g. an optional photo): skip
    const frame = img.closest('.photo');
    const src = img.dataset.src;
    if (!src) {
      frame.classList.add('is-missing');
      img.dataset.state = 'error';
      return;
    }
    img.dataset.state = 'loading';
    img.addEventListener('load', () => {
      img.dataset.state = 'done';
      frame.classList.add('is-loaded');
    }, { once: true });
    img.addEventListener('error', () => {
      img.dataset.state = 'error';
      frame.classList.add('is-missing');
    }, { once: true });
    img.fetchPriority = priority; // the page being read first, neighbours when idle
    if (img.dataset.srcset) {
      if (img.dataset.sizes) img.sizes = img.dataset.sizes;
      img.srcset = img.dataset.srcset;
    }
    img.src = src;
  }

  /* ------------------------------------------------------------------------
     5. Book engine
     ------------------------------------------------------------------------ */
  const TURN_MS = 860;        // a full, undisturbed page turn
  const MIN_MS = 300;         // shortest tween (small corrections)
  const MAX_ANGLE = 96;       // degrees at p = 1 (page is edge-on, hidden, at 90)
  const FADE_FROM = 0.78;     // leaf fades out over the last stretch of the turn
  const FADE_SPAN = 0.17;
  const PEEK = 0.045;         // how far a page lifts when the pointer hovers its edge

  const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);

  function createBook(pages, dom, fxs, hooks) {
    const total = pages.length;
    let index = 0;
    let peek = null; // 'next' | 'prev' | null
    let raf = 0;

    const leaves = pages.map((page, i) => {
      const spine = h('span', { class: 'leaf__spine', 'aria-hidden': 'true' });
      const cast = h('span', { class: 'leaf__cast', 'aria-hidden': 'true' });
      const face = h('div', { class: 'leaf__face' }, [page.el, spine, cast]);
      const shade = h('span', { class: 'leaf__shade', 'aria-hidden': 'true' });
      const el = h('section', {
        class: 'leaf',
        role: 'group',
        dataset: { tone: page.tone, layout: page.layout },
      }, [face, shade]);
      el.style.zIndex = String(total - i); // lower pages sit on top of higher ones
      dom.hotPrev.before(el);
      return {
        el, shade, cast,
        par: [...el.querySelectorAll('[data-depth]')].map((n) => ({
          el: n, depth: Number(n.dataset.depth) || 0, zoom: Number(n.dataset.zoom) || 1,
        })),
        p: 0,            // 0 = flat on the stack, 1 = turned away
        anim: null,      // { from, to, t0, dur, ease }
        held: false,     // true while a finger/mouse is dragging this leaf
        live: false,     // visible and promoted to its own compositor layer
        fade: 1,
        entered: false,  // its entrance choreography has started
      };
    });

    /* ---- painting: transform + opacity only ---- */
    function paintParallax(i) {
      const L = leaves[i];
      if (!L.par.length) return;
      const k = fxs.parallax;
      const revealed = i === 0 ? 1 : leaves[i - 1].p; // how far the page above has lifted
      for (const item of L.par) {
        const x = item.depth * k * ((1 - revealed) - L.p);
        item.el.style.transform = `translate3d(${x.toFixed(2)}%,0,0) scale(${item.zoom})`;
      }
    }

    function paint(i) {
      const L = leaves[i];
      const { p } = L;
      let fade;
      if (fxs.reduced) {
        // Reduced motion: no rotation, shade or shadow — the pages simply cross-fade.
        L.el.style.transform = 'none';
        fade = 1 - p;
        L.shade.style.opacity = '0';
        if (leaves[i + 1]) leaves[i + 1].cast.style.opacity = '0';
      } else {
        const lift = Math.sin(Math.PI * p);
        L.el.style.transform = `rotateY(${(-p * MAX_ANGLE).toFixed(2)}deg) rotateX(${(lift * 1.3).toFixed(2)}deg)`;
        fade = p > FADE_FROM ? clamp(1 - (p - FADE_FROM) / FADE_SPAN, 0, 1) : 1;
        L.shade.style.opacity = (Math.min(1, p * 1.1) * 0.8).toFixed(3);
        if (leaves[i + 1]) leaves[i + 1].cast.style.opacity = (lift * 0.9).toFixed(3);
      }
      if (fade !== L.fade) { L.fade = fade; L.el.style.opacity = String(fade); }
      paintParallax(i);
      if (leaves[i + 1]) paintParallax(i + 1);
    }

    /**
     * Only the pages that can be seen are rendered: turned-away leaves are
     * skipped, then every leaf down to (and including) the first one that is
     * lying flat. Everything else stays `visibility:hidden`.
     */
    function updateVisibility() {
      let i = 0;
      while (i < total && leaves[i].p >= 0.999 && !leaves[i].held) i++;
      const live = new Set();
      for (let j = i; j < total; j++) {
        live.add(j);
        if (leaves[j].p <= 0.001 && !leaves[j].held) break;
      }
      const canEnter = hooks.canEnter ? hooks.canEnter() : false;
      leaves.forEach((L, k) => {
        const on = live.has(k);
        if (on !== L.live) { L.live = on; L.el.classList.toggle('is-live', on); }
        // A page's entrance starts once the page above has begun to lift (or
        // right away if nothing covers it). It resets once the page is hidden.
        const revealed = on && canEnter && (k === 0 || leaves[k - 1].p > 0.04 || L.p > 0.001);
        if (revealed && !L.entered) {
          L.entered = true;
          // A page coming back down onto the stack was already seen: show it complete.
          if (hooks.enter) hooks.enter(k, L.p > 0.001);
        } else if (!on && L.entered) {
          L.entered = false;
          if (hooks.leave) hooks.leave(k);
        }
      });
    }

    function targetOf(i) {
      let t = i < index ? 1 : 0;
      if (peek === 'next' && i === index && index < total - 1) t = PEEK;
      if (peek === 'prev' && i === index - 1) t = 1 - PEEK;
      return t;
    }

    /* ---- animation loop: runs only while something is moving ---- */
    function tick(time) {
      raf = 0;
      let busy = false;
      for (let i = 0; i < total; i++) {
        const L = leaves[i];
        const a = L.anim;
        if (!a) continue;
        const t = (time - a.t0) / a.dur;
        if (t < 0) { busy = true; continue; }          // waiting out its stagger delay
        if (t >= 1) {
          L.p = a.to; L.anim = null;
          if (a.to === 0 && a.from > 0.5 && hooks.land) hooks.land(i);
        }
        else { L.p = a.from + (a.to - a.from) * a.ease(t); busy = true; }
        paint(i);
      }
      updateVisibility();
      if (busy) raf = requestAnimationFrame(tick);
    }
    const kick = () => { if (!raf) raf = requestAnimationFrame(tick); };

    function start(i, to, delay, speed) {
      const L = leaves[i];
      const dist = Math.abs(to - L.p);
      const atRest = L.p <= 0.0005 || L.p >= 0.9995;
      // From rest the page lifts gently; if it is already moving (released drag,
      // interrupted turn) it simply decelerates into place.
      // The leaf that uncovers the last page turns very slowly (the finale slower still): the final reveal.
      const intoFinale = pages[total - 1] && pages[total - 1].layout === 'finale';
      const slow = i === total - 2 && total > 2 ? (intoFinale ? 2.7 : 1.8) : 1;
      L.anim = {
        from: L.p,
        to,
        t0: now() + delay,
        dur: fxs.reduced
          ? 380
          : Math.max(MIN_MS, (TURN_MS * slow * Math.pow(dist, 0.75)) / (slow > 2 ? 1 : clamp(speed, 1, 2.4))),
        ease: atRest && !fxs.reduced ? easeInOut : easeOut,
      };
    }

    /** Bring every leaf to where the current index says it should be. */
    function settle({ immediate = false, speed = 1 } = {}) {
      const away = [];
      const back = [];
      for (let i = 0; i < total; i++) {
        const L = leaves[i];
        if (L.held) continue;
        const target = targetOf(i);
        if (immediate) {
          L.anim = null;
          L.p = target;
          paint(i);
          continue;
        }
        if (L.anim ? L.anim.to === target : Math.abs(L.p - target) < 0.001) {
          if (!L.anim && L.p !== target) { L.p = target; paint(i); }
          continue; // already heading there (or there): never restart a tween
        }
        (target > L.p ? away : back).push(i);
      }
      back.reverse(); // pages returning to the stack land top-most last
      for (const group of [away, back]) {
        const step = group.length > 1 ? Math.min(70, 360 / (group.length - 1)) : 0;
        group.forEach((i, k) => start(i, targetOf(i), k * step, speed));
      }
      updateVisibility();
      kick();
    }

    for (let i = 0; i < total; i++) paint(i);
    updateVisibility();

    return {
      leaves,
      get total() { return total; },
      setIndex(next, opts) { index = next; peek = null; settle(opts); },
      setPeek(dir) { if (peek !== dir) { peek = dir; settle(); } },
      /** Take hold of a leaf (stops its tween). Returns its current progress. */
      grab(i) { const L = leaves[i]; L.anim = null; L.held = true; peek = null; return L.p; },
      setProgress(i, p) { leaves[i].p = clamp(p, 0, 1); paint(i); updateVisibility(); },
      progress: (i) => leaves[i].p,
      drop(i) { leaves[i].held = false; },
      /** Re-run settle (e.g. after a cancelled drag). */
      settle,
      /** Re-evaluate which pages are visible/entered (e.g. when the album opens). */
      refresh() { updateVisibility(); },
      /** Repaint every leaf (e.g. after the motion tier or reduced-motion changed). */
      repaint() { for (let i = 0; i < total; i++) paint(i); },
      /** Forget all entrances (e.g. when the album is closed). */
      resetEntrances() {
        leaves.forEach((L, k) => { if (L.entered) { L.entered = false; if (hooks.leave) hooks.leave(k); } });
      },
      /** True while any leaf is still moving. */
      get busy() { return leaves.some((L) => L.anim); },
    };
  }

  /* ------------------------------------------------------------------------
     6. Album controller
     ------------------------------------------------------------------------ */
  function createAlbum(cfg, pages, dom, fxs, hooks) {
    const bus = emitter();
    const total = pages.length;
    const state = { index: 0, view: 'gate', direction: 'forward' };
    const book = createBook(pages, dom, fxs, hooks);

    book.leaves.forEach((leaf, i) => {
      leaf.el.setAttribute('aria-label', `${cfg.ui.page} ${i + 1} ${cfg.ui.of} ${total}`);
    });
    dom.stage.setAttribute('aria-label', cfg.site.title);
    dom.counterTotal.textContent = pad2(total);

    /* ---- rendering ---- */
    // Only the page being read (high priority) and its immediate neighbours are loaded.
    function warm() {
      const at = state.index;
      for (let i = at - 1; i <= at + 1; i++) pages[i]?.imgs.forEach((img) => loadImage(img, i === at ? 'high' : 'low'));
    }

    function render(opts) {
      const { index } = state;
      book.leaves.forEach((leaf, i) => {
        const current = i === index;
        leaf.el.classList.toggle('is-current', current);
        leaf.el.inert = !current;
        leaf.el.setAttribute('aria-hidden', String(!current));
      });
      // Warm up the current page and its neighbours.
      warm();

      book.setIndex(index, opts);
      dom.stage.dataset.direction = state.direction;
      dom.album.dataset.layout = pages[index].layout; // lets CSS tint the light per page
      dom.counterCurrent.textContent = pad2(index + 1);
      dom.album.style.setProperty('--progress', total > 1 ? (index / (total - 1)).toFixed(4) : '1');
      dom.prev.setAttribute('aria-disabled', String(index === 0));
      dom.next.setAttribute('aria-disabled', String(index === total - 1));
      dom.hotPrev.dataset.disabled = String(index === 0);
      dom.hotNext.dataset.disabled = String(index === total - 1);
      dom.status.textContent = `${cfg.ui.page} ${index + 1} ${cfg.ui.of} ${total}. ${pages[index].label || ''}`;
      writeHash();
    }

    /* ---- location hash: #3 opens page 3 (1-based) ---- */
    function readHash() {
      const m = /^#(\d+)$/.exec(location.hash);
      return m ? clamp(Number(m[1]) - 1, 0, total - 1) : 0;
    }
    function writeHash() {
      if (state.view !== 'album') return;
      const hash = `#${state.index + 1}`;
      if (location.hash !== hash) history.replaceState(null, '', hash);
    }

    /* ---- navigation ---- */
    function go(to, source = 'api', opts = {}) {
      const next = clamp(Math.round(to), 0, total - 1);
      if (next === state.index) { book.settle(); return; } // e.g. a cancelled swipe
      const from = state.index;
      state.direction = next > from ? 'forward' : 'back';
      state.index = next;
      render(opts);
      bus.emit('change', { from, to: next, direction: state.direction, source });
    }

    function setView(view) {
      if (state.view === view) return;
      state.view = view;
      document.body.dataset.view = view;
      dom.gate.inert = view !== 'gate';
      dom.album.inert = view !== 'album';
      if (view === 'album') {
        writeHash();
        dom.stage.focus({ preventScroll: true });
      } else {
        dom.openBtn.focus({ preventScroll: true });
      }
      bus.emit('view', { view });
    }

    state.index = readHash();
    dom.gate.inert = false;
    render({ immediate: true });

    return {
      get index() { return state.index; },
      get total() { return total; },
      get view() { return state.view; },
      book,
      on: bus.on,
      go,
      next: (source, opts) => go(state.index + 1, source, opts),
      prev: (source, opts) => go(state.index - 1, source, opts),
      warm,
      first: (source) => go(0, source),
      last: (source) => go(total - 1, source),
      open: () => setView('album'),
      close: () => setView('gate'),
      syncFromHash: () => go(readHash(), 'hash'),
    };
  }

  /* ------------------------------------------------------------------------
     7. Motion
        Everything that makes a page feel alive once it is on screen. The CSS
        does the choreography (entrances, drift, sway, light, grain) from the
        classes this module toggles; JS only handles what CSS cannot:
          - starting / resetting each page's entrance            (hooks.enter/leave)
          - the small canvas particle fields on a few pages      (dust, petals, sparks)
          - desktop pointer parallax and the following light
          - the little settle a page does when it lands on the stack
        One shared requestAnimationFrame loop drives every particle field and
        runs only while a field is active; phones are capped at ~30fps.
     ------------------------------------------------------------------------ */
  const SCENES = {
    title:   { dust: 1 },
    chapter: { dust: 1.2 },
    closing: { dust: 1.8, ramp: 9000 },  // the finale gathers slowly
    note:    { dust: 0.5, petals: true }, // tap the page for petals
  };
  const PETALS = ['#8f2d44', '#b8935a', '#e9dcc0', '#a63a55'];

  let glow = null;
  function glowSprite() {
    if (glow) return glow;
    glow = document.createElement('canvas');
    glow.width = glow.height = 48;
    const g = glow.getContext('2d');
    const grad = g.createRadialGradient(24, 24, 0, 24, 24, 24);
    grad.addColorStop(0, 'rgba(244, 218, 164, 1)');
    grad.addColorStop(0.3, 'rgba(214, 170, 110, 0.55)');
    grad.addColorStop(1, 'rgba(214, 170, 110, 0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 48, 48);
    return glow;
  }

  /** A transparent canvas inside a page: drifting dust plus short-lived petals/sparks. */
  function createField(face, scene, fxs) {
    const canvas = h('canvas', { class: 'fx-canvas', 'aria-hidden': 'true' });
    face.insertBefore(canvas, face.querySelector('.leaf__spine'));
    const ctx = canvas.getContext('2d');
    const motes = [];
    const bits = [];
    let W = 0;
    let H = 0;
    let born = 0;

    const rand = (a, b) => a + Math.random() * (b - a);

    function resize() {
      const w = face.clientWidth;
      const h2 = face.clientHeight;
      if (!w || !h2) return;
      const dpr = Math.min(window.devicePixelRatio || 1, fxs.tier === 'phone' ? 1.5 : 2);
      W = w; H = h2;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h2 * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    if (typeof ResizeObserver !== 'undefined') new ResizeObserver(resize).observe(face);

    const mote = (initial) => {
      const z = Math.random(); // depth: far motes are small, dim and slow
      return {
        nx: Math.random(), ny: initial ? Math.random() : 1.04, z,
        r: 2.2 + z * 4.2, vy: -(0.008 + z * 0.026), sway: 5 + z * 11,
        ph: Math.random() * 6.28, tw: 0.5 + Math.random() * 1.1, a: 0.28 + z * 0.5,
      };
    };

    function seed() {
      const n = Math.round(fxs.dust * (scene.dust || 0));
      motes.length = 0;
      for (let i = 0; i < n; i++) motes.push(mote(true));
    }

    function burst(x, y, n) {
      const cap = fxs.tier === 'phone' ? 34 : 60;
      for (let i = 0; i < n && bits.length < cap; i++) {
        bits.push({
          kind: 'petal', x, y,
          vx: rand(-90, 90), vy: -rand(60, 170),
          rot: rand(0, 6.28), vr: rand(-4, 4), s: rand(4.5, 9), flip: rand(0, 6.28),
          life: 0, max: rand(2.4, 3.6), col: PETALS[(Math.random() * PETALS.length) | 0],
        });
      }
    }

    function spark(x, y) {
      if (bits.length > 46) return;
      bits.push({ kind: 'spark', x, y, vx: rand(-14, 14), vy: -rand(8, 26), s: rand(2.5, 5), life: 0, max: rand(0.9, 1.6) });
    }

    function step(dt, t) {
      if (!W) resize();
      ctx.clearRect(0, 0, W, H);
      const sprite = glowSprite();

      const ramp = scene.ramp ? 0.25 + 0.75 * Math.min(1, (t * 1000 - born) / scene.ramp) : 1;
      const shown = Math.round(motes.length * ramp);
      for (let i = 0; i < shown; i++) {
        const m = motes[i];
        m.ny += m.vy * dt;
        if (m.ny < -0.05) Object.assign(m, mote(false));
        const edge = clamp(m.ny / 0.14, 0, 1) * clamp((1.04 - m.ny) / 0.14, 0, 1);
        const alpha = m.a * edge * (0.65 + 0.35 * Math.sin(t * m.tw + m.ph));
        if (alpha < 0.02) continue;
        ctx.globalAlpha = alpha;
        const x = m.nx * W + Math.sin(t * 0.35 + m.ph) * m.sway;
        ctx.drawImage(sprite, x - m.r, m.ny * H - m.r, m.r * 2, m.r * 2);
      }

      for (let i = bits.length - 1; i >= 0; i--) {
        const b = bits[i];
        b.life += dt;
        if (b.life >= b.max) { bits.splice(i, 1); continue; }
        const fade = clamp((b.max - b.life) / 0.7, 0, 1);
        if (b.kind === 'spark') {
          b.x += b.vx * dt; b.y += b.vy * dt;
          ctx.globalAlpha = fade * 0.8;
          ctx.drawImage(sprite, b.x - b.s, b.y - b.s, b.s * 2, b.s * 2);
          continue;
        }
        b.vy += 150 * dt;                         // gravity
        b.vx *= 1 - 0.9 * dt; b.vy *= 1 - 1.3 * dt; // air drag: petals float, they do not fall
        b.x += (b.vx + Math.sin(b.life * 4 + b.flip) * 26) * dt;
        b.y += b.vy * dt;
        b.rot += b.vr * dt;
        ctx.save();
        ctx.globalAlpha = fade * 0.9;
        ctx.translate(b.x, b.y);
        ctx.rotate(b.rot);
        ctx.scale(1, 0.5 + 0.5 * Math.abs(Math.sin(b.life * 5 + b.flip))); // tumbling
        ctx.fillStyle = b.col;
        ctx.beginPath();
        ctx.ellipse(0, 0, b.s, b.s * 0.55, 0, 0, 6.2832);
        ctx.fill();
        ctx.restore();
      }
      ctx.globalAlpha = 1;
    }

    return {
      canvas, burst, spark, step,
      begin(t) { born = t; seed(); resize(); },
      reseed: seed,
      end() { motes.length = 0; bits.length = 0; if (W) ctx.clearRect(0, 0, W, H); },
      point(e) { const r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top, w: r.width }; },
    };
  }

  /**
   * Directs the finale page through its scenes. CSS defines what each scene looks like
   * (the page's data-scene attribute); this only switches scene and, during the message,
   * reveals one sentence at a time at a pace that follows reading speed.
   *
   *   idle -> lead ("One last thing…") -> greeting (photograph + "Happy Birthday, NAME")
   *        -> message (sentence by sentence) -> end (closing line, "begin again")
   *
   * A tap moves things along (greeting -> message; message -> show it all). Touching or
   * scrolling the message stops it following along, so it can be read at her own pace.
   * With reduced motion the same beats play faster, as simple fades.
   */
  const FINALE = { lead: 1500, photo: 5200, message: 15000, firstSentence: 2400, skipSentence: 1600 };

  function createFinale(page, fxs) {
    const scroller = page.querySelector('.finale__scroll');
    const sentences = [...page.querySelectorAll('.fs')];
    const end = page.querySelector('.finale__end');
    const pace = (Number(page.dataset.pace) || 190) * (fxs.reduced ? 0.5 : 1); // ms of reading time per word
    let timers = [];
    let scene = 'idle';
    let userScrolled = false;

    const later = (ms, fn) => { timers.push(setTimeout(fn, ms)); };
    const clear = () => { timers.forEach(clearTimeout); timers = []; };
    const setScene = (next) => { scene = next; page.dataset.scene = next; };

    /** Keep the newest line comfortably in view, unless she has taken over the scrolling. */
    function follow(node) {
      if (userScrolled || !node) return;
      const r = node.getBoundingClientRect();
      const s = scroller.getBoundingClientRect();
      const over = r.bottom - (s.bottom - s.height * 0.18);
      if (over > 0) scroller.scrollBy({ top: over + s.height * 0.12, behavior: fxs.reduced ? 'auto' : 'smooth' });
    }
    function showSentence(node) { node.classList.add('is-in'); follow(node); }
    function showEnd() { end.classList.add('is-in'); follow(end); setScene('end'); }

    function scheduleMessage(from) {
      let t = from;
      sentences.forEach((node) => {
        if (node.classList.contains('is-in')) return;
        later(t, () => showSentence(node));
        t += clamp(Number(node.dataset.w) * pace, 900, 3800) + (node.dataset.end !== undefined ? 1100 : 0);
      });
      later(t + 500, showEnd);
    }

    function toMessage(first) {
      clear();
      setScene('message');
      scheduleMessage(first);
    }

    function advance() {
      if (scene === 'greeting') toMessage(FINALE.skipSentence);
      else if (scene === 'message') {
        clear();
        sentences.forEach((node) => node.classList.add('is-in'));
        showEnd();
      }
    }

    page.addEventListener('click', (e) => { if (!e.target.closest('button, a')) advance(); });
    for (const type of ['touchstart', 'wheel', 'pointerdown']) {
      scroller.addEventListener(type, () => { if (scene === 'message' || scene === 'end') userScrolled = true; }, { passive: true });
    }

    return {
      start() {
        clear();
        userScrolled = false;
        scroller.scrollTop = 0;
        setScene('idle');
        // Reduced motion keeps every beat but compresses the timing; the CSS turns movement into plain fades.
        const k = fxs.reduced ? 0.45 : 1;
        later(FINALE.lead * k, () => setScene('lead'));
        later(FINALE.photo * k, () => setScene('greeting'));
        later(FINALE.message * k, () => toMessage(FINALE.firstSentence * k));
      },
      stop() {
        clear();
        setScene('idle');
        sentences.forEach((node) => node.classList.remove('is-in'));
        end.classList.remove('is-in');
        scroller.scrollTop = 0;
      },
    };
  }

  function createMotion(album, dom, fxs) {
    const book = album.book;
    const leaves = book.leaves;
    const fields = new Map();   // leaf index -> field
    const finales = new Map();  // leaf index -> finale director
    const active = new Set();
    let raf = 0;
    let last = 0;
    let opening = 0;            // until this time the first page waits for the album to fade in
    let landTimer = 0;

    /* ---- shared particle loop ---- */
    function loop(t) {
      raf = 0;
      if (!active.size) return;
      if (last && (fxs.tier === 'phone' || fxs.lite) && t - last < 30) { raf = requestAnimationFrame(loop); return; }
      const dt = last ? Math.min(0.05, (t - last) / 1000) : 0.016;
      last = t;
      active.forEach((f) => f.step(dt, t / 1000));
      raf = requestAnimationFrame(loop);
    }
    const wake = () => { if (!raf) { last = 0; raf = requestAnimationFrame(loop); } };

    function startScene(i) {
      const scene = SCENES[leaves[i].el.dataset.layout];
      if (!scene || fxs.reduced) return;
      let field = fields.get(i);
      if (!field) {
        field = createField(leaves[i].el.querySelector('.leaf__face'), scene, fxs);
        fields.set(i, field);
        if (scene.petals) bindPetals(leaves[i].el, field);
      }
      field.begin(performance.now());
      active.add(field);
      wake();
    }

    function stopScene(i) {
      const field = fields.get(i);
      if (!field) return;
      field.end();
      active.delete(field);
    }

    /* Tap (or click) the message page: a small burst of petals. On a mouse,
       moving across the page also leaves a faint trail of light. */
    function bindPetals(leafEl, field) {
      let lastSpark = 0;
      leafEl.addEventListener('click', (e) => {
        if (fxs.reduced || !active.has(field)) return;
        const p = field.point(e);
        field.burst(p.x, p.y, fxs.tier === 'phone' ? 12 : 22);
      });
      leafEl.addEventListener('pointermove', (e) => {
        if (e.pointerType !== 'mouse' || fxs.reduced || !active.has(field)) return;
        const t = performance.now();
        if (t - lastSpark < 55) return;
        lastSpark = t;
        const p = field.point(e);
        field.spark(p.x, p.y);
      });
    }

    /* ---- desktop pointer parallax + the light that follows the pointer ---- */
    const follow = $('#light-follow');
    const targets = leaves.flatMap((L) =>
      [...L.el.querySelectorAll('[data-pointer]')].map((el) => ({ el, s: Number(el.dataset.pointer) || 0 })));
    const ptr = { tx: 0, ty: 0, x: 0, y: 0, raf: 0 };

    function ptrApply() {
      const on = fxs.tier === 'desktop' && !fxs.reduced;
      for (const t of targets) t.el.style.translate = on ? `${(-ptr.x * t.s).toFixed(2)}px ${(-ptr.y * t.s * 0.7).toFixed(2)}px` : '';
      if (follow) follow.style.translate = on ? `${(ptr.x * 70).toFixed(1)}px ${(ptr.y * 46).toFixed(1)}px` : '';
    }
    function ptrFrame() {
      ptr.raf = 0;
      ptr.x += (ptr.tx - ptr.x) * 0.07;
      ptr.y += (ptr.ty - ptr.y) * 0.07;
      ptrApply();
      if (Math.abs(ptr.tx - ptr.x) > 0.002 || Math.abs(ptr.ty - ptr.y) > 0.002) ptr.raf = requestAnimationFrame(ptrFrame);
    }
    window.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse' || fxs.tier !== 'desktop' || fxs.reduced || album.view !== 'album') return;
      ptr.tx = (e.clientX / window.innerWidth) * 2 - 1;
      ptr.ty = (e.clientY / window.innerHeight) * 2 - 1;
      if (!ptr.raf) ptr.raf = requestAnimationFrame(ptrFrame);
    }, { passive: true });

    /* ---- the settle when a page lands on the stack ---- */
    function flutter(i) {
      if (fxs.reduced) return;
      // Two identical keyframe sets, alternated, restart the settle without forcing a reflow.
      const el = leaves[i].el;
      const flip = el.classList.contains('is-landed-a');
      el.classList.remove('is-landed-a', 'is-landed-b');
      el.classList.add(flip ? 'is-landed-b' : 'is-landed-a');
    }
    album.on('change', ({ direction }) => {
      clearTimeout(landTimer);
      if (direction === 'forward') landTimer = setTimeout(() => flutter(album.index), 880);
    });

    /* ---- album open / close ---- */
    album.on('view', ({ view }) => {
      if (view === 'album') { opening = performance.now() + 1500; book.refresh(); } else book.resetEntrances();
    });

    fxs.onChange(() => {
      book.repaint();
      ptrApply();
      active.forEach((f) => (fxs.reduced ? f.end() : f.reseed()));
      if (fxs.reduced) active.clear();
    });

    return {
      canEnter: () => album.view === 'album',
      enter(i, instant) {
        const el = leaves[i].el;
        el.classList.remove('is-reset');
        el.classList.toggle('is-instant', instant);
        if (!instant && performance.now() < opening) el.style.setProperty('--base', '1100ms');
        else el.style.removeProperty('--base');
        el.classList.add('is-entered');
        startScene(i);
        if (el.dataset.layout === 'finale') {
          let director = finales.get(i);
          if (!director) { director = createFinale(el.querySelector('.page--finale'), fxs); finales.set(i, director); }
          director.start();
        }
      },
      leave(i) {
        const el = leaves[i].el;
        el.classList.remove('is-entered', 'is-instant', 'is-landed-a', 'is-landed-b');
        el.classList.add('is-reset'); // snap back to the hidden state without animating
        stopScene(i);
        if (finales.has(i)) finales.get(i).stop();
      },
      land: flutter,
    };
  }

  /* ------------------------------------------------------------------------
     7b. Memories
         Tap a photograph and it lifts a little (or, on the interactive page,
         comes to the middle) while a paper slip shows its caption, date and
         description. No modal, no overlay: the slip belongs to the page and
         everything resets when the page turns. One photograph is open at a time.
         Tapping anywhere else, pressing Escape or turning the page closes it.
     ------------------------------------------------------------------------ */
  function createMemories(album, dom) {
    const leaves = album.book.leaves;
    let current = null;

    /** The tappable photograph under a screen point, on the page being read. */
    function slotAt(x, y) {
      for (const el of document.elementsFromPoint(x, y)) {
        const slot = el.closest && el.closest('.slot[data-memory]');
        if (slot && slot.closest('.leaf.is-current')) return slot;
      }
      return null;
    }

    function fill(page, slot) {
      const memo = page.querySelector('.memo');
      if (!memo) return;
      memo.querySelector('.memo__date').textContent = slot.dataset.date || '';
      memo.querySelector('.memo__cap').textContent = slot.dataset.caption || '';
      memo.querySelector('.memo__desc').textContent = slot.dataset.description || '';
      // Keep the slip clear of the photograph: top when the print sits in the lower half.
      const pr = page.getBoundingClientRect();
      const sr = slot.getBoundingClientRect();
      const lower = sr.top + sr.height / 2 > pr.top + pr.height * 0.55;
      if (page.dataset.mode === 'lift' || page.classList.contains('page--full')) delete memo.dataset.at;
      else if (lower) memo.dataset.at = 'top'; else delete memo.dataset.at;
    }

    /** Bring a small print to the middle of the page (interactive page). */
    function lift(page, slot) {
      const pw = page.clientWidth;
      const ph = page.clientHeight;
      const w = slot.offsetWidth;
      const h2 = slot.offsetHeight;
      const zoom = Math.min((pw * 0.68) / w, (ph * 0.5) / h2, 2.4);
      slot.style.setProperty('--lift-zoom', zoom.toFixed(3));
      slot.style.setProperty('--tx', `${(pw / 2 - (slot.offsetLeft + w / 2)).toFixed(1)}px`);
      slot.style.setProperty('--ty', `${(ph * 0.36 - (slot.offsetTop + h2 / 2)).toFixed(1)}px`);
    }

    /** Swap in the high-resolution file only now that someone wants a closer look. */
    function fullResolution(slot) {
      const url = slot.dataset.full;
      if (!url || slot.dataset.fullState) return;
      slot.dataset.fullState = 'loading';
      const probe = new Image();
      probe.onload = () => {
        const img = slot.querySelector('.photo__img');
        img.removeAttribute('srcset');
        img.src = url;
        slot.dataset.fullState = 'done';
      };
      probe.onerror = () => { slot.dataset.fullState = 'error'; };
      probe.src = url;
    }

    function close() {
      if (!current) return;
      const slot = current;
      const page = slot.closest('.page');
      current = null;
      slot.classList.remove('is-open');
      slot.setAttribute('aria-expanded', 'false');
      slot.style.removeProperty('--tx');
      slot.style.removeProperty('--ty');
      slot.style.removeProperty('--lift-zoom');
      if (page) page.classList.remove('has-open');
    }

    function open(slot) {
      if (current === slot) return;
      close();
      const page = slot.closest('.page');
      current = slot;
      fill(page, slot);
      if (page.dataset.mode === 'lift') lift(page, slot);
      slot.classList.add('is-open');
      slot.setAttribute('aria-expanded', 'true');
      page.classList.add('has-open');
      fullResolution(slot);
    }

    function toggle(slot) { if (current === slot) close(); else open(slot); }

    album.on('change', close);
    album.on('view', close);
    window.addEventListener('resize', close);
    // Assistive tech can activate a photograph with a synthesised click.
    dom.stage.addEventListener('click', (e) => {
      if (e.detail !== 0) return;
      const slot = e.target.closest && e.target.closest('.slot[data-memory]');
      if (slot) toggle(slot);
    });

    return { slotAt, toggle, open, close, isOpen: () => Boolean(current), leaves };
  }

  /* ------------------------------------------------------------------------
     8. Input
     ------------------------------------------------------------------------ */
  function initKeyboard(album) {
    let last = 0;
    document.addEventListener('keydown', (e) => {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
      if (album.view !== 'album') return;
      const tag = e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      const slot = e.target.closest && e.target.closest('.slot[data-memory]');
      if (slot && (e.key === 'Enter' || e.key === ' ')) { album.memory.toggle(slot); e.preventDefault(); return; }
      if (e.key === 'Escape' && album.memory.isOpen()) { album.memory.close(); e.preventDefault(); return; }

      const t = now();
      switch (e.key) {
        case 'ArrowRight': case 'PageDown':
          if (!(e.repeat && t - last < 170)) { album.next('keyboard'); last = t; }
          break;
        case 'ArrowLeft': case 'PageUp':
          if (!(e.repeat && t - last < 170)) { album.prev('keyboard'); last = t; }
          break;
        case 'Home': album.first('keyboard'); break;
        case 'End': album.last('keyboard'); break;
        case 'Escape': album.close(); break;
        default: return;
      }
      e.preventDefault();
    });
  }

  /**
   * One gesture state machine for touch, pen and mouse.
   *
   *   pointerdown  -> "pending" (ignored if it starts on a control)
   *   moved > 8px  -> axis lock: horizontal = drag a page, vertical = hands off
   *   drag         -> the page follows the finger 1:1 (progress, not pixels)
   *   release      -> commit if dragged far enough OR flicked fast enough,
   *                   otherwise the page settles back
   *   no movement  -> a tap; on an edge hot-spot it turns the page
   *
   * A second finger cancels the gesture (pinch, palm), and nothing new starts
   * until every finger is up.
   */
  function initGestures(album, dom) {
    const { stage, book } = { stage: dom.stage, book: album.book };
    const CONTROLS = 'button, a, input, textarea, select, label, summary, [data-no-swipe]';
    const SLOP = 8;            // px before a gesture is classified
    const TAP_MAX_MS = 450;
    const DRAG_SPAN = 0.9;     // dragging this fraction of the page width = a full turn

    const pointers = new Set();
    let blocked = false;       // true after a multi-touch until all pointers lift
    let g = null;
    let suppressClick = false;

    const bookWidth = () => dom.bookEl.clientWidth || 1;

    function rubber(px) {
      dom.bookEl.style.transform = px ? `translate3d(${px.toFixed(1)}px,0,0)` : '';
    }

    function end(commitAllowed, e) {
      const gesture = g;
      g = null;
      stage.classList.remove('is-dragging');
      if (!gesture) return;
      try { stage.releasePointerCapture(gesture.id); } catch { /* not captured */ }

      if (gesture.axis === 'x') {
        suppressClick = gesture.type === 'mouse';
        dom.bookEl.classList.add('is-rubber');
        rubber(0);
        if (gesture.leaf < 0) return; // nothing to turn at this end of the book

        const p = book.progress(gesture.leaf);
        book.drop(gesture.leaf);
        const v = gesture.velocity(); // px/ms, negative = leftwards
        let commit = false;
        if (commitAllowed) {
          if (gesture.dir === 'next') commit = (p > 0.38 || (v < -0.35 && gesture.dx < -20)) && v < 0.35;
          else commit = (p < 0.62 || (v > 0.35 && gesture.dx > 20)) && v > -0.35;
        }
        if (commit) {
          const speed = 1 + Math.min(Math.abs(v), 2);
          if (gesture.dir === 'next') album.next('swipe', { speed }); else album.prev('swipe', { speed });
        } else {
          book.settle();
        }
        return;
      }

      // A tap that never became a drag.
      if (commitAllowed && !gesture.axis && now() - gesture.t < TAP_MAX_MS && e) {
        const slot = album.memory.slotAt(e.clientX, e.clientY);
        if (slot) { album.memory.toggle(slot); return; }
        if (album.memory.isOpen()) { album.memory.close(); return; }
        const spot = e.target.closest?.('.hotspot');
        if (spot && spot.dataset.disabled !== 'true') {
          if (spot.dataset.dir === 'next') album.next('tap'); else album.prev('tap');
        }
      }
    }

    stage.addEventListener('pointerdown', (e) => {
      pointers.add(e.pointerId);
      if (pointers.size > 1) { blocked = true; end(false); return; }
      if (blocked || !e.isPrimary) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      if (album.view !== 'album') return;
      if (e.target.closest(CONTROLS)) return; // never start a swipe on a control
      g = {
        id: e.pointerId, type: e.pointerType, x: e.clientX, y: e.clientY, t: now(),
        axis: null, dir: null, leaf: -1, p0: 0, w: bookWidth(), dx: 0, samples: [],
        velocity() {
          const s = this.samples;
          if (s.length < 2) return 0;
          const a = s[0];
          const b = s[s.length - 1];
          return (b.x - a.x) / Math.max(1, b.t - a.t);
        },
      };
    });

    stage.addEventListener('pointermove', (e) => {
      if (!g || e.pointerId !== g.id) return;
      const dx = e.clientX - g.x;
      const dy = e.clientY - g.y;

      if (!g.axis) {
        if (Math.hypot(dx, dy) < SLOP) return;
        g.axis = Math.abs(dx) > Math.abs(dy) * 1.15 ? 'x' : 'y';
        if (g.axis === 'y') return; // vertical: leave it to the browser
        g.dir = dx < 0 ? 'next' : 'prev';
        // The leaf this drag turns, or -1 at either end of the book.
        g.leaf = g.dir === 'next'
          ? (album.index < album.total - 1 ? album.index : -1)
          : (album.index > 0 ? album.index - 1 : -1);
        if (g.leaf >= 0) g.p0 = book.grab(g.leaf);
        try { stage.setPointerCapture(e.pointerId); } catch { /* ignore */ }
        stage.classList.add('is-dragging');
        dom.bookEl.classList.remove('is-rubber');
      }
      if (g.axis !== 'x') return;

      g.dx = dx;
      const t = now();
      g.samples.push({ x: e.clientX, t });
      while (g.samples.length > 2 && t - g.samples[0].t > 90) g.samples.shift();

      if (g.leaf < 0) rubber(clamp(dx * 0.18, -26, 26)); // end of the book: a gentle resistance
      else book.setProgress(g.leaf, g.p0 - dx / (g.w * DRAG_SPAN));
    });

    const up = (e) => {
      pointers.delete(e.pointerId);
      if (g && e.pointerId === g.id) end(e.type === 'pointerup', e);
      if (!pointers.size) blocked = false;
    };
    stage.addEventListener('pointerup', up);
    stage.addEventListener('pointercancel', up);

    // After a mouse drag the browser still fires a click on release: swallow it.
    stage.addEventListener('click', (e) => {
      if (suppressClick) { suppressClick = false; e.stopPropagation(); e.preventDefault(); }
    }, true);

    // Anything that changes the page behind the gesture's back cancels it.
    album.on('change', ({ source }) => { if (g && source !== 'swipe') end(false); });
    window.addEventListener('resize', () => { if (g) end(false); });
    window.addEventListener('blur', () => { if (g) end(false); });

    /* ---- mouse: hovering an edge lifts the page a little ---- */
    for (const spot of [dom.hotPrev, dom.hotNext]) {
      spot.addEventListener('pointerenter', (e) => {
        if (e.pointerType !== 'mouse' || g || spot.dataset.disabled === 'true') return;
        book.setPeek(spot.dataset.dir);
      });
      spot.addEventListener('pointerleave', () => book.setPeek(null));
    }
    album.on('change', () => book.setPeek(null));

    /* ---- trackpad: two-finger horizontal scroll turns one page per gesture ---- */
    let acc = 0;
    let locked = false;
    let quiet = 0;
    let lastTurn = 0;
    stage.addEventListener('wheel', (e) => {
      if (album.view !== 'album') return;
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY) * 1.2) return; // vertical: not ours
      e.preventDefault();
      clearTimeout(quiet);
      // One gesture = one page. A gesture (and its momentum tail) ends after a quiet moment, and never
      // within half a second of the last turn, so a slow or stuttering stream cannot turn two pages.
      quiet = setTimeout(() => { locked = false; acc = 0; }, 260);
      if (locked || now() - lastTurn < 500) return;
      acc += e.deltaX;
      if (Math.abs(acc) > 70) {
        locked = true;
        lastTurn = now();
        if (acc > 0) album.next('wheel'); else album.prev('wheel');
        acc = 0;
      }
    }, { passive: false });
  }

  /** Marks fine-pointer devices so CSS can offer hover affordances. */
  function initPointerClass() {
    if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) document.documentElement.classList.add('fine-pointer');
  }

  /* ------------------------------------------------------------------------
     9. Music
        One <audio> for the whole album session.
          - Nothing is requested or played until "Open the album" is pressed:
            the element is only created inside that click, so browsers' autoplay
            rules are respected and a visitor who never opens the album never
            downloads the track.
          - It keeps playing while pages turn (it is never recreated or restarted).
          - Play/pause and mute are separate; both choices are remembered for the
            session (sessionStorage), together with the playback position, so a
            reload picks up where it left off — still only after Open is pressed.
          - It pauses (without losing its place) when the album is closed back to
            the cover or the tab is hidden, and resumes unless she paused it herself.
          - If the file is missing or cannot be decoded the controls simply
            disappear and everything else carries on.
        state: idle -> loading -> playing | paused | error   (data-state on #music)
     ------------------------------------------------------------------------ */
  function createMusic(cfg, album, dom) {
    const src = resolveAsset(cfg.music.src, cfg.base.music);
    const box = dom.music;
    if (!src || !box) return null;

    const KEY = 'album:music';
    const store = {
      read() { try { return JSON.parse(sessionStorage.getItem(KEY)) || {}; } catch { return {}; } },
      write(v) { try { sessionStorage.setItem(KEY, JSON.stringify(v)); } catch { /* storage unavailable */ } },
    };
    const saved = store.read();

    let audio = null;
    let failed = false;
    let userPaused = Boolean(saved.paused);   // she pressed Pause (survives close/reload)
    let muted = Boolean(saved.muted);
    let resumeAt = Number(saved.t) > 0 ? Number(saved.t) : 0;
    let state = 'idle';
    let fade = 0;
    let lastSave = 0;

    const persist = () => store.write({ paused: userPaused, muted, t: audio ? Math.floor(audio.currentTime * 10) / 10 : resumeAt });
    const shouldPlay = () => album.view === 'album' && !userPaused && !document.hidden && !failed;

    /* ---- the two words ---- */
    function paint() {
      const playing = state === 'playing' || state === 'loading';
      box.dataset.state = state;
      dom.musicToggleLabel.textContent = playing ? cfg.ui.pause : cfg.ui.play;
      dom.musicToggle.setAttribute('aria-label', playing ? cfg.ui.pauseMusic : cfg.ui.playMusic);
      dom.musicToggle.title = cfg.music.title || '';
      dom.musicMuteLabel.textContent = muted ? cfg.ui.unmute : cfg.ui.mute;
      dom.musicMute.setAttribute('aria-label', muted ? cfg.ui.unmuteMusic : cfg.ui.muteMusic);
      dom.musicMute.setAttribute('aria-pressed', String(muted));
    }
    function setState(next) { state = next; paint(); }

    /* ---- volume: a soft fade in/out (iOS ignores volume; mute still works) ---- */
    function fadeTo(target, done) {
      clearInterval(fade);
      const ms = cfg.music.fadeMs;
      if (!audio || !ms || fxsReduced()) { if (audio) audio.volume = target; if (done) done(); return; }
      const from = audio.volume;
      const t0 = now();
      fade = setInterval(() => {
        const k = clamp((now() - t0) / ms, 0, 1);
        try { audio.volume = from + (target - from) * k; } catch { /* read-only volume */ }
        if (k >= 1) { clearInterval(fade); if (done) done(); }
      }, 40);
    }
    const fxsReduced = () => document.documentElement.hasAttribute('data-reduced');

    /* ---- the element ---- */
    function fail(reason) {
      if (failed) return;
      failed = true;
      console.warn(`[album] Music unavailable (${reason}):`, src);
      clearInterval(fade);
      state = 'error';
      box.hidden = true;
      box.dataset.state = 'error';
      if (audio) { try { audio.pause(); } catch { /* ignore */ } }
    }

    function ensureAudio() {
      if (audio || failed) return;
      audio = new Audio();
      audio.preload = 'auto';
      audio.loop = Boolean(cfg.music.loop);
      audio.volume = 0;
      audio.muted = muted;
      audio.addEventListener('error', () => fail(audio && audio.error ? `code ${audio.error.code}` : 'error'));
      audio.addEventListener('loadedmetadata', () => {
        if (resumeAt > 0 && resumeAt < audio.duration - 1) audio.currentTime = resumeAt;
        resumeAt = 0;
      }, { once: true });
      audio.addEventListener('playing', () => setState('playing'));
      audio.addEventListener('waiting', () => { if (!audio.paused) setState('loading'); });
      audio.addEventListener('pause', () => { if (state !== 'error') setState('paused'); });
      audio.addEventListener('ended', () => { if (!audio.loop) setState('paused'); });
      audio.addEventListener('timeupdate', () => {
        const t = now();
        if (t - lastSave > 2000) { lastSave = t; persist(); }
      });
      audio.src = src;
    }

    function play() {
      ensureAudio();
      if (!audio || failed) return;
      setState('loading');
      const result = audio.play();
      if (result && result.then) {
        result.then(() => fadeTo(cfg.music.volume)).catch((err) => {
          // Blocked by the browser's autoplay rules, or interrupted by a pause: stay quiet and wait for a tap.
          if (err && (err.name === 'NotSupportedError')) fail('not supported');
          else if (!failed) setState('paused');
        });
      }
    }

    function pauseSoftly() {
      if (!audio || audio.paused) { if (state !== 'error') setState('paused'); return; }
      // A hidden tab throttles timers, so stop at once there instead of fading.
      if (document.hidden) { clearInterval(fade); audio.pause(); return; }
      fadeTo(0, () => { if (!shouldPlay()) audio.pause(); });
    }

    function sync() {
      if (failed) return;
      if (shouldPlay()) play(); else pauseSoftly();
    }

    /* ---- controls ---- */
    dom.musicToggle.addEventListener('click', () => {
      userPaused = !(userPaused);
      persist();
      sync();
      paint();
    });
    dom.musicMute.addEventListener('click', () => {
      muted = !muted;
      if (audio) audio.muted = muted;
      persist();
      paint();
    });

    /* ---- follow the album ---- */
    album.on('view', ({ view }) => {
      if (view === 'album') box.hidden = failed;
      sync();
      persist();
    });
    document.addEventListener('visibilitychange', () => { if (album.view === 'album') sync(); persist(); });
    window.addEventListener('pagehide', persist);

    paint();
    return {
      get audio() { return audio; },
      get state() { return state; },
      get muted() { return muted; },
      get userPaused() { return userPaused; },
    };
  }

  /* ------------------------------------------------------------------------
     10. Boot
     ------------------------------------------------------------------------ */
  function boot() {
    const cfg = loadConfig();

    document.title = cfg.site.title;
    document.documentElement.lang = cfg.site.language;

    // Static text: <el data-bind="path.in.config">
    document.querySelectorAll('[data-bind]').forEach((node) => {
      const value = getPath(cfg, node.dataset.bind);
      if (value) node.textContent = value; else if (!node.textContent.trim()) node.hidden = true;
    });
    const albumTitle = [cfg.recipient.name, cfg.cover.eyebrow].filter(Boolean).join(' — ');
    $('#album-title').textContent = albumTitle || cfg.site.title;
    $('#prev-btn').setAttribute('aria-label', cfg.ui.previous);
    $('#next-btn').setAttribute('aria-label', cfg.ui.next);
    $('#close-btn').setAttribute('aria-label', cfg.ui.close);
    $('#close-btn').title = cfg.ui.close;

    const dom = {
      gate: $('#gate'),
      album: $('#album'),
      stage: $('#stage'),
      bookEl: $('#book'),
      hotPrev: $('#hot-prev'),
      hotNext: $('#hot-next'),
      openBtn: $('#open-btn'),
      prev: $('#prev-btn'),
      next: $('#next-btn'),
      counterCurrent: $('#counter-current'),
      counterTotal: $('#counter-total'),
      status: $('#status'),
      music: $('#music'),
      musicToggle: $('#music-toggle'),
      musicToggleLabel: $('#music-toggle-label'),
      musicMute: $('#music-mute'),
      musicMuteLabel: $('#music-mute-label'),
    };

    const fxs = createSettings(cfg);
    const hooks = {};
    const album = createAlbum(cfg, buildPages(cfg), dom, fxs, hooks);
    Object.assign(hooks, createMotion(album, dom, fxs));
    album.memory = createMemories(album, dom);
    album.book.refresh();

    dom.openBtn.addEventListener('click', () => album.open());
    $('#close-btn').addEventListener('click', () => album.close());
    dom.prev.addEventListener('click', () => { if (dom.prev.getAttribute('aria-disabled') !== 'true') album.prev('button'); });
    dom.next.addEventListener('click', () => { if (dom.next.getAttribute('aria-disabled') !== 'true') album.next('button'); });
    dom.stage.addEventListener('click', (e) => {
      const action = e.target.closest('[data-action]')?.dataset.action;
      if (action === 'restart') album.first('button');
    });
    let resizeTimer = 0;
    window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(album.warm, 250); });
    window.addEventListener('hashchange', () => { if (album.view === 'album') album.syncFromHash(); });

    initKeyboard(album);
    initGestures(album, dom);
    initPointerClass();
    album.music = createMusic(cfg, album, dom);

    // Exposed for the console and for later experiments.
    window.album = album;
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
