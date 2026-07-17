/**
 * [INPUT]: Depends on strict insight source contracts and the existing deterministic intent router
 * [OUTPUT]: Provides bounded source aggregation, eligibility, provenance candidates, and SHA-256 fingerprints
 * [POS]: Pure interpretation-free source preparation boundary before insight generation
 * [PROTOCOL]: Update this header when changed, then check AGENTS.md
 */

import { routeIntent } from "../agent/intent-router";
import {
  parseInsightSourceBundle,
  type InsightAggregation,
  type InsightSourceBundle,
  type InsightSourceConversation,
  type InsightSourceMessage,
  type InsightTopic,
} from "./contracts";

const MAX_CONVERSATIONS = 20;
const MAX_MESSAGES = 200;
const MAX_CHARACTERS = 60_000;
const candidateExcerptLength = 600;
const supportedTopics = ["career", "relationship", "wealth", "personality", "recent_fortune"] as const;

export async function aggregateInsightSources(value: unknown): Promise<InsightAggregation> {
  const parsed = parseInsightSourceBundle(value);
  const sources = truncateSources(parsed);
  const messages = sources.conversations.flatMap((conversation) =>
    conversation.messages.map((message) => ({ conversation, message })),
  );
  const validDates = messages
    .map(({ message }) => validDate(message.createdAt))
    .filter((date): date is Date => date !== null);
  const topicCounts = emptyTopicCounts();
  const candidates = messages
    .filter(({ message }) => message.role === "user")
    .map(({ conversation, message }) => {
      const routed = routeIntent(message.content).intent;
      const topic = isInsightTopic(routed) ? routed : null;
      if (topic) topicCounts[topic] += 1;
      return {
        sourceId: `${conversation.id}:${message.id}`,
        conversationId: conversation.id,
        messageId: message.id,
        excerpt: Array.from(message.content).slice(0, candidateExcerptLength).join(""),
        createdAt: message.createdAt,
        topic,
      };
    });
  const canonical = JSON.stringify(sources);

  return {
    sources,
    sourceWindow: validDates.length === 0 ? null : {
      from: new Date(Math.min(...validDates.map(Number))).toISOString(),
      to: new Date(Math.max(...validDates.map(Number))).toISOString(),
    },
    conversationCount: sources.conversations.length,
    userMessageCount: candidates.length,
    activityDays: [...new Set(validDates.map(shanghaiCalendarDay))].sort(),
    topicCounts,
    candidates,
    sourceFingerprint: await sha256(canonical),
  };
}

export function insightEligibility(aggregation: InsightAggregation) {
  const result = {
    conversationCount: aggregation.conversationCount,
    userMessageCount: aggregation.userMessageCount,
    activityDayCount: aggregation.activityDays.length,
  };
  return {
    eligible: result.conversationCount >= 2 && result.userMessageCount >= 3 && result.activityDayCount >= 2,
    ...result,
  };
}

function truncateSources(bundle: InsightSourceBundle): InsightSourceBundle {
  const orderedConversations = [...bundle.conversations]
    .sort(compareConversations)
    .slice(0, MAX_CONVERSATIONS);
  const orderedMessages = orderedConversations
    .flatMap((conversation) => conversation.messages.map((message) => ({ conversationId: conversation.id, message })))
    .sort(compareSourcedMessages);
  const selectedMessages = new Map<string, InsightSourceMessage[]>();
  let messageCount = 0;
  let characterCount = 0;

  for (const { conversationId, message } of orderedMessages) {
    if (messageCount >= MAX_MESSAGES || characterCount >= MAX_CHARACTERS) break;
    const remaining = MAX_CHARACTERS - characterCount;
    const content = Array.from(message.content).slice(0, remaining).join("");
    if (!content) break;
    const messages = selectedMessages.get(conversationId) ?? [];
    messages.push({ ...message, content });
    selectedMessages.set(conversationId, messages);
    messageCount += 1;
    characterCount += Array.from(content).length;
  }

  return {
    conversations: orderedConversations.flatMap((conversation) => {
      const messages = selectedMessages.get(conversation.id);
      return messages ? [{ ...conversation, messages }] : [];
    }),
  };
}

function compareConversations(left: InsightSourceConversation, right: InsightSourceConversation) {
  const timeDifference = effectiveConversationTime(right) - effectiveConversationTime(left);
  return timeDifference || compareIds(left.id, right.id);
}

function effectiveConversationTime(conversation: InsightSourceConversation) {
  const timestamps = [timestamp(conversation.updatedAt), ...conversation.messages.map((message) => timestamp(message.createdAt))];
  return Math.max(...timestamps);
}

function compareSourcedMessages(
  left: { conversationId: string; message: InsightSourceMessage },
  right: { conversationId: string; message: InsightSourceMessage },
) {
  const timeDifference = timestamp(right.message.createdAt) - timestamp(left.message.createdAt);
  return timeDifference || compareIds(left.conversationId, right.conversationId) || compareIds(left.message.id, right.message.id);
}

function compareIds(left: string, right: string) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function timestamp(value: string) {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : Number.NEGATIVE_INFINITY;
}

function validDate(value: string) {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? new Date(parsed) : null;
}

function shanghaiCalendarDay(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

function emptyTopicCounts(): Record<InsightTopic, number> {
  return { career: 0, relationship: 0, wealth: 0, personality: 0, recent_fortune: 0 };
}

function isInsightTopic(value: string): value is InsightTopic {
  return (supportedTopics as readonly string[]).includes(value);
}

async function sha256(value: string) {
  const digest = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
