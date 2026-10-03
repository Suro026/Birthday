"use client"

import { Suspense } from "react"
import { HeroSection } from "@/components/sections/hero-section"
import { AgeCounter } from "@/components/sections/age-counter"
import { PhotoGallery } from "@/components/sections/photo-gallery"
import { MusicPlayer } from "@/components/sections/music-player"
import { WishesSection } from "@/components/sections/wishes-section"
import { NeetCountdown } from "@/components/sections/neet-countdown"
import { SmoothScroll } from "@/components/layout/smooth-scroll"
import { ErrorBoundary } from "@/components/error-boundary"
import { LoadingSection } from "@/components/sections/loading-section"
import { useScrollReveal } from "@/hooks/use-scroll-reveal"

export default function BirthdayPage() {
  useScrollReveal()

  return (
    <ErrorBoundary>
      <SmoothScroll>
        <main className="relative">
          <Suspense fallback={<LoadingSection />}>
            <HeroSection />
            <AgeCounter />
            <PhotoGallery />
            <MusicPlayer />
            <WishesSection />
            <NeetCountdown />
          </Suspense>
        </main>
      </SmoothScroll>
    </ErrorBoundary>
  )
}
