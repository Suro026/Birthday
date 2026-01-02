"use client"

import { motion } from "framer-motion"
import { useParallax } from "@/hooks/use-parallax"
import { cn } from "@/lib/utils"
import { siteConfig } from "@/lib/config"

export function HeroSection() {
  const { ref, offsetY } = useParallax(0.5)

  return (
    <section
      ref={ref}
      className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-rose-50 via-purple-50 to-pink-50"
    >
      {/* Animated background gradient orbs */}
      <motion.div
        className="absolute inset-0 opacity-30"
        animate={{
          background: [
            "radial-gradient(circle at 20% 50%, rgba(251, 207, 232, 0.8) 0%, transparent 50%)",
            "radial-gradient(circle at 80% 50%, rgba(196, 181, 253, 0.8) 0%, transparent 50%)",
            "radial-gradient(circle at 50% 80%, rgba(252, 231, 243, 0.8) 0%, transparent 50%)",
            "radial-gradient(circle at 20% 50%, rgba(251, 207, 232, 0.8) 0%, transparent 50%)",
          ],
        }}
        transition={{ duration: 20, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
      />

      <div className="container relative z-10 px-4">
        <motion.div
          className="mx-auto max-w-4xl text-center"
          style={{ y: offsetY }}
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: "easeOut" }}
        >
          <motion.h1
            className={cn(
              "mb-6 font-serif text-6xl font-bold text-rose-900 md:text-8xl",
              "bg-gradient-to-r from-rose-600 via-purple-600 to-pink-600 bg-clip-text text-transparent",
            )}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, duration: 0.8 }}
          >
            {siteConfig.hero.title}
          </motion.h1>

          <motion.p
            className="mb-8 font-serif text-2xl italic text-purple-700 md:text-4xl"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.8 }}
          >
            {siteConfig.hero.subtitle}
          </motion.p>

          <motion.p
            className="mx-auto max-w-2xl text-balance font-sans text-lg leading-relaxed text-gray-700 md:text-xl"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9, duration: 0.8 }}
          >
            {siteConfig.hero.description}
          </motion.p>

          <motion.div
            className="mt-12"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2, duration: 0.8 }}
          >
            <div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-6 py-3 shadow-lg backdrop-blur-sm">
              <span className="text-sm font-medium text-gray-600">Scroll to explore</span>
              <motion.svg
                className="h-5 w-5 text-rose-500"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
                animate={{ y: [0, 5, 0] }}
                transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY }}
              >
                <path d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </motion.svg>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
