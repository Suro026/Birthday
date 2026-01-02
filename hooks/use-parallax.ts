"use client"

import type React from "react"

import { useRef } from "react"
import { useScroll, useTransform, type MotionValue } from "framer-motion"

interface ParallaxReturn {
  ref: React.RefObject<HTMLDivElement>
  offsetY: MotionValue<number>
}

export function useParallax(speed = 0.5): ParallaxReturn {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  })

  const offsetY = useTransform(scrollYProgress, [0, 1], [0, 300 * speed])

  return { ref, offsetY }
}
