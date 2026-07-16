'use client'

import { MotionConfig } from 'motion/react'
import type { ReactNode } from 'react'

/**
 * App-wide motion contract. `reducedMotion="user"` makes every motion/react
 * animation honor the OS "reduce motion" setting automatically — transform and
 * layout animations are dropped while opacity crossfades remain — so we get a
 * systemic accessibility fallback without hand-gating each component.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>
}
