/**
 * [INPUT]: Depends on sanitized /api/conversations payloads and current browser chat messages
 * [OUTPUT]: Provides bounded, validated insight source bundle loading with browser-session merging
 * [POS]: Browser privacy boundary between conversation records and deterministic insight aggregation
 * [PROTOCOL]: Update this header when changed, then check AGENTS.md
 */

import type { InsightSourceBundle, InsightSourceConversation, InsightSourceMessage } from "../insights/contracts";
import type { ChatSessionMessage } from "./chat-session";

type FetchImplementation = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export type CurrentInsightSession = {
  conversationId: string;
  messages: ChatSessionMessage[];
};

const MAX_CONVERSATIONS = 20;
const DETAIL_CONCURRENCY = 4;
const invalidResponseMessage = "Invalid insight source response";
const listEnvelopeKeys = ["conversations"];
const detailEnvelopeKeys = ["messages"];
const summaryKeys = ["id", "title", "lastMessageAt"];
const messageKeys = ["id", "conversationId", "role", "content", "createdAt"];

export async function loadInsightSourceBundle(
  profileId: string,
  currentSession: CurrentInsightSession | null,
  fetchImpl: FetchImplementation = fetch,
  signal?: AbortSignal,
): Promise<InsightSourceBundle> {
  const summaries = await loadSummaries(profileId, fetchImpl, signal);
  if (summaries === null) return currentSessionBundle(currentSession);

  const conversations = await mapWithConcurrency(
    summaries.slice(0, MAX_CONVERSATIONS),
    DETAIL_CONCURRENCY,
    (summary) => loadConversation(profileId, summary, fetchImpl, signal),
  );
  return mergeCurrentSession(conversations, currentSession);
}

async function loadSummaries(profileId: string, fetchImpl: FetchImplementation, signal?: AbortSignal) {
  const response = await fetchImpl(`/api/conversations?profileId=${encodeURIComponent(profileId)}`, { signal });
  if (response.status === 503) return null;
  if (!response.ok) throw new Error("Insight conversation list request failed");
  const payload = await response.json() as unknown;
  if (!hasExactKeys(payload, listEnvelopeKeys) || !Array.isArray(payload.conversations)) invalidResponse();

  const summaries = payload.conversations.map((value) => {
    if (!hasExactKeys(value, summaryKeys) || !isString(value.id) || !isString(value.title) || !isString(value.lastMessageAt)) invalidResponse();
    const id = normalizeSourceId(value.id);
    return { id, title: value.title.trim(), updatedAt: normalizeTimestamp(value.lastMessageAt) };
  });
  if (new Set(summaries.map((summary) => summary.id)).size !== summaries.length) invalidResponse();
  return summaries;
}

async function loadConversation(
  profileId: string,
  summary: { id: string; title: string; updatedAt: string },
  fetchImpl: FetchImplementation,
  signal?: AbortSignal,
): Promise<InsightSourceConversation> {
  const response = await fetchImpl(
    `/api/conversations?profileId=${encodeURIComponent(profileId)}&conversationId=${encodeURIComponent(summary.id)}`,
    { signal },
  );
  if (!response.ok) throw new Error("Insight conversation detail request failed");
  const payload = await response.json() as unknown;
  if (!hasExactKeys(payload, detailEnvelopeKeys) || !Array.isArray(payload.messages)) invalidResponse();

  const messages = payload.messages.map((value) => {
    if (
      !hasExactKeys(value, messageKeys)
      || !isString(value.id)
      || !isString(value.conversationId)
      || normalizeSourceId(value.conversationId) !== summary.id
      || !isConversationRole(value.role)
      || !isString(value.content)
      || !isString(value.createdAt)
    ) invalidResponse();
    return {
      id: normalizeSourceId(value.id),
      role: value.role,
      content: value.content.trim(),
      createdAt: normalizeTimestamp(value.createdAt),
    };
  });
  if (new Set(messages.map((message) => message.id)).size !== messages.length) invalidResponse();
  return {
    id: summary.id,
    title: summary.title,
    updatedAt: summary.updatedAt,
    messages: messages.filter(isVisibleSourceMessage),
  };
}

function currentSessionBundle(currentSession: CurrentInsightSession | null): InsightSourceBundle {
  const conversation = currentSessionConversation(currentSession);
  return { conversations: conversation ? [conversation] : [] };
}

function mergeCurrentSession(
  persisted: InsightSourceConversation[],
  currentSession: CurrentInsightSession | null,
): InsightSourceBundle {
  const current = currentSessionConversation(currentSession);
  if (!current) return { conversations: persisted };
  return {
    conversations: [current, ...persisted.filter((conversation) => conversation.id !== current.id)]
      .slice(0, MAX_CONVERSATIONS),
  };
}

function currentSessionConversation(currentSession: CurrentInsightSession | null): InsightSourceConversation | null {
  if (!currentSession?.conversationId.trim()) return null;
  const conversationId = normalizeSourceId(currentSession.conversationId);
  const messages = currentSession.messages
    .filter((message): message is ChatSessionMessage & { role: "user" | "assistant" } =>
      (message.role === "user" || message.role === "assistant") && Boolean(message.content.trim()),
    )
    .map((message): InsightSourceMessage => ({
      id: normalizeSourceId(message.id),
      role: message.role,
      content: message.content.trim(),
      createdAt: "",
    }));
  if (!messages.length) return null;
  return {
    id: conversationId,
    title: messages.find((message) => message.role === "user")?.content.slice(0, 60) || "Current conversation",
    updatedAt: "",
    messages: deduplicateMessages(messages),
  };
}

async function mapWithConcurrency<T, R>(values: T[], concurrency: number, mapper: (value: T) => Promise<R>) {
  const results: R[] = new Array(values.length);
  let nextIndex = 0;
  const worker = async () => {
    while (nextIndex < values.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await mapper(values[index]!);
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, values.length) }, worker));
  return results;
}

function deduplicateMessages(messages: InsightSourceMessage[]) {
  const seen = new Set<string>();
  return messages.filter((message) => !seen.has(message.id) && (seen.add(message.id), true));
}

function normalizeSourceId(value: string) {
  const id = value.trim();
  if (!id || id.includes(":")) invalidResponse();
  return id;
}

function normalizeTimestamp(value: string) {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : "";
}

function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null && !Array.isArray(value); }
function hasExactKeys(value: unknown, expected: string[]): value is Record<string, unknown> {
  if (!isRecord(value)) return false;
  const actual = Object.keys(value).sort();
  const sortedExpected = [...expected].sort();
  return actual.length === sortedExpected.length && actual.every((key, index) => key === sortedExpected[index]);
}
function isString(value: unknown): value is string { return typeof value === "string"; }
function isConversationRole(value: unknown): value is "user" | "assistant" | "system" | "tool" {
  return value === "user" || value === "assistant" || value === "system" || value === "tool";
}
function isVisibleSourceMessage(
  value: { id: string; role: "user" | "assistant" | "system" | "tool"; content: string; createdAt: string },
): value is InsightSourceMessage {
  return (value.role === "user" || value.role === "assistant") && Boolean(value.content);
}
function invalidResponse(): never { throw new Error(invalidResponseMessage); }
