'use client'

import {
  conversationDetailView,
  conversationRecap,
  conversationRecordsReducer,
  conversationTimelineItem,
  createConversationRecordsState,
  currentSessionConversation,
  loadConversationList,
  loadConversationMessages,
  nextConversationRequest,
  type ConversationDetailState,
  type ConversationListItem,
  type ConversationMessageItem,
} from '@/lib/ui/conversation-records'
import { cn } from '@/lib/utils'
import { MarkdownAnswer } from '@/components/chat/markdown-answer'
import { useWorkspace } from '@/components/workspace/workspace-provider'
import {
  ArrowUpRight,
  MessageCircle,
} from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'

type RecordsLoadState =
  | { phase: 'loading' }
  | { phase: 'ready'; unavailable: boolean }
  | { phase: 'error'; message: string }

type ProfileLoadState = {
  profileId: string
  state: RecordsLoadState
}

export function LifeTimeline() {
  const { ready, profileId, conversationId, chatSession, localConversations, resumeConversation } = useWorkspace()
  const router = useRouter()
  const current = currentSessionConversation(conversationId, chatSession.messages)
  const [records, dispatchRecords] = useReducer(conversationRecordsReducer, '', createConversationRecordsState)
  const [loadState, setLoadState] = useState<ProfileLoadState>({ profileId: '', state: { phase: 'loading' } })
  const [listRevision, setListRevision] = useState(0)
  const [detailRevision, setDetailRevision] = useState(0)
  const [transcriptId, setTranscriptId] = useState<string | null>(null)
  const listRequestId = useRef(0)
  const detailRequestRef = useRef<AbortController | null>(null)

  const activeRecords = records.profileId === profileId ? records : createConversationRecordsState(profileId)
  const activeLoadState = loadState.profileId === profileId ? loadState.state : { phase: 'loading' as const }
  const localMessagesByConversation = useMemo(() => new Map(localConversations.map((conversation) => [
    conversation.conversationId,
    conversation.messages.map((message) => ({ ...message, conversationId: conversation.conversationId, createdAt: conversation.updatedAt })),
  ])), [localConversations])
  const localConversationList = useMemo(() => localConversations.map((conversation) => ({
    id: conversation.conversationId,
    title: conversation.messages.find((message) => message.role === 'user')?.content.slice(0, 60) || '未命名对话',
    lastMessageAt: conversation.updatedAt,
  })), [localConversations])
  const conversations = useMemo(
    () => mergeCurrentSession([...activeRecords.conversations, ...localConversationList], current),
    [activeRecords.conversations, current, localConversationList],
  )
  const activeId = conversations.some((conversation) => conversation.id === activeRecords.selectedId)
    ? activeRecords.selectedId
    : conversations[0]?.id ?? null
  const selectedDetail = activeId === current?.conversation.id
    ? { phase: 'ready', messages: current.messages } satisfies ConversationDetailState
    : localMessagesByConversation.has(activeId ?? '')
      ? { phase: 'ready', messages: localMessagesByConversation.get(activeId ?? '') ?? [] } satisfies ConversationDetailState
    : activeId ? activeRecords.details[activeId] : undefined
  const detailSettled = selectedDetail?.phase === 'ready' || selectedDetail?.phase === 'error'

  const retryDetail = useCallback((conversationId: string) => {
    dispatchRecords({ type: 'detail_retry', profileId, conversationId })
    setDetailRevision((revision) => revision + 1)
  }, [profileId])

  const retryList = useCallback(() => {
    setListRevision((revision) => revision + 1)
  }, [])

  const continueConversation = useCallback((id: string, messages: ConversationMessageItem[]) => {
    const restorable = messages
      .filter((message): message is ConversationMessageItem & { role: 'user' | 'assistant' } => message.role === 'user' || message.role === 'assistant')
      .map(({ id: messageId, role, content }) => ({ id: messageId, role, content }))
    if (restorable.length === 0) return
    resumeConversation(id, restorable)
    router.push('/')
  }, [resumeConversation, router])

  useEffect(() => {
    if (!ready || !profileId) return
    const requestId = ++listRequestId.current
    const controller = new AbortController()

    void (async () => {
      await Promise.resolve()
      if (requestId !== listRequestId.current) return
      dispatchRecords({ type: 'reset', profileId })
      setLoadState({ profileId, state: { phase: 'loading' } })
      try {
        const result = await loadConversationList(profileId, fetch, controller.signal)
        if (requestId !== listRequestId.current) return
        dispatchRecords({ type: 'conversations_loaded', profileId, conversations: result.conversations })
        setLoadState({ profileId, state: { phase: 'ready', unavailable: result.unavailable } })
      } catch (error) {
        if (controller.signal.aborted) return
        if (requestId !== listRequestId.current) return
        setLoadState({
          profileId,
          state: { phase: 'error', message: error instanceof Error ? error.message : '对话记录读取失败，请稍后重试。' },
        })
      }
    })()
    return () => controller.abort()
  }, [listRevision, profileId, ready])

  useEffect(() => {
    if (!ready || !profileId || !activeId || activeId === current?.conversation.id || localMessagesByConversation.has(activeId)) return
    if (detailSettled) return
    const controller = nextConversationRequest(detailRequestRef.current)
    detailRequestRef.current = controller

    void (async () => {
      await Promise.resolve()
      dispatchRecords({ type: 'detail_loading', profileId, conversationId: activeId })
      try {
        const messages = await loadConversationMessages(profileId, activeId, fetch, controller.signal)
        if (controller.signal.aborted) return
        dispatchRecords({ type: 'detail_resolved', profileId, conversationId: activeId, messages })
      } catch {
        if (controller.signal.aborted) return
        dispatchRecords({ type: 'detail_failed', profileId, conversationId: activeId })
      }
    })()
    return () => {
      controller.abort()
      if (detailRequestRef.current === controller) detailRequestRef.current = null
    }
  }, [activeId, current?.conversation.id, detailRevision, detailSettled, localMessagesByConversation, profileId, ready])

  return (
    <div>

      {activeLoadState.phase === 'error' && (
        <div role="alert" className="mb-4 ml-14 text-sm text-muted-foreground">
          <p>{activeLoadState.message}</p>
          <button type="button" onClick={retryList} className="mt-2 font-medium text-primary hover:text-primary/80">重试</button>
        </div>
      )}
      {activeLoadState.phase === 'ready' && activeLoadState.unavailable && (
        <p role="status" className="mb-4 ml-14 text-sm text-muted-foreground">数据库记录暂不可用，浏览器中已保存的本地对话仍可查看。</p>
      )}
      {activeLoadState.phase === 'loading' && !conversations.length && (
        <p role="status" aria-live="polite" className="mb-4 ml-14 text-sm text-muted-foreground">正在读取对话记录。</p>
      )}
      {!conversations.length && activeLoadState.phase !== 'loading' ? (
        <p className="ml-14 text-sm leading-relaxed text-muted-foreground">还没有可展示的真实对话记录。</p>
      ) : (
        <ol className="flex flex-col gap-3">
          {conversations.map((conversation, index) => {
            const messages = conversation.id === current?.conversation.id
              ? current.messages
              : localMessagesByConversation.get(conversation.id) ?? activeRecords.details[conversation.id]?.messages ?? []
            const item = conversationTimelineItem(conversation, messages)
            const isOpen = activeId === item.id

            return (
              <motion.li
                key={item.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.05, ease: [0.16, 1, 0.3, 1] }}
                className="relative"
              >
                <div className={cn(
                  'surface surface-hover mb-1 text-left',
                  isOpen && 'border-primary/30',
                )}>
                  <button
                    type="button"
                    onClick={() => {
                      dispatchRecords({ type: 'select', profileId, conversationId: item.id })
                      setTranscriptId(null)
                    }}
                    aria-expanded={isOpen}
                    className="w-full p-4 text-left"
                  >
                  <div className="flex items-center gap-2.5">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <MessageCircle className="size-3.5" aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[15px] font-medium text-foreground">{item.title}</span>
                    <span className="shrink-0 font-mono text-xs text-muted-foreground">{formatDate(item.lastMessageAt)}</span>
                  </div>
                  {!isOpen && item.preview && (
                    <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                      <span className="mr-2 text-xs text-primary/80">上次回顾</span>{item.preview}
                    </p>
                  )}

                  </button>

                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                        className="overflow-hidden px-4 pb-4"
                      >
                        <ConversationMessages
                          detail={selectedDetail}
                          messages={messages}
                          onRetry={() => retryDetail(item.id)}
                          showTranscript={transcriptId === item.id}
                          onToggleTranscript={() => setTranscriptId((currentId) => currentId === item.id ? null : item.id)}
                        />
                        {messages.length > 0 && (
                          <div className="mt-4 flex justify-end border-t border-border/70 pt-3">
                            <button
                              type="button"
                              onClick={() => continueConversation(item.id, messages)}
                              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary transition-colors hover:text-primary/80"
                            >
                              继续聊 <ArrowUpRight className="size-3.5" aria-hidden="true" />
                            </button>
                          </div>
                        )}
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
  showTranscript,
  onToggleTranscript,
}: {
  detail: ConversationDetailState | undefined
  messages: ConversationMessageItem[]
  onRetry: () => void
  showTranscript: boolean
  onToggleTranscript: () => void
}) {
  const view = conversationDetailView(detail)
  if (view.phase === 'error') {
    return (
      <div role="alert" className="pt-3">
        <p className="text-sm text-muted-foreground">{view.message}</p>
        <button type="button" onClick={onRetry} className="mt-2 text-sm font-medium text-primary hover:text-primary/80">重试</button>
        {view.messages.length > 0 && <MessageList messages={view.messages} />}
      </div>
    )
  }

  if (view.phase === 'loading') return <p role="status" className="pt-3 text-sm text-muted-foreground">正在读取这段对话。</p>
  if (view.phase === 'empty') return <p className="pt-3 text-sm text-muted-foreground">这段对话没有可展示的消息。</p>

  const visibleMessages = view.messages.length ? view.messages : messages
  const latestAssistant = [...visibleMessages].reverse().find((message) => message.role === 'assistant')
  const recap = conversationRecap(latestAssistant?.content ?? '')

  return (
    <div className="border-t border-border/70 pt-4">
      <p className="text-xs font-medium text-primary/85">AI 回顾</p>
      {recap ? (
        <MarkdownAnswer content={recap} className="mt-2 max-w-none text-sm leading-relaxed text-foreground/85 [&_p]:my-0" />
      ) : (
        <p className="mt-2 text-sm leading-relaxed text-foreground/85">这段对话暂时还没有可回顾的 AI 回答。</p>
      )}
      <button
        type="button"
        onClick={onToggleTranscript}
        className="mt-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        {showTranscript ? '收起完整对话' : '查看完整对话'}
      </button>
      {showTranscript && <MessageList messages={visibleMessages} />}
    </div>
  )
}

function MessageList({ messages }: { messages: ConversationMessageItem[] }) {
  return (
    <ol className="mt-4 grid gap-4 border-t border-border/70 pt-4">
      {messages.map((message) => (
        <li key={message.id} className="grid grid-cols-[3rem_minmax(0,1fr)] gap-3 text-sm leading-relaxed">
          <span className="text-xs text-muted-foreground">{message.role === 'user' ? '你' : '紫微'}</span>
          {message.role === 'assistant' ? (
            <MarkdownAnswer content={message.content} className="max-w-none text-sm leading-relaxed text-foreground/90" />
          ) : (
            <p className="whitespace-pre-wrap text-foreground/90">{message.content}</p>
          )}
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
