"use client"

import { motion, useMotionValue, useTransform, animate } from "framer-motion"
import { useCountdown } from "@/hooks/use-countdown"
import { Trophy, Target, Zap, Clock, BookOpen, Brain, Star, TrendingUp } from "lucide-react"
import { siteConfig } from "@/lib/config"
import { useEffect } from "react"

function AnimatedCounter({ value, className }: { value: number; className?: string }) {
  const motionValue = useMotionValue(0)
  const rounded = useTransform(motionValue, (latest) => Math.round(latest))

  useEffect(() => {
    const animation = animate(motionValue, value, {
      duration: 0.6,
      ease: [0.4, 0, 0.2, 1],
    })
    return animation.stop
  }, [motionValue, value])

  return <motion.span className={className}>{rounded.get().toString().padStart(2, "0")}</motion.span>
}

export function NeetCountdown() {
  const { days, hours, minutes, seconds } = useCountdown(siteConfig.targetExam.date)

  const timeUnits = [
    {
      label: "Days",
      value: days,
      icon: Target,
      decorIcon: BookOpen,
      emoji: "📅",
      color: "from-amber-400 to-orange-600",
      shadowColor: "shadow-orange-500/50",
      metric: "Study Sessions",
      metricValue: Math.max(0, days * 3),
    },
    {
      label: "Hours",
      value: hours,
      icon: Clock,
      decorIcon: Brain,
      emoji: "⏰",
      color: "from-purple-400 to-violet-600",
      shadowColor: "shadow-purple-500/50",
      metric: "Focus Time",
      metricValue: hours,
    },
    {
      label: "Minutes",
      value: minutes,
      icon: Zap,
      decorIcon: Star,
      emoji: "⭐",
      color: "from-pink-400 to-rose-600",
      shadowColor: "shadow-pink-500/50",
      metric: "Momentum",
      metricValue: minutes,
    },
    {
      label: "Seconds",
      value: seconds,
      icon: Trophy,
      decorIcon: TrendingUp,
      emoji: "🚀",
      color: "from-cyan-400 to-blue-600",
      shadowColor: "shadow-cyan-500/50",
      metric: "Dedication",
      metricValue: seconds,
    },
  ]

  return (
    <section className="relative min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-rose-50 py-20">
      <div className="container px-4">
        <motion.div
          className="mx-auto max-w-6xl text-center"
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
        >
          <motion.div
            className="mb-6 flex justify-center"
            initial={{ scale: 0, rotate: -180 }}
            whileInView={{ scale: 1, rotate: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          >
            <div className="relative">
              <div className="absolute inset-0 animate-ping rounded-full bg-yellow-400 opacity-20" />
              <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500 shadow-2xl">
                <Trophy className="h-12 w-12 text-white" />
              </div>
            </div>
          </motion.div>

          <h2 className="mb-4 font-serif text-4xl font-bold text-rose-900 md:text-6xl">
            {siteConfig.targetExam.name} Countdown
          </h2>
          <p className="mb-12 text-lg text-gray-700 md:text-xl">{siteConfig.sections.countdown.encouragement}</p>

          <div className="grid grid-cols-2 gap-6 md:grid-cols-4 md:gap-8">
            {timeUnits.map((unit, index) => {
              const Icon = unit.icon
              const DecorIcon = unit.decorIcon
              return (
                <motion.div
                  key={unit.label}
                  initial={{ opacity: 0, y: 30, rotate: -10 }}
                  whileInView={{ opacity: 1, y: 0, rotate: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1, duration: 0.6, type: "spring" }}
                  className="group relative"
                >
                  <motion.div
                    className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 opacity-75 blur-lg"
                    animate={{
                      opacity: [0.5, 0.75, 0.5],
                      scale: [0.95, 1.05, 0.95],
                    }}
                    transition={{
                      duration: 3,
                      repeat: Number.POSITIVE_INFINITY,
                      delay: index * 0.3,
                    }}
                  />

                  <div className="relative overflow-hidden rounded-3xl bg-white p-6 shadow-2xl transition-all hover:scale-105 md:p-8">
                    <motion.div
                      className="absolute -right-4 -top-4 h-16 w-16"
                      animate={{
                        rotate: [0, 360],
                      }}
                      transition={{
                        duration: 20,
                        repeat: Number.POSITIVE_INFINITY,
                        ease: "linear",
                        delay: index * 0.5,
                      }}
                    >
                      <div className={`h-full w-full rounded-full bg-gradient-to-br ${unit.color} opacity-10`} />
                    </motion.div>

                    <motion.div
                      className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-white to-gray-50 shadow-lg ring-2 ring-gray-100"
                      animate={{
                        scale: [1, 1.05, 1],
                        rotate: [0, 5, 0, -5, 0],
                      }}
                      transition={{ duration: 3, repeat: Number.POSITIVE_INFINITY, delay: index * 0.2 }}
                    >
                      <span className="text-3xl">{unit.emoji}</span>
                    </motion.div>

                    <div
                      className={`mb-2 bg-gradient-to-br ${unit.color} bg-clip-text font-mono text-5xl font-black text-transparent md:text-6xl`}
                    >
                      <AnimatedCounter value={unit.value} />
                    </div>

                    <div className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-xs font-bold uppercase tracking-widest text-transparent">
                      {unit.label}
                    </div>

                    <motion.div
                      className="mt-4 flex items-center justify-center gap-1 rounded-full bg-gradient-to-r from-purple-50 to-pink-50 px-3 py-1.5"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 + index * 0.1 }}
                    >
                      <DecorIcon className="h-3 w-3 text-purple-500" />
                      <span className="text-xs font-semibold text-purple-600">
                        {unit.metricValue} {unit.metric}
                      </span>
                    </motion.div>

                    <motion.div
                      className={`absolute right-2 top-2 h-3 w-3 rounded-full bg-gradient-to-br ${unit.color}`}
                      animate={{
                        opacity: [0.3, 0.7, 0.3],
                        scale: [0.8, 1.2, 0.8],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Number.POSITIVE_INFINITY,
                        delay: index * 0.2,
                      }}
                    />
                    <motion.div
                      className={`absolute bottom-2 left-2 h-3 w-3 rounded-full bg-gradient-to-br ${unit.color}`}
                      animate={{
                        opacity: [0.3, 0.7, 0.3],
                        scale: [0.8, 1.2, 0.8],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Number.POSITIVE_INFINITY,
                        delay: 0.5 + index * 0.2,
                      }}
                    />
                  </div>
                </motion.div>
              )
            })}
          </div>

          <motion.div
            className="relative mt-16 overflow-hidden rounded-3xl"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.6, duration: 0.8 }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-pink-600 to-orange-600 opacity-90" />
            <div className="relative p-10">
              <motion.div
                className="mb-4 inline-block rounded-full bg-white/20 px-4 py-2 text-sm font-semibold uppercase tracking-wider text-white backdrop-blur-sm"
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
              >
                Motivational Quote
              </motion.div>
              <p className="font-serif text-2xl italic text-white md:text-3xl">
                &quot;{siteConfig.sections.countdown.motivationalQuote}&quot;
              </p>
              <div className="mt-6 flex items-center justify-center gap-2 text-white/90">
                <Clock className="h-5 w-5" />
                <p className="text-sm font-medium">
                  Exam Date:{" "}
                  {new Date(siteConfig.targetExam.date).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
