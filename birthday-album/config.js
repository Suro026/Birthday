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

       title    cover plate           eyebrow, subtitle, showDate
       full     full-bleed photograph photo, date, title, caption
       single   matted photograph     photo, date, title, caption
       duo      large + small print   photos[2], date, title, caption
       corners  prints on corners     photos[3], date
       strip    contact sheet         heading, photos[3] (each: date, caption)
       mosaic   one large, two small  photos[3], date, title, caption
       chapter  wine divider          numeral, title, caption
       note     the written message   heading, paragraphs[], signoff, signature
       closing  last page             heading, text, restartLabel

     A photo is { photo, alt, focus, date, title, caption }.
       photo  file name inside base.photos (a missing file shows a placeholder plate)
       focus  CSS object-position, e.g. "50% 25%", to keep faces in frame
       date   "YYYY-MM-DD" or free text
     For single-photo layouts you can put these fields on the page itself.
     ------------------------------------------------------------------------ */
  pages: [
    { layout: 'title',
      eyebrow: 'Happy Birthday',
      subtitle: 'Placeholder subtitle — a short line that introduces the album.',
      showDate: true },

    { layout: 'full',
      photo: '01.jpg', focus: '50% 40%',
      date: '2023-02-14', title: 'Full-bleed page',
      caption: 'Placeholder caption for a photograph that runs to the edges.' },

    { layout: 'single',
      photo: '02.jpg', focus: '50% 35%',
      date: '2023-05-21', title: 'Matted page',
      caption: 'Placeholder caption beneath a single, quietly framed photograph.' },

    { layout: 'duo',
      photos: [
        { photo: '03.jpg', focus: '50% 40%' },
        { photo: '04.jpg', focus: '50% 50%' },
      ],
      date: '2023-08-05', title: 'Two prints',
      caption: 'Placeholder caption for a pair of photographs.' },

    { layout: 'chapter',
      numeral: 'II',
      title: 'Chapter title',
      caption: 'Placeholder line for a chapter opener.' },

    { layout: 'corners',
      photos: [
        { photo: '05.jpg', focus: '50% 40%' },
        { photo: '06.jpg', focus: '50% 30%' },
        { photo: '07.jpg', focus: '50% 50%' },
      ],
      date: '2023-11-12', title: 'Mounted prints' },

    { layout: 'note',
      heading: 'A few words',
      paragraphs: [
        'Placeholder for the birthday message. The final words will go here.',
        'A second short paragraph, set in the same quiet serif.',
      ],
      signoff: 'Always,',
      signature: 'Yours' },

    { layout: 'strip',
      heading: 'Contact sheet',
      photos: [
        { photo: '08.jpg', date: '2024-01-20', caption: 'Placeholder frame one' },
        { photo: '09.jpg', date: '2024-03-02', caption: 'Placeholder frame two' },
        { photo: '10.jpg', date: '2024-04-18', caption: 'Placeholder frame three' },
      ] },

    { layout: 'mosaic',
      photos: [
        { photo: '11.jpg', focus: '50% 40%' },
        { photo: '12.jpg', focus: '50% 40%' },
        { photo: '13.jpg', focus: '50% 40%' },
      ],
      date: '2024-06-09', title: 'Mosaic page',
      caption: 'Placeholder caption for a larger photograph and two companions.' },

    { layout: 'closing',
      heading: 'Happy Birthday',
      text: 'Placeholder closing line.',
      restartLabel: 'Back to the beginning' },
  ],

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
