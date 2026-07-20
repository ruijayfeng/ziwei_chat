/**
 * [INPUT]: Depends on completed browser chat-session messages and localStorage values
 * [OUTPUT]: Provides profile-scoped, validated local conversation archive helpers
 * [POS]: Browser fallback for conversation continuity when durable persistence is unavailable
 * [PROTOCOL]: Update this header when changed, then check AGENTS.md
 */

import type { ChatSessionMessage } from "./chat-session";

const maxLocalConversations = 20;

export type LocalConversationMessage = Pick<ChatSessionMessage, "id" | "role" | "content">;

export type LocalConversation = {
  conversationId: string;
  updatedAt: string;
  messages: LocalConversationMessage[];
};

export function localConversationArchiveStorageKey(profileId: string) {
  return `ziwei-chat-conversations:${profileId}`;
}

export function updateLocalConversationArchive(
  archive: LocalConversation[],
  conversationId: string,
  messages: ChatSessionMessage[],
  updatedAt: string,
) {
  const completeMessages = messages
    .filter((message) => (message.role === "user" || message.role === "assistant") && message.status === "complete" && message.content.trim())
    .map(({ id, role, content }) => ({ id, role, content }));
  const withoutCurrent = archive.filter((conversation) => conversation.conversationId !== conversationId);
  if (!conversationId || completeMessages.length === 0) return withoutCurrent;

  return [{ conversationId, updatedAt, messages: completeMessages }, ...withoutCurrent].slice(0, maxLocalConversations);
}

export function localConversationArchiveValue(archive: LocalConversation[]) {
  return JSON.stringify({ conversations: archive });
}

export function localConversationArchiveFromStorage(value: string | null): LocalConversation[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!isRecord(parsed) || !Array.isArray(parsed.conversations)) return [];
    const conversations = parsed.conversations.map(parseConversation);
    if (conversations.some((conversation) => conversation === null)) return [];
    return conversations.filter(isConversation).slice(0, maxLocalConversations);
  } catch {
    return [];
  }
}

function parseConversation(value: unknown): LocalConversation | null {
  if (!isRecord(value) || typeof value.conversationId !== "string" || !value.conversationId || typeof value.updatedAt !== "string" || !Array.isArray(value.messages)) return null;
  const messages = value.messages.map(parseMessage);
  if (messages.some((message) => message === null) || messages.length === 0) return null;
  return { conversationId: value.conversationId, updatedAt: value.updatedAt, messages: messages.filter(isMessage) };
}

function parseMessage(value: unknown): LocalConversationMessage | null {
  if (!isRecord(value) || typeof value.id !== "string" || typeof value.content !== "string" || !value.content.trim()) return null;
  if (value.role !== "user" && value.role !== "assistant") return null;
  return { id: value.id, role: value.role, content: value.content };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isConversation(value: LocalConversation | null): value is LocalConversation {
  return value !== null;
}

function isMessage(value: LocalConversationMessage | null): value is LocalConversationMessage {
  return value !== null;
}
