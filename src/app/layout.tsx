import { MotionProvider } from '@/components/motion-provider'
import type { Metadata, Viewport } from 'next'
import { Fraunces, Geist, Geist_Mono, Noto_Sans_SC, Noto_Serif_SC } from 'next/font/google'
import './globals.css'

// Latin UI text — clean and modern.
const geistSans = Geist({
  subsets: ['latin'],
  variable: '--font-geist-sans',
})

const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono',
})

// Intentional Chinese body/UI face, so CJK text no longer relies on
// per-platform system fallback (PingFang / YaHei).
const notoSansSC = Noto_Sans_SC({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-noto-sans',
})

// Fallback Chinese serif behind LXGW WenKai (loaded via CDN below). Kept at
// heavier weights so that, if the WenKai webfont is slow, headings still land
// with substantial stroke contrast rather than a thin, flimsy look.
const notoSerif = Noto_Serif_SC({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-noto-serif',
})

// The Latin soul of the brand — an old-style display serif with optical-size
// and "wonk" axes that lend a hand-set, editorial character. Used for the
// wordmark, big numerals and Latin accents so the identity is unmistakable and
// never reads as a default system serif.
const fraunces = Fraunces({
  subsets: ['latin'],
  style: ['normal', 'italic'],
  axes: ['SOFT', 'WONK', 'opsz'],
  variable: '--font-fraunces',
})

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
      className={`${geistSans.variable} ${geistMono.variable} ${notoSansSC.variable} ${notoSerif.variable} ${fraunces.variable} bg-background`}
    >
      <head>
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
