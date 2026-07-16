import { MotionProvider } from '@/components/motion-provider'
import type { Metadata, Viewport } from 'next'
import type { CSSProperties } from 'react'
import './globals.css'

const fontVariables = {
  '--font-geist-sans': "'Geist'",
  '--font-geist-mono': "'Geist Mono'",
  '--font-noto-sans': "'Noto Sans SC'",
  '--font-noto-serif': "'Noto Serif SC'",
  '--font-fraunces': "'Fraunces'",
} as CSSProperties

export const metadata: Metadata = {
  title: '紫微知道 · 你的命盘分析助手',
  description:
    '紫微知道是一个 AI 驱动的紫微斗数工作空间，帮助你通过与命盘对话，更清晰地认识自己。',
  generator: 'v0.app',
}

export const viewport: Viewport = {
  colorScheme: 'dark',
  themeColor: '#090913',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="zh-CN"
      className="bg-background"
      style={fontVariables}
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,100..900;1,9..144,100..900&family=Geist+Mono:wght@400;500;600&family=Geist:wght@400;500;600&family=Noto+Sans+SC:wght@400;500;600&family=Noto+Serif+SC:wght@400;500;600;700&display=swap"
        />
        {/* LXGW WenKai (霞鹜文楷) — a classical brush-kai webfont with genuine
            thick/thin stroke modulation and an antique, literary character.
            Family name is 'LXGW WenKai'. We load TWO real weights — 400
            (regular) and 700 (bold) — so headings get true light/heavy contrast
            instead of a single flat weight. woff2 is unicode-range-chunked, so
            only the glyphs actually used are downloaded. Because only 400/700
            faces exist, display type must request exactly 400 or 700 (never
            500/600) or the browser falls through to the Noto Serif fallback. */}
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/lxgw-wenkai-webfont@1.7.0/lxgwwenkai-regular.css"
        />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/lxgw-wenkai-webfont@1.7.0/lxgwwenkai-bold.css"
        />
      </head>
      <body className="antialiased">
        <MotionProvider>{children}</MotionProvider>
      </body>
    </html>
  )
}
