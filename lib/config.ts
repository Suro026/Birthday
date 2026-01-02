/**
 * Application Configuration
 * Centralized configuration for easy customization
 */

export const siteConfig = {
  // Personal Information
  birthDate: "2006-01-10T00:00:00",
  targetExam: {
    name: "NEET 2026",
    date: "2026-05-03T00:00:00",
  },

  // Content
  hero: {
    title: "Happy Birthday",
    subtitle: "To the Love of My Life",
    description:
      "Every moment with you is a treasure. This special day celebrates not just your birth, but the incredible person you've become and the beautiful journey we share together.",
  },

  sections: {
    age: {
      title: "Time Together",
      subtitle: "Every second with you counts",
      footnote: "Born on January 10, 2006",
    },
    gallery: {
      title: "Our Beautiful Moments",
      subtitle: "Memories we treasure forever",
      rotationInterval: 5000, // milliseconds
    },
    music: {
      title: "Our Playlist",
      subtitle: "Songs that tell our story",
      songs: [
        {
          title: "Perfect",
          artist: "Ed Sheeran",
          audioUrl: "/songs/perfect.mp3",
          albumArt: "/album-art/perfect.jpg",
        },
        {
          title: "A Thousand Years",
          artist: "Christina Perri",
          audioUrl: "/songs/thousand-years.mp3",
          albumArt: "/album-art/thousand-years.jpg",
        },
        {
          title: "All of Me",
          artist: "John Legend",
          audioUrl: "/songs/all-of-me.mp3",
          albumArt: "/album-art/all-of-me.jpg",
        },
        {
          title: "Thinking Out Loud",
          artist: "Ed Sheeran",
          audioUrl: "/songs/thinking-out-loud.mp3",
          albumArt: "/album-art/thinking-out-loud.jpg",
        },
        {
          title: "Make You Feel My Love",
          artist: "Adele",
          audioUrl: "/songs/make-you-feel.mp3",
          albumArt: "/album-art/make-you-feel.jpg",
        },
      ],
    },
    wishes: {
      title: "My Wishes For You",
      subtitle: "Words from the heart",
      birthdayWish: {
        title: "Happy Birthday, My Love",
        message:
          "On this special day, I want you to know how incredibly blessed I feel to have you in my life. Your smile brightens my darkest days, your laughter is my favorite melody, and your love is my greatest treasure. May this year bring you endless joy, unforgettable moments, and all the dreams your heart desires. You deserve nothing but the absolute best that life has to offer. Happy Birthday, my beautiful soul. I love you more than words can ever express.",
      },
      neetWish: {
        title: "Your NEET 2026 Journey",
        message:
          "I believe in you with every fiber of my being. You have the intelligence, dedication, and perseverance to achieve your dreams of becoming a doctor. Every late night studying, every practice test, every moment of doubt you overcome - they're all steps toward your incredible future. Remember that I'm here supporting you every step of the way. When the journey gets tough, know that your hard work will pay off. You're going to make an amazing doctor, and I can't wait to see you accomplish this dream. Keep pushing forward, my star. Your success is inevitable.",
      },
    },
    countdown: {
      motivationalQuote: "Success is not final, failure is not fatal: it is the courage to continue that counts.",
      encouragement: "Your dreams are within reach. Keep pushing forward!",
    },
  },

  // Gallery Images
  galleryImages: [
    "/images/128.jpg",
    "/images/147.jpg",
    "/images/226.jpg",
    "/images/253.jpg",
    "/images/359.jpg",
    "/images/510.jpg",
    "/images/530.jpg",
    "/images/535.jpg",
    "/images/536.jpg",
    "/images/541.jpg"
  ],

  // SEO
  metadata: {
    title: "Happy Birthday - A Special Celebration",
    description: "A beautiful birthday celebration website filled with love, memories, and dreams for the future",
    keywords: ["birthday", "celebration", "love", "memories"],
  },
} as const

export type SiteConfig = typeof siteConfig
