'use client'

import {
  conversationRecordsReducer,
  conversationTimelineItem,
  createConversationRecordsState,
  currentSessionConversation,
  loadConversationList,
  loadConversationMessages,
  type ConversationDetailState,
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
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'

type RecordsLoadState =
  | { phase: 'loading' }
  | { phase: 'ready'; unavailable: boolean }
  | { phase: 'error'; message: string }

type ProfileLoadState = {
  profileId: string
  state: RecordsLoadState
}

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
  const [records, dispatchRecords] = useReducer(conversationRecordsReducer, '', createConversationRecordsState)
  const [loadState, setLoadState] = useState<ProfileLoadState>({ profileId: '', state: { phase: 'loading' } })
  const listRequestId = useRef(0)
  const requestProfileId = useRef(profileId)

  if (requestProfileId.current !== profileId) {
    requestProfileId.current = profileId
    listRequestId.current += 1
  }

  const activeRecords = records.profileId === profileId ? records : createConversationRecordsState(profileId)
  const activeLoadState = loadState.profileId === profileId ? loadState.state : { phase: 'loading' as const }
  const conversations = useMemo(() => mergeCurrentSession(activeRecords.conversations, current), [activeRecords.conversations, current])
  const activeId = conversations.some((conversation) => conversation.id === activeRecords.selectedId)
    ? activeRecords.selectedId
    : conversations[0]?.id ?? null
  const selected = conversations.find((conversation) => conversation.id === activeId) ?? null
  const selectedDetail = activeId === current?.conversation.id
    ? { phase: 'ready', messages: current.messages } satisfies ConversationDetailState
    : activeId ? activeRecords.details[activeId] : undefined
  const selectedMessages = selectedDetail?.messages ?? []
  const selectedItem = selected ? conversationTimelineItem(selected, selectedMessages) : null

  const retryDetail = useCallback((conversationId: string) => {
    dispatchRecords({ type: 'detail_retry', profileId, conversationId })
  }, [profileId])

  useEffect(() => {
    if (!ready || !profileId) return
    const requestId = ++listRequestId.current

    void (async () => {
      await Promise.resolve()
      if (requestId !== listRequestId.current) return
      dispatchRecords({ type: 'reset', profileId })
      setLoadState({ profileId, state: { phase: 'loading' } })
      try {
        const result = await loadConversationList(profileId)
        if (requestId !== listRequestId.current) return
        dispatchRecords({ type: 'conversations_loaded', profileId, conversations: result.conversations })
        setLoadState({ profileId, state: { phase: 'ready', unavailable: result.unavailable } })
      } catch (error) {
        if (requestId !== listRequestId.current) return
        setLoadState({
          profileId,
          state: { phase: 'error', message: error instanceof Error ? error.message : '对话记录读取失败，请稍后重试。' },
        })
      }
    })()
  }, [profileId, ready])

  useEffect(() => {
    if (!ready || !profileId || !activeId || activeId === current?.conversation.id) return
    const detail = activeRecords.details[activeId]
    if (detail && detail.phase !== 'idle') return

    void (async () => {
      await Promise.resolve()
      dispatchRecords({ type: 'detail_loading', profileId, conversationId: activeId })
      try {
        const messages = await loadConversationMessages(profileId, activeId)
        dispatchRecords({ type: 'detail_resolved', profileId, conversationId: activeId, messages })
      } catch {
        dispatchRecords({ type: 'detail_failed', profileId, conversationId: activeId })
      }
    })()
  }, [activeId, activeRecords.details, current?.conversation.id, profileId, ready])

  return (
    <div className="relative">
      <div className="absolute bottom-2 left-[19px] top-2 w-px bg-gradient-to-b from-transparent via-border to-transparent" />

      {activeLoadState.phase === 'error' && (
        <p className="mb-4 ml-14 text-sm text-muted-foreground">{activeLoadState.message}</p>
      )}
      {activeLoadState.phase === 'ready' && activeLoadState.unavailable && (
        <p className="mb-4 ml-14 text-sm text-muted-foreground">历史记录暂不可用，当前浏览器会话仍可查看。</p>
      )}
      {activeLoadState.phase === 'loading' && !conversations.length && (
        <p className="mb-4 ml-14 text-sm text-muted-foreground">正在读取对话记录。</p>
      )}
      {!conversations.length && activeLoadState.phase !== 'loading' ? (
        <p className="ml-14 text-sm leading-relaxed text-muted-foreground">还没有可展示的真实对话记录。</p>
      ) : (
        <ol className="flex flex-col gap-3">
          {conversations.map((conversation, index) => {
            const messages = conversation.id === current?.conversation.id
              ? current.messages
              : activeRecords.details[conversation.id]?.messages ?? []
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

                <div className={cn(
                  'surface surface-hover mb-1 flex-1 rounded-2xl text-left',
                  isOpen && 'border-primary/30',
                )}>
                  <button
                    type="button"
                    onClick={() => dispatchRecords({ type: 'select', profileId, conversationId: item.id })}
                    aria-expanded={isOpen}
                    className="w-full p-4 text-left"
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

                  </button>

                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                        className="overflow-hidden"
                      >
                        <ConversationMessages
                          detail={selectedDetail}
                          messages={selectedItem?.messages ?? []}
                          onRetry={() => retryDetail(item.id)}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.li>
            )
          })}
        </ol>
      )}
    </div>
  )
}

function ConversationMessages({
  detail,
  messages,
  onRetry,
}: {
  detail: ConversationDetailState | undefined
  messages: ConversationMessageItem[]
  onRetry: () => void
}) {
  if (detail?.phase === 'error') {
    return (
      <div className="pt-3">
        <p className="text-sm text-muted-foreground">{detail.message}</p>
        <button type="button" onClick={onRetry} className="mt-2 text-sm font-medium text-primary hover:text-primary/80">重试</button>
        {messages.length > 0 && <MessageList messages={messages} />}
      </div>
    )
  }

  if (!messages.length) return <p className="pt-3 text-sm text-muted-foreground">正在读取这段对话。</p>

  return <MessageList messages={messages} />
}

function MessageList({ messages }: { messages: ConversationMessageItem[] }) {
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
