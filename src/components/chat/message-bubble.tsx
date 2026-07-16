'use client'

import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { Check, Copy, RotateCcw } from 'lucide-react'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import type { ChatMessage } from '@/components/chat/chat-session'

const EASE = [0.16, 1, 0.3, 1] as const

/** A slim, glowing hairline that marks the assistant's voice — a book-margin
 *  mark in place of a repeated avatar. */
function VoiceLine() {
  return (
    <div
      aria-hidden
      className="w-px shrink-0 self-stretch rounded-full bg-gradient-to-b from-primary/40 via-primary/15 to-transparent"
    />
  )
}

function ActionButton({
  label,
  onClick,
  children,
}: {
  label: string
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors duration-200 hover:bg-card hover:text-foreground"
    >
      {children}
    </button>
  )
}

function AssistantActions({
  content,
  canRetry,
  onRetry,
}: {
  content: string
  canRetry: boolean
  onRetry?: () => void
}) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return
    const t = setTimeout(() => setCopied(false), 1600)
    return () => clearTimeout(t)
  }, [copied])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(content)
      setCopied(true)
    } catch {
      /* clipboard unavailable — no-op */
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: EASE }}
      className="mt-1 flex items-center gap-0.5"
    >
      <ActionButton label={copied ? '已复制' : '复制'} onClick={copy}>
        <AnimatePresence mode="wait" initial={false}>
          {copied ? (
            <motion.span
              key="check"
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.6 }}
              transition={{ duration: 0.2 }}
            >
              <Check className="size-3.5 text-primary" strokeWidth={2} />
            </motion.span>
          ) : (
            <motion.span
              key="copy"
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.6 }}
              transition={{ duration: 0.2 }}
            >
              <Copy className="size-3.5" strokeWidth={1.75} />
            </motion.span>
          )}
        </AnimatePresence>
      </ActionButton>
      {canRetry && onRetry && (
        <ActionButton label="重新参详" onClick={onRetry}>
          <RotateCcw className="size-3.5" strokeWidth={1.75} />
        </ActionButton>
      )}
    </motion.div>
  )
}

export function MessageBubble({
  message,
  isLast = false,
  onRetry,
}: {
  message: ChatMessage
  isLast?: boolean
  onRetry?: () => void
}) {
  const reduceMotion = useReducedMotion()
  const isUser = message.role === 'user'

  if (isUser) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: EASE }}
        className="flex justify-end"
      >
        <div className="max-w-[82%] rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-sm leading-relaxed text-primary-foreground">
          {message.content}
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE }}
      className="flex gap-4"
    >
      <VoiceLine />
      <div className="min-w-0 flex-1">
        <div
          aria-live="polite"
          className="max-w-[92%] whitespace-pre-wrap text-[15px] leading-[1.75] text-foreground/90"
        >
          {message.content}
          {message.streaming &&
            (reduceMotion ? (
              <span
                aria-hidden
                className="ml-0.5 inline-block h-4 w-[2px] translate-y-0.5 rounded-full bg-primary align-middle"
              />
            ) : (
              <motion.span
                aria-hidden
                animate={{ opacity: [1, 0.2, 1] }}
                transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }}
                className="ml-0.5 inline-block h-4 w-[2px] translate-y-0.5 rounded-full bg-primary align-middle"
              />
            ))}
        </div>
        {!message.streaming && message.content && (
          <AssistantActions content={message.content} canRetry={isLast} onRetry={onRetry} />
        )}
      </div>
    </motion.div>
  )
}

/** A breathing "pole-star" point — the calm, on-brand answer to ChatGPT's
 *  breathing dot. A soft halo pulses outward while the core star breathes. */
function BreathingStar() {
  const reduceMotion = useReducedMotion()

  if (reduceMotion) {
    return (
      <span
        aria-hidden
        className="relative flex size-3 shrink-0 items-center justify-center"
      >
        <span className="size-2 rounded-full bg-primary shadow-[0_0_6px_oklch(0.74_0.17_300/0.4)]" />
      </span>
    )
  }

  return (
    <span aria-hidden className="relative flex size-3 shrink-0 items-center justify-center">
      {/* Expanding halo pulse */}
      <motion.span
        className="absolute inset-0 rounded-full bg-primary/40"
        animate={{ scale: [1, 2.4], opacity: [0.5, 0] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut' }}
      />
      {/* Breathing core */}
      <motion.span
        className="relative size-2 rounded-full bg-primary shadow-[0_0_6px_oklch(0.74_0.17_300/0.4)]"
        animate={{ scale: [1, 0.72, 1], opacity: [1, 0.55, 1] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
      />
    </span>
  )
}

// The staged status doubles as content: it tells the user the AI is genuinely
// consulting their chart, reinforcing the product's traceability promise.
const THINKING_STAGES = ['正在校对命盘', '参详三方四正', '落笔中']

export function ThinkingIndicator() {
  const [stage, setStage] = useState(0)

  useEffect(() => {
    const t = setInterval(
      () => setStage((s) => Math.min(s + 1, THINKING_STAGES.length - 1)),
      900,
    )
    return () => clearInterval(t)
  }, [])

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4, ease: EASE }}
      className="flex gap-4"
    >
      <VoiceLine />
      <div
        role="status"
        aria-label="紫微知道正在参详你的命盘，请稍候"
        className="flex items-center gap-2.5 py-0.5"
      >
        <BreathingStar />
        <AnimatePresence mode="wait">
          <motion.span
            key={stage}
            aria-hidden
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.35, ease: EASE }}
            className={cn(
              'ziwei-shimmer bg-clip-text text-[15px] text-transparent',
              'font-serif tracking-wide',
            )}
          >
            {THINKING_STAGES[stage]}
          </motion.span>
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
