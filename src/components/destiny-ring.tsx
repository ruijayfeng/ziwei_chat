'use client'

import { motion } from 'motion/react'
import { cn } from '@/lib/utils'

// 12 earthly branches, 午 at top, running clockwise
const BRANCHES = ['午', '未', '申', '酉', '戌', '亥', '子', '丑', '寅', '卯', '辰', '巳']

const SIZE = 440
const CENTER = SIZE / 2

function round(n: number) {
  return Math.round(n * 1000) / 1000
}

function polar(radius: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180
  return {
    x: round(CENTER + radius * Math.cos(rad)),
    y: round(CENTER + radius * Math.sin(rad)),
  }
}

/**
 * An ambient chart ring — the calm centerpiece of the entrance.
 *
 * Deliberately *not* a score dial: divination can't be measured, so there is no
 * number and no progress arc that implies a percentage. The focal point is a
 * four-character phrase (qualitative, honest, rooted in the almanac tradition),
 * anchored by today's factual heavenly-stem/earthly-branch day.
 */
export function DestinyRing({
  phrase = '稳中求进',
  day = '戊申日',
  favorable = '宜推进长期计划',
  caution = '忌情绪化决策',
  hideCenter = false,
  className,
}: {
  phrase?: string
  day?: string
  favorable?: string
  caution?: string
  /** Hide the center phrase/almanac block — used for the ambient background ring. */
  hideCenter?: boolean
  className?: string
}) {
  return (
    <div className={cn('relative mx-auto aspect-square w-full max-w-[440px]', className)}>
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="h-full w-full" role="img" aria-label={`今日 ${day}，${phrase}`}>
        <defs>
          <radialGradient id="ring-core" cx="50%" cy="44%" r="52%">
            <stop offset="0%" stopColor="oklch(0.6 0.2 300 / 0.42)" />
            <stop offset="45%" stopColor="oklch(0.5 0.18 300 / 0.16)" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
          <radialGradient id="ring-disc" cx="50%" cy="42%" r="55%">
            <stop offset="0%" stopColor="oklch(0.22 0.05 292 / 0.9)" />
            <stop offset="100%" stopColor="oklch(0.13 0.03 285 / 0.4)" />
          </radialGradient>
          <linearGradient id="ring-stroke" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="oklch(0.8 0.16 300 / 0.95)" />
            <stop offset="100%" stopColor="oklch(0.72 0.13 250 / 0.55)" />
          </linearGradient>
          <linearGradient id="halo-ring" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="oklch(0.82 0.15 300 / 0.55)" />
            <stop offset="50%" stopColor="oklch(0.78 0.12 280 / 0.25)" />
            <stop offset="100%" stopColor="oklch(0.8 0.14 320 / 0.5)" />
          </linearGradient>
        </defs>

        {/* Inner disc for depth */}
        <circle cx={CENTER} cy={CENTER} r={132} fill="url(#ring-disc)" />

        {/* Core glow */}
        <circle cx={CENTER} cy={CENTER} r={150} fill="url(#ring-core)" />

        {/* Static concentric guide rings */}
        {[205, 168, 132, 96].map((r, i) => (
          <circle
            key={r}
            cx={CENTER}
            cy={CENTER}
            r={r}
            fill="none"
            stroke="oklch(0.88 0.04 292)"
            strokeOpacity={0.12 + i * 0.02}
            strokeWidth={1}
          />
        ))}

        {/* Decorative luminous ring — breathes softly, tied to no value */}
        <motion.circle
          cx={CENTER}
          cy={CENTER}
          r={168}
          fill="none"
          stroke="url(#halo-ring)"
          strokeWidth={2}
          strokeLinecap="round"
          style={{ filter: 'drop-shadow(0 0 6px oklch(0.78 0.14 298 / 0.5))' }}
          animate={{ opacity: [0.55, 0.9, 0.55] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Slow rotating dashed orbit */}
        <g className="ziwei-orbit-slow">
          <circle
            cx={CENTER}
            cy={CENTER}
            r={186}
            fill="none"
            stroke="url(#ring-stroke)"
            strokeOpacity={0.5}
            strokeWidth={1}
            strokeDasharray="2 10"
          />
        </g>
        <g className="ziwei-orbit-slower">
          <circle
            cx={CENTER}
            cy={CENTER}
            r={114}
            fill="none"
            stroke="oklch(0.72 0.1 255)"
            strokeOpacity={0.35}
            strokeWidth={1}
            strokeDasharray="1 14"
          />
        </g>

        {/* Orbiting accent nodes */}
        <g className="ziwei-orbit-slow">
          {[30, 150, 268].map((a) => {
            const p = polar(186, a)
            return (
              <circle key={a} cx={p.x} cy={p.y} r={2.4} fill="oklch(0.85 0.08 300)">
                <animate attributeName="opacity" values="0.3;1;0.3" dur="5s" repeatCount="indefinite" />
              </circle>
            )
          })}
        </g>

        {/* 12 palace markers */}
        {BRANCHES.map((branch, i) => {
          const angle = i * 30
          const tick = polar(205, angle)
          const tickIn = polar(196, angle)
          const label = polar(224, angle)
          return (
            <g key={branch}>
              <line
                x1={tickIn.x}
                y1={tickIn.y}
                x2={tick.x}
                y2={tick.y}
                stroke="oklch(0.8 0.04 290)"
                strokeOpacity={0.25}
                strokeWidth={1}
              />
              <text
                x={label.x}
                y={label.y}
                textAnchor="middle"
                dominantBaseline="central"
                className="font-serif"
                fontSize={15}
                fill="oklch(0.72 0.03 290)"
                fillOpacity={0.75}
              >
                {branch}
              </text>
            </g>
          )
        })}

        {/* Faint sparse stars inside the ring */}
        {[
          [200, 120],
          [150, 250],
          [268, 210],
          [180, 300],
          [250, 300],
          [120, 180],
        ].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={1.2} fill="oklch(0.92 0.03 290)">
            <animate attributeName="opacity" values="0.15;0.7;0.15" dur={`${4 + i}s`} repeatCount="indefinite" />
          </circle>
        ))}
      </svg>

      {/* Center — qualitative, no score */}
      {!hideCenter && (
      <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center sm:px-10">
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="mb-3 font-mono text-xs tracking-[0.25em] text-muted-foreground"
        >
          今日 · {day}
        </motion.p>
        <motion.h2
          initial={{ opacity: 0, filter: 'blur(8px)' }}
          animate={{ opacity: 1, filter: 'blur(0px)' }}
          transition={{ duration: 1, ease: 'easeOut' }}
          className="font-serif text-[40px] font-medium leading-none tracking-[0.08em] text-foreground [text-shadow:0_0_36px_oklch(0.68_0.14_300/0.45)] sm:text-[52px]"
        >
          {phrase}
        </motion.h2>
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="mt-5 flex flex-col items-center gap-1 text-[13px] leading-relaxed"
        >
          <span className="text-foreground/85">{favorable}</span>
          <span className="text-muted-foreground">{caution}</span>
        </motion.div>
      </div>
      )}
    </div>
  )
}
