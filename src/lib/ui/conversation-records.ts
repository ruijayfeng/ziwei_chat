/**
 * [INPUT]: Depends on sanitized /api/conversations payloads and current browser chat messages
 * [OUTPUT]: Provides validated persisted/current-session records for the records route
 * [POS]: Honest UI adapter that falls back to the live browser session when persistence is unavailable
 * [PROTOCOL]: Update this header when changed, then check AGENTS.md
 */

import type { ChatSessionMessage } from "./chat-session";

type FetchImplementation = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export type ConversationListItem = {
  id: string;
  title: string;
  lastMessageAt: string;
};

export type ConversationMessageItem = {
  id: string;
  conversationId: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  createdAt: string;
};

export const conversationDetailLoadErrorMessage = "\u5bf9\u8bdd\u5185\u5bb9\u8bfb\u53d6\u5931\u8d25\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5\u3002";
export const conversationListInvalidResponseMessage = "\u5bf9\u8bdd\u8bb0\u5f55\u54cd\u5e94\u683c\u5f0f\u65e0\u6548\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5\u3002";
export const conversationDetailInvalidResponseMessage = "\u5bf9\u8bdd\u5185\u5bb9\u54cd\u5e94\u683c\u5f0f\u65e0\u6548\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5\u3002";

export type ConversationDetailState =
  | { phase: "idle"; messages?: ConversationMessageItem[] }
  | { phase: "loading"; messages?: ConversationMessageItem[] }
  | { phase: "ready"; messages: ConversationMessageItem[] }
  | { phase: "error"; message: string; messages?: ConversationMessageItem[] };

export type ConversationRecordsState = {
  profileId: string;
  conversations: ConversationListItem[];
  details: Record<string, ConversationDetailState>;
  selectedId: string | null;
};

export type ConversationRecordsAction =
  | { type: "reset"; profileId: string }
  | { type: "conversations_loaded"; profileId: string; conversations: ConversationListItem[] }
  | { type: "select"; profileId: string; conversationId: string }
  | { type: "detail_loading"; profileId: string; conversationId: string }
  | { type: "detail_resolved"; profileId: string; conversationId: string; messages: ConversationMessageItem[] }
  | { type: "detail_failed"; profileId: string; conversationId: string }
  | { type: "detail_retry"; profileId: string; conversationId: string };

export type ConversationDetailView =
  | { phase: "loading" }
  | { phase: "empty" }
  | { phase: "ready"; messages: ConversationMessageItem[] }
  | { phase: "error"; message: string; messages: ConversationMessageItem[] };

export function conversationDetailView(detail: ConversationDetailState | undefined): ConversationDetailView {
  if (!detail || detail.phase === "idle" || detail.phase === "loading") return { phase: "loading" };
  if (detail.phase === "error") {
    return { phase: "error", message: detail.message, messages: detail.messages ?? [] };
  }
  if (detail.messages.length === 0) return { phase: "empty" };
  return { phase: "ready", messages: detail.messages };
}

export function nextConversationRequest(previous: AbortController | null) {
  previous?.abort();
  return new AbortController();
}

export function createConversationRecordsState(profileId: string): ConversationRecordsState {
  return { profileId, conversations: [], details: {}, selectedId: null };
}

export function conversationRecordsReducer(
  state: ConversationRecordsState,
  action: ConversationRecordsAction,
): ConversationRecordsState {
  if (action.type === "reset") return createConversationRecordsState(action.profileId);
  if (action.profileId !== state.profileId) return state;
  if (action.type === "conversations_loaded") return { ...state, conversations: action.conversations };
  if (action.type === "select") return { ...state, selectedId: action.conversationId };

  const detail = state.details[action.conversationId];
  if (action.type === "detail_loading") return withDetail(state, action.conversationId, { phase: "loading", messages: detail?.messages });
  if (action.type === "detail_resolved") return withDetail(state, action.conversationId, { phase: "ready", messages: action.messages });
  if (action.type === "detail_failed") {
    return withDetail(state, action.conversationId, {
      phase: "error",
      message: conversationDetailLoadErrorMessage,
      messages: detail?.messages,
    });
  }
  return withDetail(state, action.conversationId, { phase: "idle", messages: detail?.messages });
}

export type ConversationTimelineKind =
  | "career"
  | "relationship"
  | "wealth"
  | "personality"
  | "recent_fortune"
  | "conversation";

export type ConversationTimelineItem = {
  id: string;
  title: string;
  kind: ConversationTimelineKind;
  preview: string;
  lastMessageAt: string;
  messages: ConversationMessageItem[];
};

export async function loadConversationList(
  profileId: string,
  fetchImpl: FetchImplementation = fetch,
  signal?: AbortSignal,
): Promise<{ conversations: ConversationListItem[]; unavailable: boolean }> {
  const response = await fetchImpl(`/api/conversations?profileId=${encodeURIComponent(profileId)}`, { signal });
  if (response.status === 503) return { conversations: [], unavailable: true };
  if (!response.ok) throw new Error("历史记录读取失败，请稍后重试。");
  const payload = await response.json() as unknown;
  return {
    conversations: readConversations(payload),
    unavailable: false,
  };
}

