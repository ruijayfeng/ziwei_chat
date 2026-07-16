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
): Promise<{ conversations: ConversationListItem[]; unavailable: boolean }> {
  const response = await fetchImpl(`/api/conversations?profileId=${encodeURIComponent(profileId)}`);
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
) {
  const response = await fetchImpl(`/api/conversations?profileId=${encodeURIComponent(profileId)}&conversationId=${encodeURIComponent(conversationId)}`);
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

const TIMELINE_KIND_KEYWORDS: Record<Exclude<ConversationTimelineKind, "conversation">, string[]> = {
  career: ["\u4e8b\u4e1a", "\u5de5\u4f5c", "\u804c\u573a", "\u5b98\u7984"],
  relationship: ["\u611f\u60c5", "\u7231\u60c5", "\u604b\u7231", "\u5a5a\u59fb", "\u4f34\u4fa3", "\u5173\u7cfb"],
  wealth: ["\u8d22\u8fd0", "\u8d22\u5bcc", "\u6536\u5165", "\u8d5a\u94b1", "\u6295\u8d44", "\u91d1\u94b1"],
  personality: ["\u6027\u683c", "\u4e2a\u6027", "\u7279\u8d28", "\u4e3a\u4eba"],
  recent_fortune: ["\u8fd0\u52bf", "\u6700\u8fd1", "\u8fd1\u671f", "\u6d41\u5e74", "\u672c\u6708", "\u4eca\u5e74"],
};

function readConversations(value: unknown): ConversationListItem[] {
  if (!isRecord(value) || !Array.isArray(value.conversations)) return [];
  return value.conversations.map((item) => {
    if (!isRecord(item) || typeof item.id !== "string" || typeof item.title !== "string") return null;
    return { id: item.id, title: item.title, lastMessageAt: typeof item.lastMessageAt === "string" ? item.lastMessageAt : "" };
  }).filter(isConversation);
}

function readMessages(value: unknown): ConversationMessageItem[] {
  if (!isRecord(value) || !Array.isArray(value.messages)) return [];
  return value.messages.map((item) => {
    if (!isRecord(item) || typeof item.id !== "string" || typeof item.conversationId !== "string" || !isRole(item.role) || typeof item.content !== "string") return null;
    return { id: item.id, conversationId: item.conversationId, role: item.role, content: item.content, createdAt: typeof item.createdAt === "string" ? item.createdAt : "" };
  }).filter(isMessage);
}

function isRole(value: unknown): value is ConversationMessageItem["role"] { return value === "user" || value === "assistant" || value === "system" || value === "tool"; }
function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null; }
function isConversation(value: ConversationListItem | null): value is ConversationListItem { return value !== null; }
function isMessage(value: ConversationMessageItem | null): value is ConversationMessageItem { return value !== null; }
