"use client"

import { motion } from "framer-motion"
import { LoadingSpinner } from "@/components/loading-spinner"

export function LoadingSection() {
  return (
    <section className="flex min-h-screen items-center justify-center bg-gradient-to-br from-rose-50 via-purple-50 to-pink-50">
      <motion.div
        className="text-center"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <LoadingSpinner size="lg" />
        <p className="mt-6 font-serif text-xl text-purple-700">Loading your special celebration...</p>
      </motion.div>
    </section>
  )
}
