'use client'

import { useMemo } from 'react'

type Star = {
  cx: number
  cy: number
  r: number
  delay: number
  duration: number
}

function seededRandom(seed: number) {
  let value = seed
  return () => {
    value = (value * 9301 + 49297) % 233280
    return value / 233280
  }
}

export function FloatingStars({ count = 60 }: { count?: number }) {
  const stars = useMemo<Star[]>(() => {
    const rand = seededRandom(42)
    return Array.from({ length: count }, () => ({
      cx: rand() * 100,
      cy: rand() * 100,
      r: rand() * 1.1 + 0.3,
      delay: rand() * 6,
      duration: rand() * 5 + 4,
    }))
  }, [count])

  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full"
      preserveAspectRatio="none"
      viewBox="0 0 100 100"
    >
      {stars.map((star, i) => (
        <circle
          key={i}
          cx={star.cx}
          cy={star.cy}
          r={star.r}
          fill="oklch(0.92 0.03 290)"
          style={{
            animation: `ziwei-breathe ${star.duration}s ease-in-out ${star.delay}s infinite`,
          }}
        />
      ))}
    </svg>
  )
}

export function GradientBackground() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* Base */}
      <div className="absolute inset-0 bg-background" />

      {/* Soft radial glows — richer chroma, positioned around the destiny ring */}
      <div className="absolute -top-[28%] left-1/2 h-[85vh] w-[85vh] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,oklch(0.55_0.2_300/0.22),transparent_62%)] blur-3xl" />
      <div className="absolute bottom-[-24%] left-[6%] h-[58vh] w-[58vh] rounded-full bg-[radial-gradient(circle,oklch(0.52_0.15_258/0.14),transparent_64%)] blur-3xl" />
      <div className="absolute right-[-10%] top-[30%] h-[50vh] w-[50vh] rounded-full bg-[radial-gradient(circle,oklch(0.55_0.16_300/0.1),transparent_66%)] blur-3xl" />

      {/* Sparse stars */}
      <FloatingStars count={70} />

      {/* Vignette — sinks the edges into ink so cards float with depth */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_120%_100%_at_50%_35%,transparent_45%,oklch(0.07_0.02_279/0.75)_100%)]" />

      {/* Very light noise texture */}
      <div
        className="absolute inset-0 opacity-[0.04] mix-blend-soft-light"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />
    </div>
  )
}
