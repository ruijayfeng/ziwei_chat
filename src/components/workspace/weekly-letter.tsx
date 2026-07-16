'use client'

import { WEEKLY_LETTER } from '@/lib/workspace-data'
import { motion } from 'motion/react'

/**
 * The soul of the product. Not a dashboard of scores — a quiet, personal
 * letter. No confidence percentages, no charts. Trust is built by tone, not
 * by fake precision. The only ornament is the chart's own ring geometry,
 * kept faint so the words lead.
 */
export function WeeklyLetter() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="surface relative overflow-hidden rounded-3xl p-8 xl:p-10"
    >
      {/* faint ring signature, top-right — the chart's own geometry as the
          single, quiet ornament */}
      <div className="pointer-events-none absolute -right-16 -top-16 size-64 opacity-[0.45]">
        <RingSignature />
      </div>

      <p className="relative mb-6 flex items-baseline gap-2.5">
        <span className="font-display text-base italic leading-none text-primary">No.07</span>
        <span className="text-xs tracking-[0.16em] text-muted-foreground">来自 AI 的本周信</span>
      </p>

      <p className="relative font-serif text-xl font-medium tracking-tight text-foreground xl:text-2xl">
        {WEEKLY_LETTER.greeting}
      </p>

      <div className="relative mt-5 max-w-2xl space-y-4">
        {WEEKLY_LETTER.paragraphs.map((p, i) => (
          <p key={i} className="text-pretty text-[15px] leading-[1.9] text-foreground/85">
            {p}
          </p>
        ))}
      </div>

      <p className="relative mt-6 font-serif text-sm text-primary/90">{WEEKLY_LETTER.signoff}</p>
    </motion.section>
  )
}

function RingSignature() {
  return (
    <svg viewBox="0 0 200 200" className="size-full" aria-hidden="true">
      {[90, 72, 54].map((r, i) => (
        <circle
          key={r}
          cx="100"
          cy="100"
          r={r}
          fill="none"
          stroke="oklch(0.85 0.05 292)"
          strokeOpacity={0.1 + i * 0.03}
          strokeWidth={0.8}
        />
      ))}
      {Array.from({ length: 12 }).map((_, i) => {
        const a = (i * 30 - 90) * (Math.PI / 180)
        const r = (n: number) => Math.round(n * 1000) / 1000
        const x1 = r(100 + 90 * Math.cos(a))
        const y1 = r(100 + 90 * Math.sin(a))
        const x2 = r(100 + 96 * Math.cos(a))
        const y2 = r(100 + 96 * Math.sin(a))
        return (
          <line
            key={i}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="oklch(0.85 0.05 292)"
            strokeOpacity={0.2}
            strokeWidth={0.8}
          />
        )
      })}
    </svg>
  )
}
