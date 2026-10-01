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

  /* Her birthday. Shown on the title page when titlePage.showDate is true. */
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

  /* First page inside the album. */
  titlePage: {
    eyebrow: 'Happy Birthday',
    subtitle: 'A small collection of the days I would live again.',
    showDate: true,
  },

  /* The birthday message. One string per paragraph. Set enabled:false to skip. */
  letter: {
    enabled: true,
    heading: 'A few words',
    paragraphs: [
      'Some people arrive like weather. You arrived like a season — slowly, then all at once, and somehow everything was different.',
      'I made this book because a message felt too small. These are the days I keep returning to, in the order my heart keeps them.',
      'Happy birthday. Thank you for every page so far, and for the ones we have not written yet.',
    ],
    signoff: 'Always,',
    signature: 'Yours',
  },

  /* Folders that photo and music file names are resolved against.
     Absolute URLs ("https://…") and root paths ("/…") are used as they are. */
  base: {
    photos: 'assets/photos/',
    music: 'assets/music/',
  },

  /* One entry per memory page, in order.
       photo   file name inside base.photos          (missing files show a placeholder plate)
       date    "YYYY-MM-DD" or free text
       title   optional heading above the caption
       caption the line of text under the photograph
       alt     optional description for screen readers (defaults to the caption)
       focus   optional CSS object-position, e.g. "50% 25%" to keep faces in frame */
  memories: [
    {
      photo: '01.jpg',
      date: '2023-02-14',
      title: 'The first one',
      caption: 'We said we would stay for one coffee. The café closed around us.',
      focus: '50% 40%',
    },
    {
      photo: '02.jpg',
      date: '2023-08-05',
      title: 'Somewhere by the water',
      caption: 'You laughed at the exact moment the light went gold. I did not look at the sunset.',
      focus: '50% 50%',
    },
    {
      photo: '03.jpg',
      date: '2024-01-20',
      title: 'An ordinary Saturday',
      caption: 'Nothing happened, and it is still my favourite day.',
      focus: '50% 30%',
    },
  ],

  /* Final page. */
  closing: {
    enabled: true,
    heading: 'Happy Birthday',
    text: 'To many more pages.',
    restartLabel: 'Back to the beginning',
  },

  /* Background music. Leave src empty for a silent album.
     The sound button only appears when a file is configured.
     Browsers only allow audio after a tap, so it starts when she opens the album. */
  music: {
    src: '',            // e.g. 'our-song.mp3' (placed in assets/music/)
    title: '',          // shown as the sound button's tooltip
    volume: 0.6,        // 0 – 1
    loop: true,
  },

  /* Interface text, in case you want to translate it. */
  ui: {
    previous: 'Previous',
    next: 'Next',
    close: 'Close album',
    soundOff: 'Turn sound off',
    soundOn: 'Turn sound on',
    page: 'Page',
    of: 'of',
    photograph: 'Photograph',
  },
};
