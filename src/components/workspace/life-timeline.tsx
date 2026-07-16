'use client'

import { MONTHLY_REFLECTION, RECORDS } from '@/lib/workspace-data'
import { cn } from '@/lib/utils'
import {
  Briefcase,
  Compass,
  Heart,
  type LucideIcon,
  PenLine,
  TrendingUp,
} from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'

const KIND_ICON: Record<string, LucideIcon> = {
  insight: PenLine,
  wealth: TrendingUp,
  chart: Compass,
  career: Briefcase,
  relationship: Heart,
}

export function LifeTimeline() {
  const [open, setOpen] = useState<string | null>(RECORDS[0]?.id ?? null)

  return (
    <div className="relative">
      {/* the single spine */}
      <div className="absolute bottom-2 left-[19px] top-2 w-px bg-gradient-to-b from-transparent via-border to-transparent" />

      <ol className="flex flex-col gap-3">
        <li className="mb-1 flex items-center gap-3 pl-1">
          <span className="text-sm font-medium text-primary">{MONTHLY_REFLECTION.period}</span>
        </li>

        {RECORDS.map((record, i) => {
          const Icon = KIND_ICON[record.kind] ?? PenLine
          const isOpen = open === record.id
          return (
            <motion.li
              key={record.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.05, ease: [0.16, 1, 0.3, 1] }}
              className="relative flex gap-4"
            >
              {/* node */}
              <div className="relative z-10 shrink-0">
                <div
                  className="flex size-10 items-center justify-center rounded-full border transition-colors duration-300"
                  style={{
                    borderColor: `color-mix(in oklch, ${record.accent} 40%, transparent)`,
                    background: `color-mix(in oklch, ${record.accent} 14%, oklch(0.17 0.026 283))`,
                  }}
                >
                  <Icon className="size-[18px]" strokeWidth={1.75} style={{ color: record.accent }} />
                </div>
              </div>

              {/* card */}
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : record.id)}
                aria-expanded={isOpen}
                className={cn(
                  'surface surface-hover mb-1 flex-1 rounded-2xl p-4 text-left',
                  isOpen && 'border-primary/30',
                )}
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className="rounded-md px-1.5 py-0.5 text-[11px] font-medium"
                    style={{
                      color: record.accent,
                      background: `color-mix(in oklch, ${record.accent} 14%, transparent)`,
                    }}
                  >
                    {record.kindLabel}
                  </span>
                  <span className="text-[15px] font-medium text-foreground">{record.title}</span>
                  <span className="ml-auto font-mono text-xs text-muted-foreground">
                    {record.date} · {record.time}
                  </span>
                </div>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                      className="overflow-hidden"
                    >
                      <p className="pt-2.5 text-sm leading-relaxed text-muted-foreground">
                        {record.body}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {record.tags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full border border-border px-2.5 py-0.5 text-[11px] text-muted-foreground"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </button>
            </motion.li>
          )
        })}
      </ol>

      {/* one quiet monthly reflection — a sentence, not a chart */}
      <div className="relative ml-14 mt-4">
        <div className="surface rounded-2xl p-5">
          <p className="mb-2 text-xs tracking-[0.16em] text-muted-foreground">本月回顾</p>
          <p className="text-pretty font-serif text-lg leading-relaxed text-foreground">
            {MONTHLY_REFLECTION.body}
          </p>
        </div>
      </div>
    </div>
  )
}
