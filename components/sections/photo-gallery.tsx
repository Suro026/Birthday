"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Image from "next/image"
import { useImageRotation } from "@/hooks/use-image-rotation"
import { siteConfig } from "@/lib/config"

export function PhotoGallery() {
  const currentIndex = useImageRotation(siteConfig.galleryImages.length, siteConfig.sections.gallery.rotationInterval)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    setIsLoaded(true)
  }, [])

  return (
    <section className="relative min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-rose-50 py-20">
      <div className="container px-4">
        <motion.div
          className="mx-auto max-w-6xl"
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
        >
          <h2 className="mb-4 text-center font-serif text-4xl font-bold text-rose-900 md:text-6xl">
            {siteConfig.sections.gallery.title}
          </h2>
          <p className="mb-12 text-center text-lg text-gray-700 md:text-xl">{siteConfig.sections.gallery.subtitle}</p>

          <div className="relative mx-auto aspect-[4/3] max-w-4xl overflow-hidden rounded-3xl bg-white shadow-2xl">
            <AnimatePresence mode="wait">
              {isLoaded && (
                <motion.div
                  key={currentIndex}
                  initial={{ opacity: 0, scale: 1.1 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.7, ease: "easeInOut" }}
                  className="relative h-full w-full"
                >
                  <Image
                    src={siteConfig.galleryImages[currentIndex] || "/placeholder.svg"}
                    alt={`Romantic moment ${currentIndex + 1}`}
                    fill
                    className="object-cover"
                    priority={currentIndex === 0}
                    quality={90}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Progress indicators */}
            <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 gap-2">
              {siteConfig.galleryImages.map((_, index) => (
                <motion.div
                  key={index}
                  className="h-2 w-2 rounded-full bg-white/50 backdrop-blur-sm"
                  animate={{
                    scale: currentIndex === index ? 1.5 : 1,
                    backgroundColor: currentIndex === index ? "rgba(255, 255, 255, 1)" : "rgba(255, 255, 255, 0.5)",
                  }}
                  transition={{ duration: 0.3 }}
                />
              ))}
            </div>
          </div>

          <motion.p
            className="mt-8 text-center font-serif text-lg italic text-purple-600"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.5, duration: 0.8 }}
          >
            Gallery refreshes every {siteConfig.sections.gallery.rotationInterval / 1000} seconds
          </motion.p>
        </motion.div>
      </div>
    </section>
  )
}
