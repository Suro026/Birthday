/* ==========================================================================
   ALBUM CONFIGURATION
   --------------------------------------------------------------------------
   This is the only file you need to edit to personalise the album.
   Anything you leave out falls back to a sensible default (see script.js).

   Dates are ISO strings ("YYYY-MM-DD") and are formatted automatically.
   A non-ISO value such as "Summer 2022" is shown exactly as written.
   ========================================================================== */
window.ALBUM_CONFIG = {

  /* Browser tab title and <html lang>. */
  site: {
    title: 'For Anaya — A Book of Memories',
    language: 'en',
  },

  /* Her name, as it appears on the cover and the title page. */
  recipient: {
    name: 'Anaya',
  },

  /* Her birthday. Shown on the title page when its showDate is true. */
  birthday: {
    date: '2000-10-14',
  },

  /* Opening screen (the "cover" of the book). */
  cover: {
    eyebrow: 'A Book of Memories',
    lead: 'For',
    button: 'Open the album',
    hint: 'Swipe, or use the arrow keys',
  },

  /* Folders that photo and music file names are resolved against.
     Absolute URLs ("https://…") and root paths ("/…") are used as they are. */
  base: {
    photos: 'assets/photos/',
    music: 'assets/music/',
  },

  /* ------------------------------------------------------------------------
     THE PAGES — one entry per physical page, in order.
     `layout` chooses the composition:

       opening      one large taped print, her name, a handwritten line
       collage      five overlapping prints            photos[5]
       full         a photograph that is the whole page  photo
       list         "little things" — a handwritten list  items[], photo (optional)
       timeline     moments set along a gold line         photos[4]
       polaroids    instant prints with written borders   photos[4]
       interactive  a loose pile — tap one to bring it forward  photos[6]
       reveal       the final page: a print slowly develops  photo
       (also: title, chapter, note, closing — simple typographic pages)

     A photograph ("memory") is:
       image        path of the picture. "/assets/photos/…" works from any folder.
       srcset       optional, e.g. '/assets/photos/photo-01-640.webp 640w, /assets/photos/photo-01-1200.webp 1200w'
       full         optional high-resolution file, fetched only when the photo is tapped
       ratio        '4/5', '1/1', '5/4' … shape of the print (avoids layout jumps)
       caption      the handwritten line
       date         "YYYY-MM-DD" or free text
       description  longer text, shown on the paper slip when tapped
       alt          optional description for screen readers (defaults to the caption)
       focus        CSS object-position, e.g. "50% 25%", to keep faces in frame
       position     { x, y, w } in % of the page — left, top and width of the print
       rotation     degrees; small numbers (±1–3) look most like a real print
       tape         'top' | 'corner' | 'both' | '' — a strip of tape holding it down
     Every layout has good default positions, so position / rotation / tape are optional.
     Only the page being read and its neighbours are downloaded.
     ------------------------------------------------------------------------ */
  pages: [
    /* 1 · Opening memory */
    { layout: 'opening',
      eyebrow: 'It began here',
      title: 'Anaya',
      photo: {
        image: '/assets/photos/photo-01.webp', ratio: '4/5', focus: '50% 40%',
        caption: 'the first photograph of us', date: '2023-02-14',
        description: 'Placeholder description. A few sentences about this day: where you were, what was said, what you remember.',
      } },

    /* 2 · Photo collage */
    { layout: 'collage',
      photos: [
        { image: '/assets/photos/photo-02.webp', caption: 'a quiet afternoon', date: '2023-03-02', description: 'Placeholder description for the first print in the collage.',
          position: { x: 12, y: 5, w: 52 }, rotation: -2.2, tape: 'top' },
        { image: '/assets/photos/photo-03.webp', ratio: '1/1', caption: 'that laugh', date: '2023-04-18', description: 'Placeholder description.',
          position: { x: 57, y: 13, w: 33 }, rotation: 3.1, tape: 'corner' },
        { image: '/assets/photos/photo-04.webp', ratio: '5/4', caption: 'somewhere new', date: '2023-05-21', description: 'Placeholder description.',
          position: { x: 14, y: 52, w: 40 }, rotation: 1.6 },
        { image: '/assets/photos/photo-05.webp', caption: 'golden hour', date: '2023-06-30', description: 'Placeholder description.',
          position: { x: 52, y: 44, w: 38 }, rotation: -2.8, tape: 'top' },
        { image: '/assets/photos/photo-06.webp', ratio: '1/1', caption: 'us, mid-sentence', date: '2023-07-09', description: 'Placeholder description.',
          position: { x: 32, y: 70, w: 30 }, rotation: 2.4, tape: 'corner' },
      ] },

    /* 3 · Full-screen-style photograph */
    { layout: 'full',
      title: 'The long way home',
      photo: {
        image: '/assets/photos/photo-07.webp', ratio: '3/4', focus: '50% 40%',
        caption: 'we never did take the shortcut', date: '2023-09-12',
        description: 'Placeholder description. Tap the photograph again to put the words away.',
      } },

    /* 4 · Little things I love about you */
    { layout: 'list',
      eyebrow: 'A small inventory',
      heading: 'Little things I love about you',
      items: [
        'The way you hum when you are concentrating',
        'How you remember the names of everyone\'s dogs',
        'Your terrible, wonderful sense of direction',
        'The first sip of coffee, and your face after it',
        'How you say goodnight twice',
        'That you notice the small things first',
      ],
      photo: { image: '/assets/photos/photo-08.webp', ratio: '4/5', caption: 'exhibit A', date: '2023-10-03', description: 'Placeholder description.' } },

    /* 5 · Timeline of memories */
    { layout: 'timeline',
      heading: 'How the days went',
      photos: [
        { image: '/assets/photos/photo-09.webp',  ratio: '1/1', caption: 'the first coffee',   date: '2023-02-14', description: 'Placeholder description for the first moment.' },
        { image: '/assets/photos/photo-10.webp', ratio: '1/1', caption: 'the first trip',     date: '2023-06-24', description: 'Placeholder description.' },
        { image: '/assets/photos/photo-11.webp', ratio: '1/1', caption: 'the long winter',    date: '2023-12-31', description: 'Placeholder description.' },
        { image: '/assets/photos/photo-12.webp', ratio: '1/1', caption: 'and now',            date: '2024-06-09', description: 'Placeholder description.' },
      ] },

    /* 6 · Polaroid / printed-photo composition */
    { layout: 'polaroids',
      photos: [
        { image: '/assets/photos/photo-13.webp', ratio: '5/6', caption: 'sunday',        date: '2024-01-07', description: 'Placeholder description.', rotation: -3.2, tape: 'top' },
        { image: '/assets/photos/photo-14.webp', ratio: '5/6', caption: 'rain, again',   date: '2024-02-11', description: 'Placeholder description.', rotation: 2.6 },
        { image: '/assets/photos/photo-15.webp', ratio: '5/6', caption: 'your idea',     date: '2024-03-23', description: 'Placeholder description.', rotation: 1.8, tape: 'corner' },
        { image: '/assets/photos/photo-16.webp', ratio: '5/6', caption: 'my favourite',  date: '2024-04-15', description: 'Placeholder description.', rotation: -2.1, tape: 'top' },
      ] },

    /* 7 · Interactive memory page */
    { layout: 'interactive',
      heading: 'Tap a memory',
      hint: 'Tap a photograph',
      photos: [
        { image: '/assets/photos/photo-17.webp', caption: 'little moment one',   date: '2024-05-01', description: 'Placeholder description. This is what appears when the photograph is brought forward.' },
        { image: '/assets/photos/photo-18.webp', caption: 'little moment two',   date: '2024-05-09', description: 'Placeholder description.' },
        { image: '/assets/photos/photo-19.webp', caption: 'little moment three', date: '2024-05-17', description: 'Placeholder description.' },
        { image: '/assets/photos/photo-20.webp', caption: 'little moment four',  date: '2024-05-25', description: 'Placeholder description.' },
        { image: '/assets/photos/photo-21.webp', caption: 'little moment five',  date: '2024-06-02', description: 'Placeholder description.' },
        { image: '/assets/photos/photo-22.webp', caption: 'little moment six',   date: '2024-06-08', description: 'Placeholder description.' },
      ] },

    /* 8 · Final reveal */
    { layout: 'reveal',
      heading: 'Happy Birthday',
      text: 'Placeholder closing line.',
      restartLabel: 'Back to the beginning',
      photo: { image: '/assets/photos/photo-23.webp', ratio: '4/5', caption: 'this one is for you', date: '2024-06-09',
        description: 'Placeholder description for the final photograph.' } },
  ],

  /* Background music.
     The track is only requested, and only starts, when she presses "Open the album"
     (browsers do not allow music before a tap). It keeps playing as pages turn,
     and she can pause or mute it from the two small words in the header.
     If the file is missing the music controls simply stay hidden.
     Use a recording you have the rights to — an original, a licence-free track or a
     song you own. Save it as assets/music/birthday-song.mp3 (about 2–4 MB, 128 kbps is plenty). */
  music: {
    src: '/assets/music/birthday-song.mp3',
    title: '',          // optional, shown as a tooltip on the control
    volume: 0.5,        // 0 – 1 (iOS ignores this; master the file quieter instead)
    loop: true,
    fadeMs: 1200,       // soft fade in on start/resume and out on pause (0 = none)
  },

  /* Interface text, in case you want to translate it. */
  ui: {
    previous: 'Previous',
    next: 'Next',
    close: 'Close album',
    play: 'Play',
    pause: 'Pause',
    mute: 'Mute',
    unmute: 'Unmute',
    playMusic: 'Play music',
    pauseMusic: 'Pause music',
    muteMusic: 'Mute music',
    unmuteMusic: 'Unmute music',
    page: 'Page',
    of: 'of',
    photograph: 'Photograph',
  },
};
