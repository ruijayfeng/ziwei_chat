'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'

export type ChatRole = 'user' | 'assistant'

export type ChatMessage = {
  id: string
  role: ChatRole
  content: string
  streaming?: boolean
}

export type AnalysisRef = {
  palace: string
  star: string
  note: string
}

type ChatPhase = 'idle' | 'active'

type ChatSession = {
  phase: ChatPhase
  messages: ChatMessage[]
  thinking: boolean
  refs: AnalysisRef[]
  send: (text: string) => void
  retry: () => void
  reset: () => void
}

const ChatSessionContext = createContext<ChatSession | null>(null)

export function useChatSession() {
  const ctx = useContext(ChatSessionContext)
  if (!ctx) throw new Error('useChatSession must be used within <ChatProvider>')
  return ctx
}

let idCounter = 0
const nextId = () => `m${++idCounter}`

// Demo scaffolding — a calm, honest reply plus traceable chart references.
// This stands in for a real model stream (e.g. AI SDK useChat) later.
const DEMO_REPLY = `你问的这件事，命盘里确实有迹可循。

命宫三方见紫微与天府，说明你天生对秩序与掌控有需求；今年流年行至官禄宫，武曲化权引动，是一个适合主动出手、把长期计划真正落地的节奏。

但也要留意：破军在迁移，变动之中容易急于求成。稳一点，先把方向想清楚，再谈速度。这只是命盘给出的一种视角，真正的决定仍在你手里。`

const DEMO_REFS: AnalysisRef[] = [
  { palace: '命宫 · 三方四正', star: '紫微 · 天府', note: '先天格局与自我定位' },
  { palace: '官禄宫 · 流年', star: '武曲化权', note: '今年事业的主动力量' },
  { palace: '迁移宫', star: '破军', note: '变动与外出中的躁动' },
]

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [phase, setPhase] = useState<ChatPhase>('idle')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [thinking, setThinking] = useState(false)
  const [refs, setRefs] = useState<AnalysisRef[]>([])

  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const streamTimer = useRef<ReturnType<typeof setInterval> | null>(null)

  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout)
    timers.current = []
    if (streamTimer.current) {
      clearInterval(streamTimer.current)
      streamTimer.current = null
    }
  }, [])

  useEffect(() => () => clearTimers(), [clearTimers])

  const streamReply = useCallback((id: string, full: string) => {
    let i = 0
    streamTimer.current = setInterval(() => {
      // Reveal a few characters per tick for a natural typing cadence.
      i = Math.min(full.length, i + 2)
      const slice = full.slice(0, i)
      setMessages((prev) =>
        prev.map((m) => (m.id === id ? { ...m, content: slice } : m)),
      )
      if (i >= full.length) {
        if (streamTimer.current) clearInterval(streamTimer.current)
        streamTimer.current = null
        setMessages((prev) =>
          prev.map((m) => (m.id === id ? { ...m, streaming: false } : m)),
        )
      }
    }, 26)
  }, [])

  // Shared "consult the chart, then answer" sequence used by both send & retry.
  const runReply = useCallback(() => {
    setThinking(true)
    setRefs([])

    // Analysis basis surfaces first — the panel "reads the chart" before answering.
    timers.current.push(
      setTimeout(() => setRefs(DEMO_REFS.slice(0, 1)), 500),
      setTimeout(() => setRefs(DEMO_REFS.slice(0, 2)), 800),
      setTimeout(() => setRefs(DEMO_REFS), 1050),
    )

    // Then the assistant begins streaming its reflection.
    timers.current.push(
      setTimeout(() => {
        setThinking(false)
        const id = nextId()
        setMessages((prev) => [
          ...prev,
          { id, role: 'assistant', content: '', streaming: true },
        ])
        streamReply(id, DEMO_REPLY)
      }, 1300),
    )
  }, [streamReply])

  const send = useCallback(
    (text: string) => {
      const value = text.trim()
      if (!value) return

      clearTimers()
      setPhase('active')
      setMessages((prev) => [...prev, { id: nextId(), role: 'user', content: value }])
      runReply()
    },
    [clearTimers, runReply],
  )

  // Regenerate: drop the trailing assistant turn and re-run the reply.
  const retry = useCallback(() => {
    clearTimers()
    setMessages((prev) => {
      const next = [...prev]
      while (next.length && next[next.length - 1].role === 'assistant') next.pop()
      return next
    })
    runReply()
  }, [clearTimers, runReply])

  const reset = useCallback(() => {
    clearTimers()
    setPhase('idle')
    setMessages([])
    setThinking(false)
    setRefs([])
  }, [clearTimers])

  return (
    <ChatSessionContext.Provider value={{ phase, messages, thinking, refs, send, retry, reset }}>
      {children}
    </ChatSessionContext.Provider>
  )
}
