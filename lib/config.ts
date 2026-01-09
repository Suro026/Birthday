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
          audioUrl: "/songs/AUD-20260106-WA0018.mp3",
          albumArt: "/album-art/perfect.jpg",
        },
        {
          title: "Notun Prem E Gaan",
          artist: "Debraj Bhattacharya & Surangana Bandyopadhyay",
          audioUrl: "/songs/AUD-20260106-WA0021.mp3",
          albumArt: "/album-art/one.jpg",
        },
        {
          title: "Du Hathe Mutho Bhore",
          artist: "Debraj Battacharya",
          audioUrl: "/songs/Du_Haatey_Mutho_Bhorey_Talmar_Romeo_Juliet_Debdutta_Hiya_Debraj.mp3",
          albumArt: "/album-art/two.jpg",
        },
        {
          title: "Ami ek garib premik neela",
          artist: "Argha Dev",
          audioUrl: "/songs/Ami ek garib premik neela _      _ Argha dev _ Lyrical Video (1).mp3",
          albumArt: "/album-art/three.jpg",
        },
        {
          title: "Ham Tere Pyar Mein",
          artist: "Lata Mangeshkar",
          audioUrl: "/songs/AUD-20260106-WA0020 (1).mp3",
          albumArt: "/album-art/four.jpg",
        },
      ],
    },
    wishes: {
      title: "My Wishes For You",
      subtitle: "Words from the heart",
      birthdayWish: {
        title: "Happy Birthday, My Love",
        message:
          "Happiest 20' Birthday 
Mummum 🤍💗
Etai amar deoa as a devoloper gift 
Hya ami bisas korte parchi sei chotto baccha gunda ta etto boro hoye gelo ... 💗🤍🤍🤍💗💗💗
Happy happy happy happy happy birthday onektaaaaaaaaaaa bhalobasa ... 
Uuuuummahhhhhhhh ....💗🤍💗🤍💗🤍💗🤍💗🤍💗🤍💗🤍💗🤍💗🤍💗🤍💗🤍💗🤍
Ami tomake onek bhalobasi ... 
Tumi amar jibon er sobcheye boro angsho ...
I LOVE YOU MUMMUM 💗🤍💗🤍💗🤍💗🤍💗🤍💗...🤍💗🤍💗🤍💗🤍💗🤍💗🤍",
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
    "/us1.jpg",
    "/us2.jpg",
    "/us3.jpg",
    "/us4.jpg",
    "/us5.jpg",
    "/us6.jpg",
    "/us7.jpg",
    "/us8.jpg",
    "/us9.jpg",
    "/us10.jpg"
  ],

  // SEO
  metadata: {
    title: "Happy Birthday - A Special Celebration",
    description: "A beautiful birthday celebration website filled with love, memories, and dreams for the future",
    keywords: ["birthday", "celebration", "love", "memories"],
  },
} as const

export type SiteConfig = typeof siteConfig
