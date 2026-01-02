"use client"

import { useState, useEffect, useCallback, useRef } from "react"

interface AgeData {
  years: number
  months: number
  days: number
  hours: number
  minutes: number
  seconds: number
}

export function useAgeCalculator(birthDate: string): AgeData {
  const [age, setAge] = useState<AgeData>({
    years: 0,
    months: 0,
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  })

  const birthDateRef = useRef(new Date(birthDate))

  const calculateAge = useCallback(() => {
    const birth = birthDateRef.current
    const now = new Date()

    let years = now.getFullYear() - birth.getFullYear()
    let months = now.getMonth() - birth.getMonth()
    let days = now.getDate() - birth.getDate()
    let hours = now.getHours() - birth.getHours()
    let minutes = now.getMinutes() - birth.getMinutes()
    let seconds = now.getSeconds() - birth.getSeconds()

    if (seconds < 0) {
      seconds += 60
      minutes--
    }
    if (minutes < 0) {
      minutes += 60
      hours--
    }
    if (hours < 0) {
      hours += 24
      days--
    }
    if (days < 0) {
      const prevMonth = new Date(now.getFullYear(), now.getMonth(), 0)
      days += prevMonth.getDate()
      months--
    }
    if (months < 0) {
      months += 12
      years--
    }

    setAge({ years, months, days, hours, minutes, seconds })
  }, [])

  useEffect(() => {
    calculateAge()
    const interval = setInterval(calculateAge, 1000)

    return () => clearInterval(interval)
  }, [calculateAge])

  return age
}
