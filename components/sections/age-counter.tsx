"use client"

import { motion, useMotionValue, useTransform, animate } from "framer-motion"
import { useAgeCalculator } from "@/hooks/use-age-calculator"
import { siteConfig } from "@/lib/config"
import { Heart, Sparkles, Stars } from "lucide-react"
import { useEffect } from "react"

function AnimatedNumber({ value, className }: { value: number; className?: string }) {
  const motionValue = useMotionValue(0)
  const rounded = useTransform(motionValue, (latest) => Math.round(latest))

  useEffect(() => {
    const animation = animate(motionValue, value, {
      duration: 0.5,
      ease: "easeOut",
    })
    return animation.stop
  }, [motionValue, value])

  return <motion.span className={className}>{rounded.get().toString().padStart(2, "0")}</motion.span>
}

export function AgeCounter() {
  const { years, months, days, hours, minutes, seconds } = useAgeCalculator(siteConfig.birthDate)

  const timeUnits = [
    {
      label: "Years",
      value: years,
      max: 100,
      color: "from-rose-400 to-pink-600",
      icon: Heart,
      percentage: ((years % 100) / 100) * 100,
    },
    {
      label: "Months",
      value: months,
      max: 12,
      color: "from-purple-400 to-violet-600",
      icon: Sparkles,
      percentage: (months / 12) * 100,
    },
    {
      label: "Days",
      value: days,
      max: 31,
      color: "from-pink-400 to-rose-600",
      icon: Stars,
      percentage: (days / 31) * 100,
    },
  ]

  const smallUnits = [
    { label: "Hours", value: hours, max: 24 },
    { label: "Minutes", value: minutes, max: 60 },
    { label: "Seconds", value: seconds, max: 60 },
  ]

  return (
    <section className="relative min-h-screen bg-gradient-to-br from-purple-50 via-rose-50 to-pink-50 py-20">
      <div className="container px-4">
        <motion.div
          className="mx-auto max-w-6xl text-center"
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
        >
          <h2 className="mb-4 font-serif text-4xl font-bold text-rose-900 md:text-6xl">
            {siteConfig.sections.age.title}
          </h2>
          <p className="mb-12 text-lg text-gray-700 md:text-xl">{siteConfig.sections.age.subtitle}</p>

          <div className="mb-12 grid grid-cols-1 gap-8 md:grid-cols-3">
            {timeUnits.map((unit, index) => {
              const Icon = unit.icon
              const circumference = 2 * Math.PI * 90
              const offset = circumference - (unit.percentage / 100) * circumference

              return (
                <motion.div
                  key={unit.label}
                  initial={{ opacity: 0, scale: 0.5 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.15, duration: 0.6, type: "spring" }}
                  className="relative"
                >
                  <div className="group relative flex aspect-square items-center justify-center">
                    <svg className="absolute inset-0 h-full w-full -rotate-90 transform">
                      <defs>
                        <linearGradient id={`gradient${index}`} x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor={index === 0 ? "#fb7185" : index === 1 ? "#c084fc" : "#f9a8d4"} />
                          <stop
                            offset="100%"
                            stopColor={index === 0 ? "#ec4899" : index === 1 ? "#9333ea" : "#be123c"}
                          />
                        </linearGradient>
                        <filter id={`glow${index}`}>
                          <feGaussianBlur stdDeviation="4" result="coloredBlur" />
                          <feMerge>
                            <feMergeNode in="coloredBlur" />
                            <feMergeNode in="SourceGraphic" />
                          </feMerge>
                        </filter>
                      </defs>
                      <circle
                        cx="50%"
                        cy="50%"
                        r="90"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="12"
                        className="text-gray-200"
                      />
                      <motion.circle
                        cx="50%"
                        cy="50%"
                        r="90"
                        fill="none"
                        strokeWidth="12"
                        strokeLinecap="round"
                        stroke={`url(#gradient${index})`}
                        filter={`url(#glow${index})`}
                        style={{
                          strokeDasharray: circumference,
                          strokeDashoffset: offset,
                        }}
                        initial={{ strokeDashoffset: circumference }}
                        animate={{ strokeDashoffset: offset }}
                        transition={{ duration: 1.5, delay: index * 0.2, ease: "easeInOut" }}
                      />
                    </svg>

                    <div className="relative z-10 flex flex-col items-center">
                      <motion.div
                        className="font-mono text-5xl font-bold text-rose-600 md:text-6xl"
                        key={unit.value}
                        initial={{ scale: 1.3, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.3 }}
                      >
                        <AnimatedNumber value={unit.value} />
                      </motion.div>

                      <div className="mt-1 text-sm font-semibold uppercase tracking-wider text-purple-700">
                        {unit.label}
                      </div>
                    </div>

                    <motion.div
                      className={`absolute inset-0 rounded-full bg-gradient-to-br ${unit.color} opacity-0 blur-2xl transition-opacity`}
                      animate={{
                        opacity: [0, 0.2, 0],
                        scale: [0.8, 1.1, 0.8],
                      }}
                      transition={{
                        duration: 3,
                        repeat: Number.POSITIVE_INFINITY,
                        delay: index * 0.5,
                      }}
                    />
                  </div>
                </motion.div>
              )
            })}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.6, duration: 0.8 }}
            className="mx-auto max-w-2xl"
          >
            <div className="rounded-2xl border-2 border-rose-200 bg-white/70 p-6 shadow-xl backdrop-blur-sm">
              <div className="flex items-center justify-center gap-2">
                {smallUnits.map((unit, index) => (
                  <div key={unit.label} className="flex items-center">
                    {index > 0 && <span className="mx-2 text-3xl font-bold text-rose-400">:</span>}
                    <div className="text-center">
                      <motion.div
                        className="rounded-lg bg-gradient-to-br from-rose-500 to-purple-600 px-4 py-3 font-mono text-3xl font-bold text-white shadow-lg md:px-6 md:text-4xl"
                        key={unit.value}
                        initial={{ scale: 1.1, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.2 }}
                      >
                        {String(unit.value).padStart(2, "0")}
                      </motion.div>
                      <div className="mt-2 text-xs font-medium uppercase tracking-wider text-purple-600">
                        {unit.label}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          <motion.p
            className="mt-12 font-serif text-xl italic text-purple-600"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.8, duration: 0.8 }}
          >
            {siteConfig.sections.age.footnote}
          </motion.p>
        </motion.div>
      </div>
    </section>
  )
}
