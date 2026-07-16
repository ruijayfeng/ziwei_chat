'use client'

import {
  conversationTimelineItem,
  currentSessionConversation,
  loadConversationList,
  loadConversationMessages,
  type ConversationListItem,
  type ConversationMessageItem,
  type ConversationTimelineItem,
} from '@/lib/ui/conversation-records'
import { cn } from '@/lib/utils'
import { useWorkspace } from '@/components/workspace/workspace-provider'
import {
  Briefcase,
  Compass,
  Heart,
  PenLine,
  TrendingUp,
  UserRound,
  type LucideIcon,
} from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useMemo, useRef, useState } from 'react'

type RecordsLoadState =
  | { phase: 'loading' }
  | { phase: 'ready'; unavailable: boolean }
  | { phase: 'error'; message: string }

const KIND_DISPLAY: Record<ConversationTimelineItem['kind'], { accent: string; icon: LucideIcon; label: string }> = {
  career: { accent: 'oklch(0.75 0.13 150)', icon: Briefcase, label: '事业' },
  relationship: { accent: 'oklch(0.76 0.14 10)', icon: Heart, label: '感情' },
  wealth: { accent: 'oklch(0.78 0.14 85)', icon: TrendingUp, label: '财富' },
  personality: { accent: 'oklch(0.72 0.12 280)', icon: UserRound, label: '性格' },
  recent_fortune: { accent: 'oklch(0.75 0.13 220)', icon: Compass, label: '近期运势' },
  conversation: { accent: 'oklch(0.72 0.08 260)', icon: PenLine, label: '对话' },
}

