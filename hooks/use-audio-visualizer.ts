"use client"

import { useState, useEffect, type RefObject } from "react"

const BAR_COUNT = 32

export function useAudioVisualizer(audioRef: RefObject<HTMLAudioElement>, isPlaying: boolean) {
  const [bars, setBars] = useState<number[]>(Array(BAR_COUNT).fill(20))

  useEffect(() => {
    if (!isPlaying) {
      setBars(Array(BAR_COUNT).fill(20))
      return
    }

    // Simulate audio visualization with random heights
    const interval = setInterval(() => {
      setBars(Array.from({ length: BAR_COUNT }, () => Math.random() * 80 + 20))
    }, 100)

    return () => clearInterval(interval)
  }, [isPlaying])

  return { bars }
}
