'use client'

/**
 * [INPUT]: Depends on WorkspaceProvider's real chat transport/session and the pure reference presentation adapter
 * [OUTPUT]: Provides the reference ChatProvider/useChatSession API backed by real messages, retry, reset, and request state
 * [POS]: Compatibility boundary that keeps the transplanted chat UI unchanged while reconnecting the existing backend
 * [PROTOCOL]: Update this header when changed, then check AGENTS.md
 */

import { createContext, useContext } from 'react'
import { useWorkspace } from '@/components/workspace/workspace-provider'
import {
  referenceChatMessages,
  referenceChatPhase,
  referenceChatThinking,
  type ReferenceChatMessage,
} from '@/lib/ui/reference-chat'

export type ChatRole = 'user' | 'assistant'
export type ChatMessage = ReferenceChatMessage

export type AnalysisRef = {
  palace: string
  star: string
  note: string
}

type ChatSession = {
  phase: 'idle' | 'active'
  messages: ChatMessage[]
  thinking: boolean
  busy: boolean
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

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const {
    chatSession,
    sendMessage,
    retryLastMessage,
    resetChat,
  } = useWorkspace()

  const value: ChatSession = {
    phase: referenceChatPhase(chatSession),
    messages: referenceChatMessages(chatSession),
    thinking: referenceChatThinking(chatSession),
    busy: chatSession.activeRequestId !== null,
    refs: [],
    send: (text) => void sendMessage(text),
    retry: () => void retryLastMessage(),
    reset: resetChat,
  }

  return <ChatSessionContext.Provider value={value}>{children}</ChatSessionContext.Provider>
}
