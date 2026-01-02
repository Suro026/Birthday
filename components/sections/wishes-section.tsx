"use client"

import { motion } from "framer-motion"
import { Card } from "@/components/ui/card"
import { Heart, Star } from "lucide-react"
import { siteConfig } from "@/lib/config"

export function WishesSection() {
  const { birthdayWish, neetWish } = siteConfig.sections.wishes

  return (
    <section className="relative min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-rose-50 py-20">
      <div className="container px-4">
        <motion.div
          className="mx-auto max-w-5xl"
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
        >
          <h2 className="mb-4 text-center font-serif text-4xl font-bold text-rose-900 md:text-6xl">
            {siteConfig.sections.wishes.title}
          </h2>
          <p className="mb-16 text-center text-lg text-gray-700 md:text-xl">{siteConfig.sections.wishes.subtitle}</p>

          <div className="grid gap-8 md:grid-cols-2">
            {/* Birthday Wish Card */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              <Card className="group h-full overflow-hidden border-2 border-rose-200 bg-white/90 p-8 shadow-xl backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:shadow-2xl">
                <div className="mb-6 flex items-center justify-center">
                  <div className="rounded-full bg-gradient-to-r from-rose-500 to-pink-500 p-4">
                    <Heart className="h-8 w-8 text-white" fill="currentColor" />
                  </div>
                </div>

                <h3 className="mb-4 text-center font-serif text-2xl font-bold text-rose-900">{birthdayWish.title}</h3>

                <p className="leading-relaxed text-gray-700">{birthdayWish.message}</p>

                <div className="mt-6 flex justify-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Heart key={i} className="h-4 w-4 text-rose-400" fill="currentColor" />
                  ))}
                </div>
              </Card>
            </motion.div>

            {/* NEET Wish Card */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.4 }}
            >
              <Card className="group h-full overflow-hidden border-2 border-purple-200 bg-white/90 p-8 shadow-xl backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:shadow-2xl">
                <div className="mb-6 flex items-center justify-center">
                  <div className="rounded-full bg-gradient-to-r from-purple-500 to-blue-500 p-4">
                    <Star className="h-8 w-8 text-white" fill="currentColor" />
                  </div>
                </div>

                <h3 className="mb-4 text-center font-serif text-2xl font-bold text-purple-900">{neetWish.title}</h3>

                <p className="leading-relaxed text-gray-700">{neetWish.message}</p>

                <div className="mt-6 flex justify-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 text-purple-400" fill="currentColor" />
                  ))}
                </div>
              </Card>
            </motion.div>
          </div>

          {/* Decorative elements */}
          <motion.div
            className="mt-12 text-center"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1, delay: 0.6 }}
          >
            <p className="font-serif text-xl italic text-rose-600">With all my love, always and forever 💕</p>
          </motion.div>
        </motion.div>
      </div>

      {/* Background decoration */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -right-20 top-1/4 h-64 w-64 rounded-full bg-rose-200/20 blur-3xl" />
        <div className="absolute -left-20 bottom-1/4 h-64 w-64 rounded-full bg-purple-200/20 blur-3xl" />
      </div>
    </section>
  )
}
