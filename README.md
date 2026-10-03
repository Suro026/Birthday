<<<<<<< HEAD
# Birthday
=======
# Birthday Celebration Website

A premium, professionally-crafted birthday celebration website built with Next.js 16, React 19, TypeScript, and Framer Motion.

## Features

- **Live Age Counter** - Real-time calculation showing years, months, days, hours, minutes, and seconds since birth
- **Dynamic Photo Gallery** - Auto-rotating gallery with smooth transitions
- **Interactive Music Player** - Audio player with visualizer and playback controls
- **Exam Countdown** - Motivational countdown timer for NEET 2026
- **Smooth Animations** - Professional animations using Framer Motion
- **Fully Responsive** - Optimized for all screen sizes
- **Type-Safe** - Built with TypeScript for reliability
- **Error Boundaries** - Production-ready error handling
- **SEO Optimized** - Enhanced metadata and semantic HTML

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **UI Library**: React 19
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **Animations**: Framer Motion
- **Components**: Radix UI + shadcn/ui
- **Icons**: Lucide React
- **Fonts**: Playfair Display, Inter, Dancing Script

## Project Structure

```
├── app/
│   ├── page.tsx              # Main page component
│   ├── layout.tsx            # Root layout with fonts and metadata
│   └── globals.css           # Global styles and design tokens
├── components/
│   ├── sections/             # Page sections
│   │   ├── hero-section.tsx
│   │   ├── age-counter.tsx
│   │   ├── photo-gallery.tsx
│   │   ├── music-player.tsx
│   │   └── neet-countdown.tsx
│   ├── layout/               # Layout components
│   │   └── smooth-scroll.tsx
│   ├── error-boundary.tsx    # Error handling
│   └── loading-spinner.tsx   # Loading states
├── hooks/                    # Custom React hooks
│   ├── use-age-calculator.ts
│   ├── use-countdown.ts
│   ├── use-image-rotation.ts
│   ├── use-audio-visualizer.ts
│   ├── use-parallax.ts
│   └── use-scroll-reveal.ts
├── lib/
│   ├── config.ts             # Centralized configuration
│   └── utils.ts              # Utility functions
└── public/                   # Static assets (images, audio)
```

## Configuration

All site content and settings are centralized in `lib/config.ts`:

```typescript
export const siteConfig = {
  birthDate: "2006-01-10T00:00:00",
  targetExam: {
    name: "NEET 2026",
    date: "2026-05-03T00:00:00",
  },
  // ... more configuration options
}
```

### Customization Guide

1. **Personal Information**: Update `birthDate` and `targetExam` in `lib/config.ts`
2. **Content**: Modify text in the `hero` and `sections` objects
3. **Gallery Images**: Replace images in the `public/` folder and update paths in `galleryImages` array
4. **Music**: Replace `public/romantic-song.mp3` with your preferred audio file
5. **Styling**: Customize colors in `app/globals.css` using CSS variables

## Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## Custom Hooks

### `useAgeCalculator(birthDate: string)`
Calculates and updates age in real-time with years, months, days, hours, minutes, seconds.

### `useCountdown(targetDate: string)`
Provides countdown to a target date with days, hours, minutes, seconds.

### `useImageRotation(totalImages: number, interval: number)`
Manages automatic image rotation for galleries.

### `useAudioVisualizer(audioRef, isPlaying)`
Generates visual bars for audio player.

### `useParallax(speed: number)`
Creates parallax scrolling effects.

## Performance Optimizations

- Image optimization with Next.js Image component
- Lazy loading with Suspense boundaries
- Memoized components to prevent unnecessary re-renders
- CSS-in-JS with zero runtime cost (Tailwind)
- Framer Motion optimized animations

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## License

Private - Created for personal use

## Credits

Built with v0 by Vercel
>>>>>>> 85e5dde (initial)
