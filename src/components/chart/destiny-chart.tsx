'use client'

import { cn } from '@/lib/utils'
import { getRelatedIndices, PALACES, SIHUA_TONE } from '@/lib/chart-data'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { useChart } from './chart-context'

/* ----------------------------- Geometry ----------------------------- */
/** Percentage-space geometry (viewBox 0..100, center at 50). */
const CENTER = 50
const OUTER_RING = 46
const BRANCH_RADIUS = 46
const DIVIDER_INNER = 20.5
const DIVIDER_OUTER = 43.5
const LABEL_RADIUS = 32
const CORE_RADIUS = 18.5

function round(n: number) {
  return Math.round(n * 1000) / 1000
}

/** Palace index (0 = 命宫 at top) → point, arranged clockwise. */
function polar(index: number, radius: number) {
  return polarDeg(index * 30 - 90, radius)
}

/** Arbitrary angle in degrees (−90 = top) → point. */
function polarDeg(deg: number, radius: number) {
  const rad = (deg * Math.PI) / 180
  return {
    x: round(CENTER + radius * Math.cos(rad)),
    y: round(CENTER + radius * Math.sin(rad)),
  }
}

/**
 * Smooth connection between two palace indices, bowed gently *outward* so the
 * arc breathes in the open band between the core and the labels instead of
 * being swallowed by the central disc. `f > 1` pushes the control point beyond
 * the chord midpoint (convex), `f < 1` pulls it toward center (concave).
 */
function bowPath(a: number, b: number, f: number, radius = LABEL_RADIUS) {
  const p1 = polar(a, radius)
  const p2 = polar(b, radius)
  const mx = (p1.x + p2.x) / 2
  const my = (p1.y + p2.y) / 2
  const cx = round(CENTER + (mx - CENTER) * f)
  const cy = round(CENTER + (my - CENTER) * f)
  return `M ${p1.x} ${p1.y} Q ${cx} ${cy} ${p2.x} ${p2.y}`
}