export function LifeTimeline() {
  const { ready, profileId, conversationId, chatSession } = useWorkspace()
  const current = currentSessionConversation(conversationId, chatSession.messages)
  const [persisted, setPersisted] = useState<ConversationListItem[]>([])
  const [messagesByConversation, setMessagesByConversation] = useState<Record<string, ConversationMessageItem[]>>({})
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [loadState, setLoadState] = useState<RecordsLoadState>({ phase: 'loading' })
  const listRequestId = useRef(0)
  const detailRequestId = useRef(0)

  const conversations = useMemo(() => mergeCurrentSession(persisted, current), [current, persisted])
  const activeId = conversations.some((conversation) => conversation.id === selectedId)
    ? selectedId
    : conversations[0]?.id ?? null
  const selected = conversations.find((conversation) => conversation.id === activeId) ?? null
  const selectedMessages = activeId === current?.conversation.id
    ? current.messages
    : activeId ? messagesByConversation[activeId] ?? [] : []
  const selectedItem = selected ? conversationTimelineItem(selected, selectedMessages) : null

  useEffect(() => {
    if (!ready || !profileId) return
    const requestId = ++listRequestId.current

    void (async () => {
      await Promise.resolve()
      if (requestId !== listRequestId.current) return
      setLoadState({ phase: 'loading' })
      try {
        const result = await loadConversationList(profileId)
        if (requestId !== listRequestId.current) return
        setPersisted(result.conversations)
        setLoadState({ phase: 'ready', unavailable: result.unavailable })
      } catch (error) {
        if (requestId !== listRequestId.current) return
        setLoadState({ phase: 'error', message: error instanceof Error ? error.message : '对话记录读取失败，请稍后重试。' })
      }
    })()
  }, [profileId, ready])

  useEffect(() => {
    if (!ready || !profileId || !activeId || activeId === current?.conversation.id || messagesByConversation[activeId]) return
    const requestId = ++detailRequestId.current

    void loadConversationMessages(profileId, activeId)
      .then((messages) => {
        if (requestId !== detailRequestId.current) return
        setMessagesByConversation((cached) => ({ ...cached, [activeId]: messages }))
      })
      .catch(() => {
        if (requestId !== detailRequestId.current) return
        setMessagesByConversation((cached) => ({ ...cached, [activeId]: [] }))
      })
  }, [activeId, current?.conversation.id, messagesByConversation, profileId, ready])

  return (
    <div className="relative">
      <div className="absolute bottom-2 left-[19px] top-2 w-px bg-gradient-to-b from-transparent via-border to-transparent" />

      {loadState.phase === 'error' && (
        <p className="mb-4 ml-14 text-sm text-muted-foreground">{loadState.message}</p>
      )}
      {loadState.phase === 'ready' && loadState.unavailable && (
        <p className="mb-4 ml-14 text-sm text-muted-foreground">历史记录暂不可用，当前浏览器会话仍可查看。</p>
      )}
      {loadState.phase === 'loading' && !conversations.length && (
        <p className="mb-4 ml-14 text-sm text-muted-foreground">正在读取对话记录。</p>
      )}
      {!conversations.length && loadState.phase !== 'loading' ? (
        <p className="ml-14 text-sm leading-relaxed text-muted-foreground">还没有可展示的真实对话记录。</p>
      ) : (
        <ol className="flex flex-col gap-3">
          {conversations.map((conversation, index) => {
            const messages = conversation.id === current?.conversation.id
              ? current.messages
              : messagesByConversation[conversation.id] ?? []
            const item = conversationTimelineItem(conversation, messages)
            const display = KIND_DISPLAY[item.kind]
            const Icon = display.icon
            const isOpen = activeId === item.id
            const isCurrent = item.id === current?.conversation.id

            return (
              <motion.li
                key={item.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.05, ease: [0.16, 1, 0.3, 1] }}
                className="relative flex gap-4"
              >
                <div className="relative z-10 shrink-0">
                  <div
                    className="flex size-10 items-center justify-center rounded-full border transition-colors duration-300"
                    style={{
                      borderColor: `color-mix(in oklch, ${display.accent} 40%, transparent)`,
                      background: `color-mix(in oklch, ${display.accent} 14%, oklch(0.17 0.026 283))`,
                    }}
                  >
                    <Icon className="size-[18px]" strokeWidth={1.75} style={{ color: display.accent }} />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedId(item.id)}
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
                        color: display.accent,
                        background: `color-mix(in oklch, ${display.accent} 14%, transparent)`,
                      }}
                    >
                      {isCurrent ? '当前浏览器会话' : display.label}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[15px] font-medium text-foreground">{item.title}</span>
                    <span className="shrink-0 font-mono text-xs text-muted-foreground">{formatDate(item.lastMessageAt)}</span>
                  </div>
                  {!isOpen && item.preview && <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">{item.preview}</p>}

                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                        className="overflow-hidden"
                      >
                        <ConversationMessages messages={selectedItem?.messages ?? []} />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </button>
              </motion.li>
            )
          })}
        </ol>
      )}
    </div>
  )
}

function ConversationMessages({ messages }: { messages: ConversationMessageItem[] }) {
  if (!messages.length) return <p className="pt-3 text-sm text-muted-foreground">正在读取这段对话，或该对话暂无可展示内容。</p>

  return (
    <ol className="mt-4 grid gap-4 border-t border-border/70 pt-4">
      {messages.map((message) => (
        <li key={message.id} className="grid grid-cols-[3rem_minmax(0,1fr)] gap-3 text-sm leading-relaxed">
          <span className="text-xs text-muted-foreground">{message.role === 'user' ? '你' : '紫微'}</span>
          <p className="whitespace-pre-wrap text-foreground/90">{message.content}</p>
        </li>
      ))}
    </ol>
  )
}

function mergeCurrentSession(
  persisted: ConversationListItem[],
  current: ReturnType<typeof currentSessionConversation>,
) {
  if (!current) return persisted
  return [current.conversation, ...persisted.filter((conversation) => conversation.id !== current.conversation.id)]
}

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '当前'
  return new Intl.DateTimeFormat('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(date)
}
