'use client'

import { AnimatePresence, motion } from 'motion/react'
import { ArrowLeft } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { DestinyRing } from '@/components/destiny-ring'
import { HeroHeader } from '@/components/hero-header'
import { ChatComposer } from '@/components/chat-composer'
import { useChatSession } from '@/components/chat/chat-session'
import { MessageBubble, ThinkingIndicator } from '@/components/chat/message-bubble'

const EASE = [0.16, 1, 0.3, 1] as const

/**
 * The 对话 home experience — a single space that transforms rather than
 * navigates. Sending a question sinks the chart into an ambient backdrop and
 * opens a focused dialogue: a fixed header, an internally-scrolling thread, and
 * a solid, full-bleed composer anchored to the foot of the view.
 */
export function ChatExperience() {
  const { phase, messages, thinking, busy, send, retry, reset } = useChatSession()
  const lastAssistantId = [...messages].reverse().find((m) => m.role === 'assistant')?.id
  const active = phase === 'active'
  const scrollRef = useRef<HTMLDivElement>(null)

  // Follow the newest content — including each streaming tick — by scrolling the
  // dedicated thread container (never the page), so the view tracks the answer.
  useEffect(() => {
    if (!active) return
    const el = scrollRef.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }, [messages, thinking, active])

  return (
    <div className="relative flex h-full flex-col">
      {/* Ambient chart — the field the whole conversation sits within. */}
      <AnimatePresence>
        {active && (
          <motion.div
            key="aura"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 1.2, ease: EASE }}
            aria-hidden
            className="pointer-events-none fixed inset-0 z-0 flex items-center justify-center overflow-hidden"
          >
            <div className="ziwei-orbit-slow opacity-[0.07]">
              <DestinyRing hideCenter className="max-w-[min(120vh,1100px)]" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {active ? (
        <div className="relative z-10 mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col">
          {/* Fixed conversation header */}
          <div className="flex flex-none items-center justify-between py-5">
            <button
              type="button"
              onClick={reset}
              className="flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="size-3.5" strokeWidth={1.75} />
              回到今日
            </button>
            <span className="font-mono text-[11px] tracking-widest text-muted-foreground">
              戊申日 · 对话中
            </span>
          </div>

          {/* Thread — the only element that scrolls */}
          <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto pr-1">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.15, ease: EASE }}
              className="flex flex-col gap-6 pb-4"
            >
              {messages.map((m) => (
                <MessageBubble
                  key={m.id}
                  message={m}
                  isLast={!thinking && m.id === lastAssistantId}
                  onRetry={retry}
                />
              ))}
              <AnimatePresence>{thinking && <ThinkingIndicator />}</AnimatePresence>
            </motion.div>
          </div>

          {/* Solid, full-bleed composer footer — nothing shows through it. */}
          <div className="flex-none bg-background pb-6 pt-3">
            <ChatComposer variant="docked" disabled={busy} onSend={send} />
          </div>
        </div>
      ) : (
        <div className="relative z-10 mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-10 overflow-y-auto py-6">
          <HeroHeader />
          <div className="flex justify-center py-2">
            <DestinyRing />
          </div>
          <ChatComposer variant="hero" disabled={busy} onSend={send} />
        </div>
      )}
    </div>
  )
}
