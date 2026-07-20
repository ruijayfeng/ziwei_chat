/**
 * [INPUT]: Depends on the real chat session state owned by WorkspaceProvider
 * [OUTPUT]: Provides the compact message, phase, and thinking model consumed by the reference chat UI
 * [POS]: Pure adapter between the existing transport/session boundary and the transplanted presentation components
 * [PROTOCOL]: Update this header when changed, then check AGENTS.md
 */

import type { ChatSessionMessage, ChatSessionState } from "./chat-session";

export type ReferenceChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  streaming: boolean;
  failed: boolean;
};

export function referenceChatPhase(state: ChatSessionState) {
  return state.messages.some((message) => message.role === "user")
    ? ("active" as const)
    : ("idle" as const);
}

export function referenceChatThinking(state: ChatSessionState) {
  return state.messages.some(
    (message) => message.role === "assistant" && message.status === "thinking",
  );
}

export function referenceChatMessages(state: ChatSessionState): ReferenceChatMessage[] {
  return state.messages
    .filter(
      (message): message is ChatSessionMessage & { role: "user" | "assistant" } =>
        message.role === "user" || message.role === "assistant",
    )
    .filter((message) => !(message.role === "assistant" && message.status === "thinking"))
    .map((message) => ({
      id: message.id,
      role: message.role,
      content:
        message.status === "failed"
          ? message.error?.message || "分析没有完成，请重试。"
          : message.content,
      streaming: message.status === "streaming",
      failed: message.status === "failed",
    }));
}
