"use client"

import { useState, useEffect } from "react"

export function useImageRotation(totalImages: number, interval = 5000): number {
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % totalImages)
    }, interval)

    return () => clearInterval(timer)
  }, [totalImages, interval])

  return currentIndex
}
