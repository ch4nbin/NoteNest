import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

export const metadata: Metadata = {
  metadataBase: new URL('https://notenest.app'),
  title: "NoteNest - AI-Powered Note Taking",
  description: "Transform lectures into intelligent notes with AI",
  icons: {
    icon: [
      {
        url: "/icon.svg",
        type: "image/svg+xml",
      },
    ],
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
  openGraph: {
    title: "NoteNest - AI-Powered Note Taking",
    description: "Transform lectures into intelligent notes with AI. Collaborate with friends and ace your exams.",
    url: "https://notenest.app",
    siteName: "NoteNest",
    images: [
      {
        url: "/og-image.svg",
        width: 1200,
        height: 630,
        alt: "NoteNest - AI-Powered Note Taking",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "NoteNest - AI-Powered Note Taking",
    description: "Transform lectures into intelligent notes with AI",
    images: ["/og-image.svg"],
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`font-sans antialiased`}>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
