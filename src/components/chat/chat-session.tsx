'use client'

/**
 * [INPUT]: Depends on WorkspaceProvider's real chat transport/session and the pure reference presentation adapter
 * [OUTPUT]: Provides the reference ChatProvider/useChatSession API backed by real messages, retry, reset, and request state
 * [POS]: Compatibility boundary that keeps the transplanted chat UI unchanged while reconnecting the existing backend
 * [PROTOCOL]: Update this header when changed, then check AGENTS.md
 */

import { createContext, useContext } from 'react'
import { useWorkspace } from '@/components/workspace/workspace-provider'
import type { EvidenceState } from '@/lib/ui/chat-evidence'
import type { ModelSettingsDraft } from '@/lib/ui/model-settings'
import {
  referenceChatMessages,
  referenceChatPhase,
  referenceChatThinking,
  type ReferenceChatMessage,
} from '@/lib/ui/reference-chat'

export type ChatRole = 'user' | 'assistant'
export type ChatMessage = ReferenceChatMessage

type ChatSession = {
  phase: 'idle' | 'active'
  messages: ChatMessage[]
  thinking: boolean
  busy: boolean
  evidence: EvidenceState
  modelSettings: ModelSettingsDraft
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
    selectedEvidence,
    modelSettings,
  } = useWorkspace()

  const value: ChatSession = {
    phase: referenceChatPhase(chatSession),
    messages: referenceChatMessages(chatSession),
    thinking: referenceChatThinking(chatSession),
    busy: chatSession.activeRequestId !== null,
    evidence: selectedEvidence,
    modelSettings,
    send: (text) => void sendMessage(text),
    retry: () => void retryLastMessage(),
    reset: resetChat,
  }

  return <ChatSessionContext.Provider value={value}>{children}</ChatSessionContext.Provider>
}
