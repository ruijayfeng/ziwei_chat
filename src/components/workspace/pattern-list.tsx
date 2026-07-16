'use client'

import { PATTERNS } from '@/lib/workspace-data'
import { ArrowUpRight } from 'lucide-react'
import { motion } from 'motion/react'

/**
 * The second-most valuable capability: patterns the user hasn't noticed.
 * Presented as honest observations — no "92% confidence", no trend
 * micro-charts that carry almost no readable data.
 */
export function PatternList() {
  return (
    <section>
      <p className="mb-4 text-xs tracking-[0.16em] text-muted-foreground">AI 观察到的模式</p>

      <div className="flex flex-col gap-3">
        {PATTERNS.map((pattern, i) => {
          const Icon = pattern.icon
          return (
            <motion.button
              key={pattern.id}
              type="button"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 + i * 0.06, ease: [0.16, 1, 0.3, 1] }}
              className="surface surface-hover group flex items-start gap-4 rounded-2xl p-5 text-left"
            >
              <div
                className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl border"
                style={{
                  borderColor: `color-mix(in oklch, ${pattern.accent} 32%, transparent)`,
                  background: `color-mix(in oklch, ${pattern.accent} 12%, transparent)`,
                }}
              >
                <Icon className="size-5" strokeWidth={1.75} style={{ color: pattern.accent }} />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-medium leading-snug text-foreground">
                  {pattern.title}
                </p>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  {pattern.detail}
                </p>
              </div>

              <ArrowUpRight
                className="mt-1 size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity duration-300 group-hover:opacity-70"
                strokeWidth={2}
              />
            </motion.button>
          )
        })}
      </div>
    </section>
  )
}
