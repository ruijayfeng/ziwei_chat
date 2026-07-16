import type { ReactNode } from 'react'

/**
 * A single, quiet page header. The decorative motif is drawn from the chart's
 * own geometry (a faint concentric-ring glyph) rather than stock illustration,
 * so every page shares one identity instead of a generic "AI fantasy" look.
 */
export function PageHeader({
  eyebrow,
  title,
  subtitle,
  aside,
}: {
  eyebrow?: string
  title: ReactNode
  subtitle?: ReactNode
  aside?: ReactNode
}) {
  return (
    <header className="flex shrink-0 items-start justify-between gap-6">
      <div className="max-w-2xl">
        {eyebrow && (
          <p className="mb-3 text-xs tracking-[0.16em] text-muted-foreground">{eyebrow}</p>
        )}
        <h1 className="text-balance font-serif text-3xl font-medium leading-[1.15] tracking-[-0.02em] text-foreground xl:text-[2.5rem]">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-3 text-pretty text-sm leading-relaxed text-muted-foreground">
            {subtitle}
          </p>
        )}
      </div>
      {aside && <div className="hidden shrink-0 lg:block">{aside}</div>}
    </header>
  )
}

/** Faint ring glyph — the shared decorative signature, pure geometry. */
export function RingGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 120" className={className} aria-hidden="true">
      <defs>
        <radialGradient id="glyph-core" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="oklch(0.72 0.18 300 / 0.4)" />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
      </defs>
      <circle cx="60" cy="60" r="20" fill="url(#glyph-core)" />
      {[52, 40, 28].map((r, i) => (
        <circle
          key={r}
          cx="60"
          cy="60"
          r={r}
          fill="none"
          stroke="oklch(0.85 0.05 292)"
          strokeOpacity={0.14 + i * 0.04}
          strokeWidth={0.8}
        />
      ))}
      {Array.from({ length: 12 }).map((_, i) => {
        const a = (i * 30 - 90) * (Math.PI / 180)
        const r = (n: number) => Math.round(n * 1000) / 1000
        const x1 = r(60 + 52 * Math.cos(a))
        const y1 = r(60 + 52 * Math.sin(a))
        const x2 = r(60 + 56 * Math.cos(a))
        const y2 = r(60 + 56 * Math.sin(a))
        return (
          <line
            key={i}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="oklch(0.85 0.05 292)"
            strokeOpacity={0.25}
            strokeWidth={0.8}
          />
        )
      })}
    </svg>
  )
}
