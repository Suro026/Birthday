"use client"

import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Play, Pause, Volume2, VolumeX, SkipForward, SkipBack, Heart } from "lucide-react"
import { useAudioVisualizer } from "@/hooks/use-audio-visualizer"
import { siteConfig } from "@/lib/config"
import Image from "next/image"

export function MusicPlayer() {
  const songs = siteConfig.sections.music.songs
  const [currentSongIndex, setCurrentSongIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isLiked, setIsLiked] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)
  const { bars } = useAudioVisualizer(audioRef, isPlaying)

  const currentSong = songs[currentSongIndex]

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const updateTime = () => setCurrentTime(audio.currentTime)
    const updateDuration = () => setDuration(audio.duration)
    const handleEnded = () => {
      setIsPlaying(false)
      // Auto-play next song
      if (currentSongIndex < songs.length - 1) {
        setCurrentSongIndex((prev) => prev + 1)
      } else {
        // Loop back to first song
        setCurrentSongIndex(0)
      }
    }

    audio.addEventListener("timeupdate", updateTime)
    audio.addEventListener("loadedmetadata", updateDuration)
    audio.addEventListener("ended", handleEnded)

    return () => {
      audio.removeEventListener("timeupdate", updateTime)
      audio.removeEventListener("loadedmetadata", updateDuration)
      audio.removeEventListener("ended", handleEnded)
    }
  }, [currentSongIndex, songs.length])

  useEffect(() => {
    if (isPlaying && audioRef.current) {
      audioRef.current.play()
    }
  }, [currentSongIndex, isPlaying])

  const togglePlay = () => {
    const audio = audioRef.current
    if (!audio) return

    if (isPlaying) {
      audio.pause()
    } else {
      audio.play()
    }
    setIsPlaying(!isPlaying)
  }

  const toggleMute = () => {
    const audio = audioRef.current
    if (!audio) return

    audio.muted = !isMuted
    setIsMuted(!isMuted)
  }

  const skipForward = () => {
    setIsPlaying(false)
    setCurrentSongIndex((prev) => (prev + 1) % songs.length)
    setTimeout(() => setIsPlaying(true), 100)
  }

  const skipBackward = () => {
    setIsPlaying(false)
    setCurrentSongIndex((prev) => (prev - 1 + songs.length) % songs.length)
    setTimeout(() => setIsPlaying(true), 100)
  }

  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00"
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, "0")}`
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <section className="relative min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-black py-20">
      <div className="container px-4">
        <motion.div
          className="mx-auto max-w-4xl"
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
        >
          <h2 className="mb-4 text-center font-serif text-4xl font-bold text-white md:text-6xl">
            {siteConfig.sections.music.title}
          </h2>
          <p className="mb-12 text-center text-lg text-purple-200 md:text-xl">{siteConfig.sections.music.subtitle}</p>

          <Card className="overflow-hidden border-none bg-gradient-to-b from-purple-900/90 to-black/90 shadow-2xl backdrop-blur-xl">
            <audio ref={audioRef} src={currentSong.audioUrl} preload="metadata" />

            <div className="grid gap-0 md:grid-cols-[350px_1fr]">
              {/* Album Art Section */}
              <div className="relative aspect-square md:aspect-auto">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentSongIndex}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.1 }}
                    transition={{ duration: 0.5 }}
                    className="relative h-full w-full"
                  >
                    <Image
                      src={currentSong.albumArt || "/placeholder.svg"}
                      alt={currentSong.title}
                      fill
                      className="object-cover"
                      priority
                    />
                    {/* Gradient overlay for better text visibility */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Player Controls Section */}
              <div className="flex flex-col justify-between p-8">
                {/* Song Info */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentSongIndex}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.4 }}
                  >
                    <h3 className="mb-2 font-bold text-white text-2xl md:text-3xl">{currentSong.title}</h3>
                    <p className="text-purple-300 text-lg">{currentSong.artist}</p>
                  </motion.div>
                </AnimatePresence>

                {/* Visualizer */}
                <div className="my-6 flex h-20 items-end justify-center gap-1">
                  {bars.map((height, index) => (
                    <motion.div
                      key={index}
                      className="w-1.5 rounded-full bg-gradient-to-t from-purple-500 via-pink-500 to-green-400"
                      animate={{ height: `${height}%` }}
                      transition={{ duration: 0.1 }}
                      style={{ minHeight: "15%" }}
                    />
                  ))}
                </div>

                {/* Progress Bar */}
                <div className="mb-6">
                  <div className="relative h-1.5 cursor-pointer overflow-hidden rounded-full bg-gray-700 transition-all hover:h-2">
                    <motion.div
                      className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-green-400 to-purple-500"
                      style={{ width: `${progress}%` }}
                      transition={{ duration: 0.1 }}
                    />
                  </div>
                  <div className="mt-2 flex justify-between text-xs text-gray-400">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                </div>

                {/* Main Controls */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setIsLiked(!isLiked)}
                      className="h-10 w-10 text-gray-400 transition-colors hover:text-green-400"
                    >
                      <Heart className={`h-5 w-5 ${isLiked ? "fill-green-400 text-green-400" : ""}`} />
                    </Button>
                  </div>

                  <div className="flex items-center gap-2 md:gap-4">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={skipBackward}
                      className="h-10 w-10 text-gray-300 transition-colors hover:text-white"
                    >
                      <SkipBack className="h-5 w-5" />
                    </Button>

                    <Button
                      size="icon"
                      onClick={togglePlay}
                      className="h-14 w-14 rounded-full bg-white text-black shadow-lg transition-all hover:scale-105 hover:bg-gray-100"
                    >
                      {isPlaying ? (
                        <Pause className="h-6 w-6 fill-current" />
                      ) : (
                        <Play className="ml-1 h-6 w-6 fill-current" />
                      )}
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={skipForward}
                      className="h-10 w-10 text-gray-300 transition-colors hover:text-white"
                    >
                      <SkipForward className="h-5 w-5" />
                    </Button>
                  </div>

                  <div className="flex items-center gap-3">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={toggleMute}
                      className="h-10 w-10 text-gray-300 transition-colors hover:text-white"
                    >
                      {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                    </Button>
                  </div>
                </div>

                {/* Playlist Indicators */}
                <div className="mt-6 flex items-center justify-center gap-1.5">
                  {songs.map((song, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        setIsPlaying(false)
                        setCurrentSongIndex(index)
                        setTimeout(() => setIsPlaying(true), 100)
                      }}
                      className="group relative"
                      title={`${song.title} - ${song.artist}`}
                    >
                      <div
                        className={`h-1.5 rounded-full transition-all ${
                          index === currentSongIndex
                            ? "w-8 bg-gradient-to-r from-green-400 to-purple-500"
                            : "w-1.5 bg-gray-600 group-hover:bg-gray-400"
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>
    </section>
  )
}
