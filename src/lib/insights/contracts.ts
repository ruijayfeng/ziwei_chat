/**
 * [INPUT]: Depends on unknown conversation-history payloads
 * [OUTPUT]: Provides strict sourced-insight wire contracts, model candidate shape, and source parsers
 * [POS]: Privacy boundary for deterministic insight aggregation and generated reports
 * [PROTOCOL]: Update this header when changed, then check AGENTS.md
 */

export type InsightTopic = "career" | "relationship" | "wealth" | "personality" | "recent_fortune";

export type InsightSourceMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
};

export type InsightSourceConversation = {
  id: string;
  title: string;
  updatedAt: string;
  messages: InsightSourceMessage[];
};

export type InsightSourceBundle = {
  conversations: InsightSourceConversation[];
};

export type InsightCandidateExcerpt = {
  sourceId: string;
  conversationId: string;
  messageId: string;
  excerpt: string;
  createdAt: string;
  topic: InsightTopic | null;
};

export type InsightAggregation = {
  sources: InsightSourceBundle;
  sourceWindow: { from: string; to: string } | null;
  conversationCount: number;
  userMessageCount: number;
  activityDays: string[];
  topicCounts: Record<InsightTopic, number>;
  candidates: InsightCandidateExcerpt[];
  sourceFingerprint: string;
};

export type InsightReportCandidate = {
  weeklyLetter: {
    greeting: string;
    paragraphs: Array<{ text: string; sourceIds: string[] }>;
    signoff: string;
  };
  patterns: Array<{
    id: string;
    title: string;
    detail: string;
    topic: string;
    sourceIds: string[];
  }>;
};

export type InsightReport = {
  sourceWindow: { from: string; to: string };
  generatedAt: string;
  sourceFingerprint: string;
  weeklyLetter: {
    greeting: string;
    paragraphs: Array<{ text: string; sourceIds: string[] }>;
    signoff: string;
  };
  patterns: Array<{
    id: string;
    title: string;
    detail: string;
    topic: string;
    sourceIds: string[];
  }>;
  critic: { passed: true; issues: [] };
};

const invalidBundleMessage = "Invalid insight source bundle";
const bundleKeys = ["conversations"];
const conversationKeys = ["id", "title", "updatedAt", "messages"];
const messageKeys = ["id", "role", "content", "createdAt"];

export function parseInsightSourceBundle(value: unknown): InsightSourceBundle {
  if (!hasExactKeys(value, bundleKeys) || !Array.isArray(value.conversations)) fail();
  const conversations = value.conversations.map(parseConversation);
  assertUnique(conversations.map((conversation) => conversation.id));

  return { conversations };
}

function parseConversation(value: unknown): InsightSourceConversation {
  if (
    !hasExactKeys(value, conversationKeys) ||
    !isNonEmptyString(value.id) ||
    typeof value.title !== "string" ||
    typeof value.updatedAt !== "string" ||
    !Array.isArray(value.messages)
  ) fail();

  const id = normalizeId(value.id);
  const parsedMessages = value.messages.map(parseMessage);
  assertUnique(parsedMessages.map((message) => message.id));
  const messages = parsedMessages.filter(isVisibleMessage);
  return {
    id,
    title: value.title.trim(),
    updatedAt: normalizeTimestamp(value.updatedAt),
    messages,
  };
}

function parseMessage(value: unknown): InsightSourceMessage & { content: string } {
  if (
    !hasExactKeys(value, messageKeys) ||
    !isNonEmptyString(value.id) ||
    !isSourceRole(value.role) ||
    typeof value.content !== "string" ||
    typeof value.createdAt !== "string"
  ) fail();

  const message = {
    id: normalizeId(value.id),
    role: value.role,
    content: value.content.trim(),
    createdAt: normalizeTimestamp(value.createdAt),
  };
  return message;
}

function hasExactKeys(value: unknown, expected: string[]): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const actual = Object.keys(value).sort();
  return actual.length === expected.length && [...expected].sort().every((key, index) => actual[index] === key);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function normalizeId(value: string) {
  const id = value.trim();
  if (id.includes(":")) fail();
  return id;
}

function normalizeTimestamp(value: string) {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : "";
}

function isSourceRole(value: unknown): value is "user" | "assistant" {
  return value === "user" || value === "assistant";
}

function isVisibleMessage(value: InsightSourceMessage): value is InsightSourceMessage {
  return value.content.length > 0;
}

function assertUnique(values: string[]) {
  if (new Set(values).size !== values.length) fail();
}

function fail(): never {
  throw new Error(invalidBundleMessage);
}