/* --------------------- Deterministic starfield ---------------------- */
function mulberry32(seed: number) {
  return function () {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), seed | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

type Star = { x: number; y: number; r: number; o: number }

const STARS: Star[] = (() => {
  const rng = mulberry32(20240514)
  const out: Star[] = []
  for (let i = 0; i < 58; i++) {
    const ang = rng() * Math.PI * 2
    const rad = 21 + rng() * (OUTER_RING - 3 - 21)
    out.push({
      x: round(CENTER + rad * Math.cos(ang)),
      y: round(CENTER + rad * Math.sin(ang)),
      r: round(0.12 + rng() * 0.42),
      o: round(0.18 + rng() * 0.5),
    })
  }
  return out
})()

/** A few faint constellation segments linking nearby stars. */
const STAR_LINKS: [Star, Star][] = (() => {
  const links: [Star, Star][] = []
  for (let i = 0; i < STARS.length; i++) {
    for (let j = i + 1; j < STARS.length; j++) {
      const dx = STARS[i].x - STARS[j].x
      const dy = STARS[i].y - STARS[j].y
      const d = Math.hypot(dx, dy)
      if (d < 6 && links.length < 14) links.push([STARS[i], STARS[j]])
    }
  }
  return links
})()

const ROTATE_TRANSITION = 'transform 0.9s cubic-bezier(0.16, 1, 0.3, 1)'

/* ------------------------------ Chart ------------------------------- */
export function DestinyChart() {
  const { selected, setSelected, hovered, setHovered } = useChart()

  // Wheel rotation: selected palace is always carried to the top (12 o'clock)
  // along the shortest path, while labels counter-rotate to stay upright.
  const [rotation, setRotation] = useState(0)
  const rotRef = useRef(0)
  useEffect(() => {
    const target = -selected * 30
    const delta = ((((target - rotRef.current) % 360) + 540) % 360) - 180
    const next = rotRef.current + delta
    rotRef.current = next
    setRotation(next)
  }, [selected])

  const { trine, opposite } = getRelatedIndices(selected)
  const relatedSet = new Set([...trine, opposite])
  const focus = PALACES[selected]

  // Static top wedge (selected always rotates under it).
  const half = 13
  const bl = polarDeg(-90 - half, DIVIDER_OUTER)
  const br = polarDeg(-90 + half, DIVIDER_OUTER)
  const il = polarDeg(-90 - half, CORE_RADIUS + 1)
  const ir = polarDeg(-90 + half, CORE_RADIUS + 1)
  const beamPath = `M ${il.x} ${il.y} L ${bl.x} ${bl.y} A ${DIVIDER_OUTER} ${DIVIDER_OUTER} 0 0 1 ${br.x} ${br.y} L ${ir.x} ${ir.y} A ${CORE_RADIUS + 1} ${CORE_RADIUS + 1} 0 0 0 ${il.x} ${il.y} Z`

  return (
    <div className="relative mx-auto aspect-square h-full max-h-[620px] w-full max-w-[620px]">
      {/* ---------- Fixed background: halo, starfield, ring, dividers ---------- */}
      <svg
        viewBox="0 0 100 100"
        className="absolute inset-0 h-full w-full overflow-visible"
        aria-hidden="true"
      >
        <defs>
          <radialGradient id="core-halo" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="oklch(0.66 0.24 300 / 0.6)" />
            <stop offset="38%" stopColor="oklch(0.54 0.2 300 / 0.22)" />
            <stop offset="70%" stopColor="oklch(0.46 0.16 300 / 0.07)" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
          <radialGradient id="ring-glow" cx="50%" cy="50%" r="50%">
            <stop offset="72%" stopColor="transparent" />
            <stop offset="90%" stopColor="oklch(0.6 0.16 298 / 0.1)" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
          <radialGradient id="beam-grad" cx="50%" cy="50%" r="50%">
            <stop offset="33%" stopColor="oklch(0.72 0.2 300 / 0)" />
            <stop offset="50%" stopColor="oklch(0.74 0.21 300 / 0.34)" />
            <stop offset="72%" stopColor="oklch(0.7 0.19 300 / 0.16)" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
        </defs>

        {/* soft glow riding the outer ring */}
        <circle cx={CENTER} cy={CENTER} r={OUTER_RING} fill="url(#ring-glow)" />

        {/* central halo */}
        <circle cx={CENTER} cy={CENTER} r={36} fill="url(#core-halo)" />

        {/* constellation starfield (slow idle drift) */}
        <g className="ziwei-orbit-slower" style={{ transformOrigin: 'center' }}>
          {STAR_LINKS.map(([a, b], i) => (
            <line
              key={`lk-${i}`}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke="oklch(0.85 0.05 290)"
              strokeOpacity={0.08}
              strokeWidth={0.12}
            />
          ))}
          {STARS.map((s, i) => (
            <circle
              key={`st-${i}`}
              cx={s.x}
              cy={s.y}
              r={s.r}
              fill="oklch(0.92 0.04 300)"
              fillOpacity={s.o}
            />
          ))}
        </g>

        {/* radial dividers (all dim) */}
        {Array.from({ length: 12 }).map((_, i) => {
          const deg = i * 30 - 75
          const a = polarDeg(deg, DIVIDER_INNER)
          const b = polarDeg(deg, DIVIDER_OUTER)
          return (
            <line
              key={`dv-${i}`}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke="oklch(0.85 0.05 290)"
              strokeOpacity={0.1}
              strokeWidth={0.2}
            />
          )
        })}

        {/* lit dividers flanking the top wedge (selected always lands here) */}
        {[-105, -75].map((deg) => {
          const a = polarDeg(deg, DIVIDER_INNER)
          const b = polarDeg(deg, DIVIDER_OUTER)
          return (
            <line
              key={`lit-${deg}`}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke="oklch(0.78 0.15 298)"
              strokeOpacity={0.4}
              strokeWidth={0.22}
            />
          )
        })}

        {/* outer ring */}
        <circle
          cx={CENTER}
          cy={CENTER}
          r={OUTER_RING}
          fill="none"
          stroke="oklch(0.7 0.1 295)"
          strokeOpacity={0.32}
          strokeWidth={0.22}
        />
        <circle
          cx={CENTER}
          cy={CENTER}
          r={OUTER_RING - 1.4}
          fill="none"
          stroke="oklch(0.7 0.1 295)"
          strokeOpacity={0.1}
          strokeWidth={0.15}
        />
      </svg>

      {/* ---------- Rotating layer: connections + labels + badges ---------- */}
      <div
        className="absolute inset-0"
        style={{ transform: `rotate(${rotation}deg)`, transformOrigin: 'center', transition: ROTATE_TRANSITION }}
      >
        {/* 三方四正 connections — bowed arcs converging on the core */}
        <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full overflow-visible" aria-hidden="true">
          <defs>
            <filter id="line-glow" x="-60%" y="-60%" width="220%" height="220%">
              <feGaussianBlur stdDeviation="0.55" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <radialGradient id="node-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="oklch(0.9 0.08 300 / 0.9)" />
              <stop offset="100%" stopColor="transparent" />
            </radialGradient>
          </defs>
          <AnimatePresence mode="wait">
            <motion.g key={selected}>
              {/* opposition axis (四正) — passes behind the core, reads as twin rays */}
              <motion.path
                d={bowPath(selected, opposite, 1)}
                fill="none"
                stroke="oklch(0.85 0.13 84)"
                strokeOpacity={0.55}
                strokeWidth={0.24}
                strokeLinecap="round"
                filter="url(#line-glow)"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
              />
              {/* trine triangle (三方) — three gently convex arcs */}
              {[
                [trine[0], trine[1]],
                [trine[1], trine[2]],
                [trine[2], trine[0]],
              ].map(([a, b], i) => (
                <motion.path
                  key={`tri-${i}`}
                  d={bowPath(a, b, 1.72)}
                  fill="none"
                  stroke="oklch(0.82 0.16 300)"
                  strokeOpacity={0.6}
                  strokeWidth={0.3}
                  strokeLinecap="round"
                  filter="url(#line-glow)"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{ duration: 0.95, ease: [0.16, 1, 0.3, 1], delay: 0.1 + i * 0.06 }}
                />
              ))}
              {/* luminous nodes */}
              {[...trine, opposite].map((idx) => {
                const p = polar(idx, LABEL_RADIUS)
                const gold = idx === opposite
                return (
                  <motion.g
                    key={`nd-${idx}`}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5, delay: 0.45 }}
                    style={{ transformOrigin: `${p.x}px ${p.y}px` }}
                  >
                    <circle cx={p.x} cy={p.y} r={1.6} fill="url(#node-glow)" opacity={0.7} />
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r={0.55}
                      fill={gold ? 'oklch(0.88 0.13 84)' : 'oklch(0.86 0.14 300)'}
                    />
                  </motion.g>
                )
              })}
            </motion.g>
          </AnimatePresence>
        </svg>

        {/* palace labels (counter-rotated to stay upright) */}
        {PALACES.map((palace, i) => {
          const p = polar(i, LABEL_RADIUS)
          const isSelected = selected === i
          const isRelated = relatedSet.has(i)
          const isHovered = hovered === i
          const dim = hovered !== null ? !isHovered : false
          const emphasized = hovered !== null ? isHovered : isSelected
          return (
            <button
              key={palace.id}
              type="button"
              onClick={() => setSelected(i)}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              aria-pressed={isSelected}
              aria-label={`${palace.name} · ${palace.branch}`}
              className="group absolute z-10 flex w-[24%] max-w-[132px] flex-col items-center text-center focus:outline-none"
              style={{
                left: `${p.x}%`,
                top: `${p.y}%`,
                transform: `translate(-50%, -50%) rotate(${-rotation}deg)`,
                transformOrigin: 'center',
                transition: ROTATE_TRANSITION,
              }}
            >
              <span
                className={cn(
                  'font-medium leading-none tracking-tight transition-all duration-500',
                  emphasized
                    ? 'text-[19px] text-foreground'
                    : dim
                      ? 'text-[15px] text-foreground/45'
                      : isRelated
                        ? 'text-[15px] text-foreground'
                        : 'text-[15px] text-foreground/90',
                )}
                style={
                  emphasized ? { textShadow: '0 0 18px oklch(0.7 0.2 300 / 0.65)' } : undefined
                }
              >
                {palace.name}
              </span>
              <span
                className={cn(
                  'mt-1.5 flex flex-wrap items-center justify-center gap-x-1.5 gap-y-0.5 text-[12px] leading-tight transition-opacity duration-500',
                  dim ? 'opacity-45' : 'opacity-100',
                )}
              >
                {palace.mainStars.length > 0 ? (
                  palace.mainStars.map((star) => (
                    <span
                      key={star.name}
                      className="inline-flex items-baseline gap-0.5 text-muted-foreground"
                    >
                      <span className={emphasized || isRelated ? 'text-foreground/85' : ''}>
                        {star.name}
                      </span>
                      {star.sihua && (
                        <span
                          className="text-[10px] font-medium"
                          style={{ color: SIHUA_TONE[star.sihua] }}
                        >
                          {star.sihua.slice(1)}
                        </span>
                      )}
                    </span>
                  ))
                ) : (
                  <span className="text-muted-foreground/60">空宫</span>
                )}
              </span>
            </button>
          )
        })}

        {/* branch badges (counter-rotated to stay upright) */}
        {PALACES.map((palace, i) => {
          const p = polar(i, BRANCH_RADIUS)
          const isSelected = selected === i
          const isRelated = relatedSet.has(i)
          const isHovered = hovered === i
          const lit = hovered !== null ? isHovered : isSelected
          return (
            <div
              key={`br-${palace.id}`}
              className={cn(
                'pointer-events-none absolute z-10 flex size-6 items-center justify-center rounded-full border text-[11px] font-medium transition-all duration-500',
                lit
                  ? 'border-primary/70 bg-primary/15 text-primary'
                  : isRelated
                    ? 'border-primary/30 bg-background/60 text-foreground/80'
                    : 'border-border bg-background/50 text-muted-foreground',
              )}
              style={{
                left: `${p.x}%`,
                top: `${p.y}%`,
                transform: `translate(-50%, -50%) rotate(${-rotation}deg)`,
                transformOrigin: 'center',
                transition: ROTATE_TRANSITION,
                boxShadow: lit ? '0 0 14px -2px oklch(0.65 0.2 300 / 0.7)' : undefined,
              }}
            >
              {palace.branch}
            </div>
          )
        })}
      </div>

      {/* ---------- Fixed top wedge (beam) ---------- */}
      <svg
        viewBox="0 0 100 100"
        className="pointer-events-none absolute inset-0 h-full w-full"
        aria-hidden="true"
      >
        <path d={beamPath} fill="url(#beam-grad)" />
      </svg>

      {/* ---------- Center core ---------- */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 z-20 flex aspect-square w-[39%] max-w-[242px] -translate-x-1/2 -translate-y-1/2 items-center justify-center">
        <motion.div
          className="relative flex aspect-square w-full flex-col items-center justify-center overflow-hidden rounded-full text-center"
          style={{
            background:
              'radial-gradient(circle at 50% 42%, oklch(0.24 0.06 292), oklch(0.13 0.03 285))',
            border: '1px solid oklch(0.72 0.17 298 / 0.28)',
          }}
          animate={{
            boxShadow: [
              '0 0 0 1px oklch(0.72 0.17 298 / 0.2), 0 0 44px -8px oklch(0.6 0.2 300 / 0.45), inset 0 1px 0 0 oklch(1 0 0 / 0.06)',
              '0 0 0 1px oklch(0.72 0.17 298 / 0.36), 0 0 68px -4px oklch(0.6 0.2 300 / 0.6), inset 0 1px 0 0 oklch(1 0 0 / 0.08)',
              '0 0 0 1px oklch(0.72 0.17 298 / 0.2), 0 0 44px -8px oklch(0.6 0.2 300 / 0.45), inset 0 1px 0 0 oklch(1 0 0 / 0.06)',
            ],
          }}
          transition={{ duration: 5.5, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }}
        >
          {/* purple bloom pulse on each selection change */}
          <motion.div
            key={`bloom-${focus.id}`}
            className="pointer-events-none absolute inset-0 rounded-full"
            style={{
              background:
                'radial-gradient(circle at 50% 50%, oklch(0.6 0.24 300 / 0.7), transparent 62%)',
            }}
            initial={{ opacity: 0.85, scale: 0.7 }}
            animate={{ opacity: 0, scale: 1.35 }}
            transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
          />
          <AnimatePresence mode="wait">
            <motion.div
              key={focus.id}
              initial={{ opacity: 0, y: 8, filter: 'blur(4px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -8, filter: 'blur(4px)' }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              className="relative flex flex-col items-center px-6"
            >
              <span className="font-serif text-[30px] font-medium leading-none text-foreground">
                {focus.name}
              </span>
              <span className="mt-2.5 text-[13px] font-medium tracking-wide text-primary/90">
                {focus.mainStars.map((s) => s.name).join(' · ') || '空宫 · 借对宫'}
              </span>
              <span className="mt-3 max-w-[150px] text-pretty text-[11px] leading-relaxed text-muted-foreground">
                {focus.summary}
              </span>
            </motion.div>
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  )
}
