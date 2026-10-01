/* ==========================================================================
   Birthday Album — application script
   --------------------------------------------------------------------------
   Plain script (no modules, no build) so it runs from file:// and any host.

   Layout of this file
     1. Utilities          small helpers
     2. Configuration      defaults + merge of window.ALBUM_CONFIG
     3. Page layouts       config entry  ->  page content (one function per layout)
     4. Image loading      lazy loading with a graceful "missing photo" plate
     5. Book engine        leaves, page-turn physics, painting (transform/opacity only)
     6. Album controller   single source of truth: current page + events
     7. Input              keyboard, gestures (touch/pen/mouse), wheel, hot-spots
     8. Music              optional background track
     9. Boot               wires everything together

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
     - <html> class .fine-pointer; CSS variables --mx/--my on <html>
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
    music: { src: '', title: '', volume: 0.6, loop: true },
    ui: {
      previous: 'Previous', next: 'Next', close: 'Close album',
      soundOff: 'Turn sound off', soundOn: 'Turn sound on',
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
    cfg.music.volume = clamp(Number(cfg.music.volume) || 0, 0, 1);
    if (!cfg.recipient.name) console.warn('[album] recipient.name is empty.');
    return cfg;
  }

  /* ------------------------------------------------------------------------
     3. Page layouts
        Each layout function takes (spec, ctx) and returns
          { layout, tone, label, imgs, el }
        `el` is the page content; the book engine wraps it in a leaf.
        ctx = { cfg, no (1-based page number), photo() -> next photo number }.
        Compositions are sized with container-query units in style.css, so the
        same markup scales from a 320px phone to a desktop.
     ------------------------------------------------------------------------ */
  const text = (tag, cls, value) => (value ? h(tag, { class: cls, text: value }) : null);

  /** Normalise `photo` / `photos` into an array of exactly `count` photo specs. */
  function photosOf(spec, count) {
    let list = Array.isArray(spec.photos) ? spec.photos : spec.photo ? [spec] : [];
    list = list.map((p) => (typeof p === 'string' ? { photo: p } : p || {}));
    while (list.length < count) list.push({});
    return list.slice(0, count);
  }

  /** A framed photograph. Returns { el, img }. */
  function photoFigure(photo, ctx, modifier = '') {
    const n = ctx.photo();
    const img = h('img', {
      class: 'photo__img',
      alt: photo.alt || photo.caption || '',
      decoding: 'async',
      draggable: 'false',
      dataset: { src: resolveAsset(photo.photo, ctx.cfg.base.photos), depth: '3', zoom: '1.08' },
    });
    if (photo.focus) img.style.objectPosition = photo.focus;
    const el = h('figure', { class: `photo ${modifier}`.trim(), dataset: { tone: String(n % 3) } }, [
      h('div', { class: 'photo__well' }, [
        img,
        h('div', { class: 'photo__missing', 'aria-hidden': 'true' }, [
          h('span', { text: ctx.cfg.ui.photograph }),
          h('span', { text: pad2(n) }),
        ]),
      ]),
    ]);
    return { el, img };
  }

  const metaLine = (ctx, date) =>
    h('p', { class: 'eyebrow meta' }, [
      h('span', { text: `No. ${pad2(ctx.no)}` }),
      date ? h('span', { class: 'meta__date', text: formatDate(date, ctx.cfg.site.language) }) : null,
    ]);

  function result(layout, spec, el, imgs = [], tone = 'ivory') {
    return { layout, tone, imgs, el, label: spec.title || spec.heading || spec.caption || spec.numeral || '' };
  }

  const LAYOUTS = {
    /* Cover plate: name in the middle, framed by a gold keyline. */
    title(spec, ctx) {
      const { cfg } = ctx;
      const date = spec.showDate === false ? '' : formatDate(cfg.birthday.date, cfg.site.language);
      const el = h('div', { class: 'page page--title' }, [
        text('p', 'eyebrow', spec.eyebrow),
        h('div', { class: 'title__mid' }, [
          text('h2', 'title__name', cfg.recipient.name),
          h('span', { class: 'rule', 'aria-hidden': 'true' }),
          text('p', 'title__subtitle', spec.subtitle),
        ]),
        text('p', 'eyebrow eyebrow--quiet', date),
      ]);
      return { ...result('title', { title: cfg.recipient.name }, el), imgs: [] };
    },

    /* Photograph to the edges, caption on a paper strip beneath. */
    full(spec, ctx) {
      const [p] = photosOf(spec, 1);
      const fig = photoFigure({ ...p, caption: spec.caption }, ctx, 'photo--bleed');
      const el = h('div', { class: 'page page--full' }, [
        fig.el,
        h('div', { class: 'full__text' }, [
          metaLine(ctx, spec.date),
          text('h2', 'page__title', spec.title),
          text('p', 'page__caption', spec.caption),
        ]),
      ]);
      return result('full', spec, el, [fig.img]);
    },

    /* One photograph in a generous mat, caption centred beneath. */
    single(spec, ctx) {
      const [p] = photosOf(spec, 1);
      const fig = photoFigure({ ...p, caption: spec.caption }, ctx, 'photo--mat');
      const el = h('div', { class: 'page page--single' }, [
        metaLine(ctx, spec.date),
        fig.el,
        h('div', { class: 'single__text' }, [
          text('h2', 'page__title', spec.title),
          text('p', 'page__caption', spec.caption),
        ]),
      ]);
      return result('single', spec, el, [fig.img]);
    },

    /* A large print with a smaller one overlapping it. */
    duo(spec, ctx) {
      const [a, b] = photosOf(spec, 2);
      const fa = photoFigure(a, ctx, 'photo--mat duo__a');
      const fb = photoFigure(b, ctx, 'photo--mat duo__b');
      const el = h('div', { class: 'page page--duo' }, [
        fa.el,
        fb.el,
        h('div', { class: 'duo__text' }, [
          metaLine(ctx, spec.date),
          text('h2', 'page__title', spec.title),
          text('p', 'page__caption', spec.caption),
        ]),
      ]);
      return result('duo', spec, el, [fa.img, fb.img]);
    },

    /* Three tilted prints held by black photo corners. */
    corners(spec, ctx) {
      const prints = photosOf(spec, 3).map((p, i) => photoFigure(p, ctx, `photo--print print--${i + 1}`));
      const el = h('div', { class: 'page page--corners' }, [
        ...prints.map((f) => f.el),
        h('div', { class: 'corners__text' }, [metaLine(ctx, spec.date), text('h2', 'page__title', spec.title)]),
      ]);
      return result('corners', spec, el, prints.map((f) => f.img));
    },

    /* A contact sheet: three small frames, each with its own date and caption. */
    strip(spec, ctx) {
      const rows = photosOf(spec, 3).map((p) => {
        const fig = photoFigure(p, ctx, 'photo--frame');
        const row = h('div', { class: 'strip__row' }, [
          fig.el,
          h('div', { class: 'strip__text' }, [
            p.date ? h('p', { class: 'eyebrow', text: formatDate(p.date, ctx.cfg.site.language) }) : null,
            text('p', 'page__caption', p.caption),
          ]),
        ]);
        return { row, img: fig.img };
      });
      const el = h('div', { class: 'page page--strip' }, [
        h('div', { class: 'strip__head' }, [metaLine(ctx), text('h2', 'strip__heading', spec.heading)]),
        ...rows.map((r) => r.row),
      ]);
      return result('strip', spec, el, rows.map((r) => r.img));
    },

    /* One large photograph and two companions. */
    mosaic(spec, ctx) {
      const [a, b, c] = photosOf(spec, 3);
      const fa = photoFigure(a, ctx, 'photo--frame mosaic__a');
      const fb = photoFigure(b, ctx, 'photo--frame mosaic__b');
      const fc = photoFigure(c, ctx, 'photo--frame mosaic__c');
      const el = h('div', { class: 'page page--mosaic' }, [
        fa.el, fb.el, fc.el,
        h('div', { class: 'mosaic__text' }, [
          metaLine(ctx, spec.date),
          text('h2', 'page__title', spec.title),
          text('p', 'page__caption', spec.caption),
        ]),
      ]);
      return result('mosaic', spec, el, [fa.img, fb.img, fc.img]);
    },

    /* Wine-coloured divider page. */
    chapter(spec, ctx) {
      const el = h('div', { class: 'page page--chapter' }, [
        text('p', 'chapter__numeral', spec.numeral),
        h('div', { class: 'chapter__text' }, [
          text('h2', 'chapter__title', spec.title),
          h('span', { class: 'rule', 'aria-hidden': 'true' }),
          text('p', 'chapter__caption', spec.caption),
        ]),
      ]);
      return result('chapter', spec, el, [], 'wine');
    },

    /* The written message. */
    note(spec, ctx) {
      const el = h('div', { class: 'page page--note' }, [
        text('p', 'eyebrow', spec.heading),
        h('div', { class: 'note__body' }, [].concat(spec.paragraphs || []).filter(Boolean).map(
          (p) => h('p', { class: 'note__p', text: p }),
        )),
        h('div', { class: 'note__sign' }, [
          text('p', 'note__signoff', spec.signoff),
          text('p', 'note__signature', spec.signature),
        ]),
      ]);
      return result('note', spec, el);
    },

    /* Last page. */
    closing(spec, ctx) {
      const el = h('div', { class: 'page page--closing' }, [
        text('h2', 'closing__heading', spec.heading),
        h('span', { class: 'rule', 'aria-hidden': 'true' }),
        text('p', 'closing__text', spec.text),
        spec.restartLabel
          ? h('button', { class: 'btn btn--onwine', type: 'button', dataset: { action: 'restart' } }, [
              h('span', { text: spec.restartLabel }),
            ])
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
        console.warn(`[album] Unknown layout "${spec.layout}" on page ${i + 1}; using "single".`);
        build = LAYOUTS.single;
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
  function loadImage(img) {
    if (img.dataset.state) return;
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

  function createBook(pages, dom) {
    const total = pages.length;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
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
      };
    });

    /* ---- painting: transform + opacity only ---- */
    function paintParallax(i) {
      const L = leaves[i];
      if (!L.par.length) return;
      const revealed = i === 0 ? 1 : leaves[i - 1].p; // how far the page above has lifted
      for (const item of L.par) {
        const x = item.depth * ((1 - revealed) - L.p);
        item.el.style.transform = `translate3d(${x.toFixed(2)}%,0,0) scale(${item.zoom})`;
      }
    }

    function paint(i) {
      const L = leaves[i];
      const { p } = L;
      const lift = Math.sin(Math.PI * p);
      L.el.style.transform = `rotateY(${(-p * MAX_ANGLE).toFixed(2)}deg) rotateX(${(lift * 1.3).toFixed(2)}deg)`;
      const fade = p > FADE_FROM ? clamp(1 - (p - FADE_FROM) / FADE_SPAN, 0, 1) : 1;
      if (fade !== L.fade) { L.fade = fade; L.el.style.opacity = String(fade); }
      L.shade.style.opacity = (Math.min(1, p * 1.1) * 0.8).toFixed(3);
      paintParallax(i);
      const below = leaves[i + 1];
      if (below) {
        below.cast.style.opacity = (lift * 0.9).toFixed(3);
        paintParallax(i + 1);
      }
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
      leaves.forEach((L, k) => {
        const on = live.has(k);
        if (on !== L.live) { L.live = on; L.el.classList.toggle('is-live', on); }
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
        if (t >= 1) { L.p = a.to; L.anim = null; }
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
      L.anim = {
        from: L.p,
        to,
        t0: now() + delay,
        dur: Math.max(MIN_MS, (TURN_MS * Math.pow(dist, 0.75)) / clamp(speed, 1, 2.4)),
        ease: atRest ? easeInOut : easeOut,
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
        if (immediate || reduced.matches) {
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
      /** True while any leaf is still moving. */
      get busy() { return leaves.some((L) => L.anim); },
    };
  }

  /* ------------------------------------------------------------------------
     6. Album controller
     ------------------------------------------------------------------------ */
  function createAlbum(cfg, pages, dom) {
    const bus = emitter();
    const total = pages.length;
    const state = { index: 0, view: 'gate', direction: 'forward' };
    const book = createBook(pages, dom);

    book.leaves.forEach((leaf, i) => {
      leaf.el.setAttribute('aria-label', `${cfg.ui.page} ${i + 1} ${cfg.ui.of} ${total}`);
    });
    dom.stage.setAttribute('aria-label', cfg.site.title);
    dom.counterTotal.textContent = pad2(total);

    /* ---- rendering ---- */
    function render(opts) {
      const { index } = state;
      book.leaves.forEach((leaf, i) => {
        const current = i === index;
        leaf.el.classList.toggle('is-current', current);
        leaf.el.inert = !current;
        leaf.el.setAttribute('aria-hidden', String(!current));
      });
      // Warm up the current page and its neighbours.
      for (let i = index - 1; i <= index + 2; i++) pages[i]?.imgs.forEach(loadImage);

      book.setIndex(index, opts);
      dom.stage.dataset.direction = state.direction;
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
      first: (source) => go(0, source),
      last: (source) => go(total - 1, source),
      open: () => setView('album'),
      close: () => setView('gate'),
      syncFromHash: () => go(readHash(), 'hash'),
    };
  }

  /* ------------------------------------------------------------------------
     7. Input
     ------------------------------------------------------------------------ */
  function initKeyboard(album) {
    let last = 0;
    document.addEventListener('keydown', (e) => {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
      if (album.view !== 'album') return;
      const tag = e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

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
    stage.addEventListener('wheel', (e) => {
      if (album.view !== 'album') return;
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY) * 1.2) return; // vertical: not ours
      e.preventDefault();
      clearTimeout(quiet);
      quiet = setTimeout(() => { locked = false; acc = 0; }, 150); // gesture + momentum over
      if (locked) return;
      acc += e.deltaX;
      if (Math.abs(acc) > 70) {
        locked = true;
        if (acc > 0) album.next('wheel'); else album.prev('wheel');
        acc = 0;
      }
    }, { passive: false });
  }

  /** Publishes pointer position (-1…1) for desktop-only effects. */
  function initPointerTracking() {
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    const root = document.documentElement;
    root.classList.add('fine-pointer');
    let frame = 0;
    let x = 0;
    let y = 0;
    window.addEventListener('pointermove', (e) => {
      x = (e.clientX / window.innerWidth) * 2 - 1;
      y = (e.clientY / window.innerHeight) * 2 - 1;
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        root.style.setProperty('--mx', x.toFixed(3));
        root.style.setProperty('--my', y.toFixed(3));
      });
    }, { passive: true });
  }

  /* ------------------------------------------------------------------------
     8. Music
     ------------------------------------------------------------------------ */
  function initMusic(cfg, album, button) {
    const src = resolveAsset(cfg.music.src, cfg.base.music);
    if (!src) return;

    let audio = null;
    let wanted = true; // flips when she mutes it herself

    const paint = () => {
      const playing = wanted && album.view === 'album';
      button.setAttribute('aria-pressed', String(wanted));
      const label = wanted ? cfg.ui.soundOff : cfg.ui.soundOn;
      button.setAttribute('aria-label', label);
      button.title = cfg.music.title ? `${cfg.music.title} — ${label}` : label;
      return playing;
    };

    const sync = () => {
      const playing = paint();
      if (!audio) return;
      if (playing) audio.play().catch(() => {}); else audio.pause();
    };

    const ensureAudio = () => {
      if (audio) return;
      audio = new Audio(src);
      audio.loop = Boolean(cfg.music.loop);
      audio.volume = cfg.music.volume;
      audio.preload = 'auto';
      audio.addEventListener('error', () => {
        console.warn('[album] Could not load music:', src);
        button.hidden = true;
        audio = null;
        wanted = false;
      });
    };

    button.hidden = false;
    paint();
    button.addEventListener('click', () => { wanted = !wanted; ensureAudio(); sync(); });
    album.on('view', ({ view }) => {
      if (view === 'album') ensureAudio();
      sync();
    });
  }

  /* ------------------------------------------------------------------------
     9. Boot
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
    };

    const album = createAlbum(cfg, buildPages(cfg), dom);

    dom.openBtn.addEventListener('click', () => album.open());
    $('#close-btn').addEventListener('click', () => album.close());
    dom.prev.addEventListener('click', () => { if (dom.prev.getAttribute('aria-disabled') !== 'true') album.prev('button'); });
    dom.next.addEventListener('click', () => { if (dom.next.getAttribute('aria-disabled') !== 'true') album.next('button'); });
    dom.stage.addEventListener('click', (e) => {
      const action = e.target.closest('[data-action]')?.dataset.action;
      if (action === 'restart') album.first('button');
    });
    window.addEventListener('hashchange', () => { if (album.view === 'album') album.syncFromHash(); });

    initKeyboard(album);
    initGestures(album, dom);
    initPointerTracking();
    initMusic(cfg, album, $('#sound-btn'));

    // Exposed for the console and for later experiments.
    window.album = album;
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
