'use client'

import { cn } from '@/lib/utils'
import { getRelatedIndices, SIHUA_TONE } from '@/lib/reference-chart-contract'
import { AnimatePresence, motion } from 'motion/react'
import { ChevronDown } from 'lucide-react'
import { useState } from 'react'
import { useChart } from './chart-context'

/**
 * Hand-crafted luminance gauge — a 270° arc that echoes the destiny ring and
 * expresses a palace's energy the way Ziwei describes star brightness
 * (庙 / 旺 / 得 / 利 / 陷) rather than a generic 5-dot rating widget.
 */
const BRIGHTNESS = ['陷', '利', '得', '旺', '庙'] as const

function LuminanceGauge({ value }: { value: number | null }) {
  const r = 15
  const circ = 2 * Math.PI * r
  const sweep = 0.75 // 270° visible arc, gap at the bottom
  const normalizedValue = value ?? 0
  const ratio = Math.max(0, Math.min(normalizedValue, 5)) / 5
  const label = value === null ? '—' : BRIGHTNESS[Math.max(0, Math.min(value, 5) - 1)] ?? '陷'

  return (
    <div className="relative flex size-11 shrink-0 items-center justify-center">
      <svg viewBox="0 0 40 40" className="absolute inset-0 size-full -rotate-[135deg]">
        <defs>
          <linearGradient id="lum-fill" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="oklch(0.72 0.15 250)" />
            <stop offset="100%" stopColor="oklch(0.82 0.16 310)" />
          </linearGradient>
        </defs>
        {/* track */}
        <circle
          cx={20}
          cy={20}
          r={r}
          fill="none"
          stroke="oklch(0.88 0.04 292)"
          strokeOpacity={0.14}
          strokeWidth={2}
          strokeLinecap="round"
          strokeDasharray={`${circ * sweep} ${circ}`}
        />
        {/* fill */}
        <motion.circle
          cx={20}
          cy={20}
          r={r}
          fill="none"
          stroke="url(#lum-fill)"
          strokeWidth={2}
          strokeLinecap="round"
          initial={{ strokeDasharray: `0 ${circ}` }}
          animate={{ strokeDasharray: `${circ * sweep * ratio} ${circ}` }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          style={{ filter: 'drop-shadow(0 0 3px oklch(0.78 0.16 300 / 0.6))' }}
        />
      </svg>
      <span className="font-serif text-[13px] font-medium leading-none text-foreground">
        {label}
      </span>
    </div>
  )
}

/**
 * Editorial disclosure — replaces the generic chevron accordion with a leading
 * index tick that ignites when open, so the panel reads as a curated dossier.
 */
function Section({
  title,
  hint,
  defaultOpen = false,
  children,
}: {
  title: string
  hint?: string
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border-b border-border/60 py-3.5 last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="group flex w-full items-center gap-2.5 text-left"
      >
        <span
          className={cn(
            'h-3.5 w-[2px] shrink-0 rounded-full transition-all duration-300',
            open ? 'bg-primary' : 'bg-muted-foreground/30 group-hover:bg-muted-foreground/60',
          )}
        />
        <span className="flex flex-1 items-baseline gap-2 text-sm font-medium text-foreground">
          {title}
          {hint && <span className="text-xs font-normal text-muted-foreground">{hint}</span>}
        </span>
        <ChevronDown
          className={cn(
            'size-3.5 text-muted-foreground/70 transition-transform duration-300',
            open ? 'rotate-180 text-primary' : 'group-hover:text-foreground',
          )}
          strokeWidth={2}
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="pl-[14px] pt-3">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function Badge({
  children,
  tone,
}: {
  children: React.ReactNode
  tone?: string
}) {
  return (
    <span
      className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium"
      style={{
        color: tone ?? 'var(--foreground)',
        backgroundColor: tone
          ? `color-mix(in oklch, ${tone} 15%, transparent)`
          : 'oklch(1 0 0 / 0.05)',
        border: `1px solid ${tone ? `color-mix(in oklch, ${tone} 30%, transparent)` : 'var(--border)'}`,
      }}
    >
      {children}
    </span>
  )
}

export function PalaceInspector() {
  const { palaces, selected, setSelected } = useChart()
  const palace = palaces[selected]
  const { trine, opposite } = getRelatedIndices(selected)
  const sihuaStars = palace.mainStars.filter((s) => s.sihua)

  return (
    <aside className="flex h-screen w-[360px] shrink-0 flex-col px-6 py-6">
      {/* Sticky palace header */}
      <div className="shrink-0">
        <p className="font-display text-sm italic tracking-[0.02em] text-primary">the palace</p>
        <AnimatePresence mode="wait">
          <motion.div
            key={palace.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="mt-1 flex items-end justify-between"
          >
            <div className="flex items-baseline gap-2.5">
              <h2 className="font-serif text-2xl font-medium text-foreground">{palace.name}</h2>
              <span className="font-mono text-sm text-muted-foreground">{palace.branch}</span>
            </div>
            <div
              className="flex flex-col items-center gap-0.5"
              aria-label={palace.rating === null ? '星曜亮度暂无数据' : `星曜亮度 ${palace.rating} / 5`}
            >
              <LuminanceGauge value={palace.rating} />
              <span className="text-[10px] tracking-[0.15em] text-muted-foreground">亮度</span>
            </div>
          </motion.div>
        </AnimatePresence>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{palace.summary}</p>
      </div>

      {/* Scrollable detail */}
      <div className="mt-2 min-h-0 flex-1 overflow-y-auto pr-1">
        <Section title="AI 解读" hint={palace.aiTraits.length > 0 ? '演示内容' : '尚未生成'} defaultOpen>
          {palace.aiTraits.length > 0 ? (
            <ul className="flex flex-col gap-2.5">
              {palace.aiTraits.map((trait) => (
                <li key={trait} className="flex gap-2.5 text-sm leading-relaxed text-foreground/85">
                  <span className="mt-2 size-1 shrink-0 rounded-full bg-primary/70" />
                  {trait}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm leading-relaxed text-muted-foreground">
              当前仅展示 iztro 的确定性排盘事实。需要解读时，可回到对话页让 Agent 基于本命盘分析。
            </p>
          )}
          {palace.basis.length > 0 ? (
            <div className="mt-3.5 flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-muted-foreground">命盘依据</span>
              {palace.basis.map((b) => (
                <Badge key={b}>{b}</Badge>
              ))}
            </div>
          ) : null}
        </Section>

        <Section title="主星" hint={`${palace.mainStars.length} 颗`} defaultOpen>
          {palace.mainStars.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {palace.mainStars.map((s) => (
                <Badge key={s.name} tone={s.sihua ? SIHUA_TONE[s.sihua] : undefined}>
                  {s.name}
                  {s.sihua && <span className="ml-1 opacity-80">{s.sihua}</span>}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">本宫无主星，借对宫之力论断。</p>
          )}
        </Section>

        <Section title="辅星" hint={`${palace.minorStars.length} 颗`}>
          <div className="flex flex-wrap gap-2">
            {palace.minorStars.map((s) => (
              <Badge key={s}>{s}</Badge>
            ))}
          </div>
        </Section>

        <Section title="四化">
          {sihuaStars.length > 0 ? (
            <div className="flex flex-col gap-2">
              {sihuaStars.map((s) => (
                <div key={s.name} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{s.name}</span>
                  <Badge tone={SIHUA_TONE[s.sihua!]}>{s.sihua}</Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">本宫无四化落入。</p>
          )}
        </Section>

        <Section title="三方四正" defaultOpen>
          <div className="flex flex-col gap-2.5">
            <div>
              <p className="mb-1.5 text-xs text-muted-foreground">三合方</p>
              <div className="flex flex-wrap gap-2">
                {trine.map((idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelected(idx)}
                    className={cn(
                      'rounded-lg border px-2.5 py-1 text-xs transition-colors',
                      idx === selected
                        ? 'border-primary/50 bg-primary/10 text-primary'
                        : 'border-border text-muted-foreground hover:border-primary/40 hover:text-foreground',
                    )}
                  >
                    {palaces[idx].name}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-1.5 text-xs text-muted-foreground">对宫</p>
              <button
                type="button"
                onClick={() => setSelected(opposite)}
                className="rounded-lg border border-gold/40 px-2.5 py-1 text-xs text-gold transition-colors hover:bg-gold/10"
              >
                {palaces[opposite].name}
              </button>
            </div>
          </div>
        </Section>

        <Section title="人格关键词" defaultOpen>
          {palace.keywords.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {palace.keywords.map((k) => (
                <Badge key={k}>{k}</Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">暂无经过 Agent 与 critic 验证的人格关键词。</p>
          )}
        </Section>

        <Section title="推荐探索" defaultOpen>
          {palace.related.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {palace.related.map((topic) => (
                <button
                  key={topic}
                  type="button"
                  className="surface inline-flex items-center rounded-full px-3.5 py-1.5 text-xs text-muted-foreground transition-colors duration-300 hover:border-primary/40 hover:text-foreground"
                >
                  {topic}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">完成一次相关对话后，再从真实分析结果中生成探索方向。</p>
          )}
        </Section>
      </div>
    </aside>
  )
}
