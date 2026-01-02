import type React from "react"
import type { Metadata } from "next"
import { Playfair_Display, Inter, Dancing_Script } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { siteConfig } from "@/lib/config"
import "./globals.css"

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
})

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
})

const dancing = Dancing_Script({
  subsets: ["latin"],
  variable: "--font-script",
  display: "swap",
})

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#fdf2f8",
}

export const metadata: Metadata = {
  title: siteConfig.metadata.title,
  description: siteConfig.metadata.description,
  keywords: siteConfig.metadata.keywords,
  authors: [{ name: "Birthday Celebration" }],
  creator: "v0.app",
  generator: "v0.app",
  openGraph: {
    type: "website",
    locale: "en_US",
    title: siteConfig.metadata.title,
    description: siteConfig.metadata.description,
    siteName: siteConfig.metadata.title,
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.metadata.title,
    description: siteConfig.metadata.description,
  },
  icons: {
    icon: [
      {
        url: "/icon-light-32x32.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/icon-dark-32x32.png",
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: "/icon.svg",
        type: "image/svg+xml",
      },
    ],
    apple: "/apple-icon.png",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${playfair.variable} ${inter.variable} ${dancing.variable}`}>
      <body className="font-sans antialiased">
        {children}
        <Analytics />
      </body>
    </html>
  )
}
