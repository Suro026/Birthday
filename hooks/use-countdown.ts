"use client"

import { useState, useEffect, useCallback, useRef } from "react"

interface CountdownData {
  days: number
  hours: number
  minutes: number
  seconds: number
  totalSeconds: number
}

export function useCountdown(targetDate: string): CountdownData {
  const [countdown, setCountdown] = useState<CountdownData>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    totalSeconds: 0,
  })

  const targetDateRef = useRef(new Date(targetDate))

  const calculateCountdown = useCallback(() => {
    const target = targetDateRef.current
    const now = new Date()
    const difference = target.getTime() - now.getTime()

    if (difference > 0) {
      const totalSeconds = Math.floor(difference / 1000)
      const days = Math.floor(difference / (1000 * 60 * 60 * 24))
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((difference % (1000 * 60)) / 1000)

      setCountdown({ days, hours, minutes, seconds, totalSeconds })
    } else {
      setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0, totalSeconds: 0 })
    }
  }, [])

  useEffect(() => {
    calculateCountdown()
    const interval = setInterval(calculateCountdown, 1000)

    return () => clearInterval(interval)
  }, [calculateCountdown])

  return countdown
}
