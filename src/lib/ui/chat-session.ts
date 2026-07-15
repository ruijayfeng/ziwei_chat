/**
 * [INPUT]: Depends on chat request messages, normalized evidence, and classified UI errors
 * [OUTPUT]: Provides immutable per-message chat state and a one-request-at-a-time reducer
 * [POS]: Framework-light state machine between the chat transport and redesigned chat components
 * [PROTOCOL]: Update this header when changed, then check AGENTS.md
 */

import type { ChatRequestMessage } from "./chat-contract";
import { initialEvidence, type EvidenceState } from "./chat-evidence";
import { emptyAssistantResponseError, type ChatErrorState } from "./chat-errors";

export type ChatSessionMessage = ChatRequestMessage & {
  id: string;
  status: "thinking" | "streaming" | "complete" | "failed";
  evidence: EvidenceState;
  evidenceRunId?: string;
  error?: ChatErrorState;
};

export type ChatSessionState = {
  messages: ChatSessionMessage[];
  activeRequestId: string | null;
  activeContent: string | null;
  lastFailedContent: string | null;
  error: ChatErrorState | null;
};

export type ChatSessionAction =
  | {
      type: "turn_started";
      requestId: string;
      content: string;
      evidenceRunId: string;
      userMessageId: string;
      assistantMessageId: string;
    }
  | { type: "evidence_received"; requestId: string; evidence: EvidenceState }
  | { type: "token_received"; requestId: string; token: string }
  | { type: "turn_completed"; requestId: string }
  | { type: "turn_failed"; requestId: string; error: ChatErrorState }
  | { type: "session_reset" };

export const initialChatSessionState: ChatSessionState = {
  messages: [],
  activeRequestId: null,
  activeContent: null,
  lastFailedContent: null,
  error: null,
};

export function chatSessionReducer(
  state: ChatSessionState,
  action: ChatSessionAction,
): ChatSessionState {
  if (action.type === "session_reset") return initialChatSessionState;
  if (action.type === "turn_started") return startTurn(state, action);
  if (state.activeRequestId !== action.requestId) return state;

  if (action.type === "evidence_received") {
    return updateActiveAssistant(state, (message) => ({ ...message, evidence: action.evidence }));
  }
  if (action.type === "token_received") {
    return updateActiveAssistant(state, (message) => ({
      ...message,
      content: message.content + action.token,
      status: "streaming",
    }));
  }
  if (action.type === "turn_failed") return failTurn(state, action.error);

  const assistant = activeAssistant(state);
  if (!assistant?.content.trim()) return failTurn(state, emptyAssistantResponseError());
  return {
    ...updateActiveAssistant(state, (message) => ({ ...message, status: "complete" })),
    activeRequestId: null,
    activeContent: null,
    lastFailedContent: null,
    error: null,
  };
}

export function chatRequestMessages(state: ChatSessionState): ChatRequestMessage[] {
  return state.messages
    .filter((message) => message.role === "user" || message.status === "complete")
    .filter((message) => message.content.trim().length > 0)
    .map(({ role, content }) => ({ role, content }));
}

function startTurn(
  state: ChatSessionState,
  action: Extract<ChatSessionAction, { type: "turn_started" }>,
): ChatSessionState {
  if (state.activeRequestId || !action.content.trim()) return state;
  const isRetry = state.lastFailedContent === action.content;
  const userMessage: ChatSessionMessage = {
    id: action.userMessageId,
    role: "user",
    content: action.content,
    status: "complete",
    evidence: initialEvidence,
  };
  const assistantMessage: ChatSessionMessage = {
    id: action.assistantMessageId,
    role: "assistant",
    content: "",
    status: "thinking",
    evidence: initialEvidence,
    evidenceRunId: action.evidenceRunId,
  };

  return {
    messages: [...state.messages, ...(isRetry ? [] : [userMessage]), assistantMessage],
    activeRequestId: action.requestId,
    activeContent: action.content,
    lastFailedContent: null,
    error: null,
  };
}

function failTurn(state: ChatSessionState, error: ChatErrorState): ChatSessionState {
  return {
    ...updateActiveAssistant(state, (message) => ({ ...message, status: "failed", error })),
    activeRequestId: null,
    activeContent: null,
    lastFailedContent: error.canRetry ? state.activeContent : null,
    error,
  };
}

function activeAssistant(state: ChatSessionState) {
  return [...state.messages]
    .reverse()
    .find((message) => message.role === "assistant" && message.status !== "complete" && message.status !== "failed");
}

function updateActiveAssistant(
  state: ChatSessionState,
  update: (message: ChatSessionMessage) => ChatSessionMessage,
): ChatSessionState {
  const active = activeAssistant(state);
  if (!active) return state;
  return {
    ...state,
    messages: state.messages.map((message) => (message.id === active.id ? update(message) : message)),
  };
}
