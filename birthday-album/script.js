/* ==========================================================================
   Birthday Album — application script
   --------------------------------------------------------------------------
   Plain script (no modules, no build) so it runs from file:// and any host.

   Layout of this file
     1. Utilities          small helpers
     2. Configuration      defaults + merge of window.ALBUM_CONFIG
     3. Page builders      config  ->  DOM pages (one builder per page type)
     4. Image loading      lazy loading with a graceful "missing photo" plate
     5. Album controller   single source of truth: current page + events
     6. Input              keyboard, touch swipe, desktop pointer tracking
     7. Music              optional background track
     8. Boot               wires everything together

   Hooks for later motion work
     - album.on('change', ({ from, to, direction, source }) => …)
     - album.on('view',   ({ view }) => …)           'gate' | 'album'
     - <html> classes:   .fine-pointer  (desktop mouse/trackpad)
     - CSS variables:    --mx / --my    pointer position, -1…1   (on <html>)
                         --drag-x       live swipe offset in px  (on .stage)
                         --progress     0…1 through the book     (on .album)
     - Page state:       .page.is-current / .is-before / .is-after
                         .stage[data-direction="forward|back"]
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
    titlePage: { eyebrow: 'Happy Birthday', subtitle: '', showDate: true },
    letter: { enabled: true, heading: '', paragraphs: [], signoff: '', signature: '' },
    base: { photos: 'assets/photos/', music: 'assets/music/' },
    memories: [],
    closing: { enabled: true, heading: 'Happy Birthday', text: '', restartLabel: 'Back to the beginning' },
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

    // Normalise the bits the renderer relies on, and warn about common slips.
    const withSlash = (s) => (s && !s.endsWith('/') ? s + '/' : s);
    cfg.base.photos = withSlash(cfg.base.photos);
    cfg.base.music = withSlash(cfg.base.music);
    cfg.memories = (Array.isArray(cfg.memories) ? cfg.memories : []).filter((m) => {
      if (isObject(m)) return true;
      console.warn('[album] Ignoring a memory that is not an object:', m);
      return false;
    });
    cfg.letter.paragraphs = [].concat(cfg.letter.paragraphs || []).filter(Boolean);
    cfg.music.volume = clamp(Number(cfg.music.volume) || 0, 0, 1);
    if (!cfg.recipient.name) console.warn('[album] recipient.name is empty.');
    return cfg;
  }

  /* ------------------------------------------------------------------------
     3. Page builders
        Each builder returns { type, el, imgs, label }. `el` is a `.page`
        element; the controller adds/removes the state classes.
     ------------------------------------------------------------------------ */
  const text = (tag, cls, value) => (value ? h(tag, { class: cls, text: value }) : null);

  function buildTitle(cfg) {
    const date = cfg.titlePage.showDate ? formatDate(cfg.birthday.date, cfg.site.language) : '';
    return {
      type: 'title',
      label: cfg.recipient.name,
      imgs: [],
      el: h('section', { class: 'page page--title' }, [
        h('div', { class: 'page__inner' }, [
          text('p', 'eyebrow', cfg.titlePage.eyebrow),
          text('h2', 'title__name', cfg.recipient.name),
          h('span', { class: 'rule', 'aria-hidden': 'true' }),
          text('p', 'title__subtitle', cfg.titlePage.subtitle),
          text('p', 'eyebrow eyebrow--quiet', date),
        ]),
      ]),
    };
  }

  function buildLetter(cfg) {
    const { letter } = cfg;
    return {
      type: 'letter',
      label: letter.heading,
      imgs: [],
      el: h('section', { class: 'page page--letter' }, [
        h('div', { class: 'page__inner' }, [
          text('p', 'eyebrow', letter.heading),
          ...letter.paragraphs.map((p) => h('p', { class: 'letter__p', text: p })),
          text('p', 'letter__signoff', letter.signoff),
          text('p', 'letter__signature', letter.signature),
        ]),
      ]),
    };
  }

  function buildMemory(memory, i, cfg) {
    const number = `No. ${pad2(i + 1)}`;
    const date = formatDate(memory.date, cfg.site.language);
    const img = h('img', {
      class: 'photo__img',
      alt: memory.alt || memory.caption || '',
      decoding: 'async',
      draggable: 'false',
      dataset: { src: resolveAsset(memory.photo, cfg.base.photos) },
    });
    if (memory.focus) img.style.objectPosition = memory.focus;

    return {
      type: 'memory',
      label: memory.title || memory.caption || number,
      imgs: [img],
      el: h('section', { class: 'page page--memory', dataset: { parity: i % 2 ? 'odd' : 'even' } }, [
        h('div', { class: 'page__inner' }, [
          h('figure', { class: 'photo' }, [
            h('div', { class: 'photo__well' }, [
              img,
              h('div', { class: 'photo__missing', 'aria-hidden': 'true' }, [
                h('span', { text: cfg.ui.photograph }),
                h('span', { text: number }),
              ]),
            ]),
          ]),
          h('div', { class: 'memory__text' }, [
            h('p', { class: 'eyebrow memory__meta' }, [
              h('span', { text: number }),
              date ? h('span', { class: 'memory__date', text: date }) : null,
            ]),
            text('h2', 'memory__title', memory.title),
            text('p', 'memory__caption', memory.caption),
          ]),
        ]),
      ]),
    };
  }

  function buildClosing(cfg) {
    const { closing } = cfg;
    return {
      type: 'closing',
      label: closing.heading,
      imgs: [],
      el: h('section', { class: 'page page--closing' }, [
        h('div', { class: 'page__inner' }, [
          text('h2', 'closing__heading', closing.heading),
          h('span', { class: 'rule', 'aria-hidden': 'true' }),
          text('p', 'closing__text', closing.text),
          closing.restartLabel
            ? h('button', { class: 'btn btn--onwine', type: 'button', dataset: { action: 'restart' } }, [
                h('span', { text: closing.restartLabel }),
              ])
            : null,
        ]),
      ]),
    };
  }

  function buildPages(cfg) {
    const pages = [buildTitle(cfg)];
    if (cfg.letter.enabled && cfg.letter.paragraphs.length) pages.push(buildLetter(cfg));
    cfg.memories.forEach((m, i) => pages.push(buildMemory(m, i, cfg)));
    if (cfg.closing.enabled) pages.push(buildClosing(cfg));
    return pages;
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
     5. Album controller
     ------------------------------------------------------------------------ */
  function createAlbum(cfg, pages, dom) {
    const bus = emitter();
    const total = pages.length;
    const state = { index: 0, view: 'gate', direction: 'forward' };

    pages.forEach((page, i) => {
      page.el.setAttribute('role', 'group');
      page.el.setAttribute('aria-label', `${cfg.ui.page} ${i + 1} ${cfg.ui.of} ${total}`);
      dom.stage.append(page.el);
    });
    dom.stage.setAttribute('aria-label', cfg.site.title);
    dom.counterTotal.textContent = pad2(total);

    /* ---- rendering ---- */
    function render() {
      const { index } = state;
      pages.forEach((page, i) => {
        const current = i === index;
        page.el.classList.toggle('is-current', current);
        page.el.classList.toggle('is-before', i < index);
        page.el.classList.toggle('is-after', i > index);
        page.el.inert = !current;
        page.el.setAttribute('aria-hidden', String(!current));
      });
      // Warm up the current page and its neighbours.
      for (let i = index - 1; i <= index + 2; i++) pages[i]?.imgs.forEach(loadImage);

      dom.stage.dataset.direction = state.direction;
      dom.counterCurrent.textContent = pad2(index + 1);
      dom.album.style.setProperty('--progress', total > 1 ? (index / (total - 1)).toFixed(4) : '1');
      dom.prev.setAttribute('aria-disabled', String(index === 0));
      dom.next.setAttribute('aria-disabled', String(index === total - 1));
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
    function go(to, source = 'api') {
      const next = clamp(Math.round(to), 0, total - 1);
      if (next === state.index) return;
      const from = state.index;
      state.direction = next > from ? 'forward' : 'back';
      state.index = next;
      render();
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
    render();

    return {
      get index() { return state.index; },
      get total() { return total; },
      get view() { return state.view; },
      on: bus.on,
      go,
      next: (source) => go(state.index + 1, source),
      prev: (source) => go(state.index - 1, source),
      first: (source) => go(0, source),
      last: (source) => go(total - 1, source),
      open: () => setView('album'),
      close: () => setView('gate'),
      syncFromHash: () => go(readHash(), 'hash'),
    };
  }

  /* ------------------------------------------------------------------------
     6. Input
     ------------------------------------------------------------------------ */
  function initKeyboard(album) {
    document.addEventListener('keydown', (e) => {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
      if (album.view !== 'album') return;
      const tag = e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      switch (e.key) {
        case 'ArrowRight': case 'PageDown': album.next('keyboard'); break;
        case 'ArrowLeft': case 'PageUp': album.prev('keyboard'); break;
        case 'Home': album.first('keyboard'); break;
        case 'End': album.last('keyboard'); break;
        case 'Escape': album.close(); break;
        default: return;
      }
      e.preventDefault();
    });
  }

  /**
   * Horizontal swipe on touch/pen. Vertical movement is left to the browser
   * (`touch-action: pan-y`) so long pages still scroll. While a horizontal drag
   * is in progress the offset is published as --drag-x for CSS to use.
   */
  function initSwipe(album, stage) {
    const AXIS_LOCK_PX = 8;
    let s = null;

    const reset = () => {
      stage.classList.remove('is-dragging');
      stage.style.removeProperty('--drag-x');
      s = null;
    };

    stage.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse' || !e.isPrimary) return;
      s = { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now(), axis: null, dx: 0 };
    });

    stage.addEventListener('pointermove', (e) => {
      if (!s || e.pointerId !== s.id) return;
      const dx = e.clientX - s.x;
      const dy = e.clientY - s.y;
      if (!s.axis) {
        if (Math.hypot(dx, dy) < AXIS_LOCK_PX) return;
        s.axis = Math.abs(dx) > Math.abs(dy) * 1.2 ? 'x' : 'y';
        if (s.axis === 'x') stage.classList.add('is-dragging');
      }
      if (s.axis !== 'x') return;
      s.dx = dx;
      const blocked = (dx > 0 && album.index === 0) || (dx < 0 && album.index === album.total - 1);
      const eased = clamp(dx * (blocked ? 0.12 : 0.35), -120, 120);
      stage.style.setProperty('--drag-x', `${eased.toFixed(1)}px`);
    });

    stage.addEventListener('pointerup', (e) => {
      if (!s || e.pointerId !== s.id) return;
      const { axis, dx } = s;
      const velocity = Math.abs(dx) / Math.max(1, performance.now() - s.t); // px/ms
      reset();
      if (axis !== 'x') return;
      const distance = Math.min(80, stage.clientWidth * 0.2);
      if (Math.abs(dx) >= distance || (velocity > 0.5 && Math.abs(dx) > 30)) {
        if (dx < 0) album.next('swipe'); else album.prev('swipe');
      }
    });

    stage.addEventListener('pointercancel', reset);
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
     7. Music
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
     8. Boot
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
    initSwipe(album, dom.stage);
    initPointerTracking();
    initMusic(cfg, album, $('#sound-btn'));

    // Exposed for the console and for later experiments.
    window.album = album;
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