export async function loadConversationMessages(
  profileId: string,
  conversationId: string,
  fetchImpl: FetchImplementation = fetch,
  signal?: AbortSignal,
) {
  const response = await fetchImpl(`/api/conversations?profileId=${encodeURIComponent(profileId)}&conversationId=${encodeURIComponent(conversationId)}`, { signal });
  if (!response.ok) throw new Error("对话内容读取失败，请稍后重试。");
  return readMessages(await response.json() as unknown);
}

export function currentSessionConversation(conversationId: string, messages: ChatSessionMessage[]) {
  const visible = messages
    .filter((message) => (message.role === "user" || message.role === "assistant") && message.content.trim())
    .map((message): ConversationMessageItem => ({
      id: message.id,
      conversationId,
      role: message.role,
      content: message.content,
      createdAt: "",
    }));
  if (!conversationId || visible.length === 0) return null;
  const firstUser = visible.find((message) => message.role === "user");
  return {
    conversation: {
      id: conversationId,
      title: firstUser?.content.slice(0, 60) || "当前对话",
      lastMessageAt: "",
    } satisfies ConversationListItem,
    messages: visible,
  };
}

export function conversationTimelineItem(
  conversation: ConversationListItem,
  messages: ConversationMessageItem[],
): ConversationTimelineItem {
  const visible = messages.filter((message) =>
    (message.role === "user" || message.role === "assistant") && message.content.trim(),
  );
  const firstUser = visible.find((message) => message.role === "user")?.content ?? "";
  const latestAssistant = [...visible].reverse().find((message) => message.role === "assistant");
  const latestVisible = visible.at(-1);

  return {
    id: conversation.id,
    title: conversation.title.trim() || firstUser.slice(0, 60) || "\u672a\u547d\u540d\u5bf9\u8bdd",
    kind: inferTimelineKind(firstUser),
    preview: (latestAssistant ?? latestVisible)?.content.slice(0, 160) ?? "",
    lastMessageAt: conversation.lastMessageAt,
    messages: visible,
  };
}

function inferTimelineKind(prompt: string): ConversationTimelineKind {
  for (const [kind, keywords] of Object.entries(TIMELINE_KIND_KEYWORDS) as [ConversationTimelineKind, string[]][]) {
    if (keywords.some((keyword) => prompt.includes(keyword))) return kind;
  }
  return "conversation";
}

function withDetail(
  state: ConversationRecordsState,
  conversationId: string,
  detail: ConversationDetailState,
): ConversationRecordsState {
  return { ...state, details: { ...state.details, [conversationId]: detail } };
}

const TIMELINE_KIND_KEYWORDS: Record<Exclude<ConversationTimelineKind, "conversation">, string[]> = {
  career: ["\u4e8b\u4e1a", "\u5de5\u4f5c", "\u804c\u573a", "\u5b98\u7984"],
  relationship: ["\u611f\u60c5", "\u7231\u60c5", "\u604b\u7231", "\u5a5a\u59fb", "\u4f34\u4fa3", "\u5173\u7cfb"],
  wealth: ["\u8d22\u8fd0", "\u8d22\u5bcc", "\u6536\u5165", "\u8d5a\u94b1", "\u6295\u8d44", "\u91d1\u94b1"],
  personality: ["\u6027\u683c", "\u4e2a\u6027", "\u7279\u8d28", "\u4e3a\u4eba"],
  recent_fortune: ["\u8fd0\u52bf", "\u6700\u8fd1", "\u8fd1\u671f", "\u6d41\u5e74", "\u672c\u6708", "\u4eca\u5e74"],
};

function readConversations(value: unknown): ConversationListItem[] {
  if (!isRecord(value) || !Array.isArray(value.conversations)) throw new Error(conversationListInvalidResponseMessage);
  const conversations = value.conversations.map((item) => {
    if (!isRecord(item) || typeof item.id !== "string" || typeof item.title !== "string") return null;
    return { id: item.id, title: item.title, lastMessageAt: typeof item.lastMessageAt === "string" ? item.lastMessageAt : "" };
  });
  if (conversations.some((item) => item === null)) throw new Error(conversationListInvalidResponseMessage);
  return conversations.filter(isConversation);
}

function readMessages(value: unknown): ConversationMessageItem[] {
  if (!isRecord(value) || !Array.isArray(value.messages)) throw new Error(conversationDetailInvalidResponseMessage);
  const parsed = value.messages.map((item) => {
    if (!isRecord(item) || typeof item.id !== "string" || typeof item.conversationId !== "string" || !isRole(item.role) || typeof item.content !== "string") return null;
    return { id: item.id, conversationId: item.conversationId, role: item.role, content: item.content, createdAt: typeof item.createdAt === "string" ? item.createdAt : "" };
  });
  if (parsed.some((item) => item === null)) throw new Error(conversationDetailInvalidResponseMessage);
  return parsed.filter(isMessage);
}

function isRole(value: unknown): value is ConversationMessageItem["role"] { return value === "user" || value === "assistant" || value === "system" || value === "tool"; }
function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null; }
function isConversation(value: ConversationListItem | null): value is ConversationListItem { return value !== null; }
function isMessage(value: ConversationMessageItem | null): value is ConversationMessageItem { return value !== null; }
