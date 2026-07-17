import { describe, expect, test } from "vitest";

import { parseInsightSourceBundle } from "../../src/lib/insights/contracts";
import { aggregateInsightSources, insightEligibility } from "../../src/lib/insights/source";

type MessageInput = {
  id: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  createdAt: string;
};

function conversation(
  id: string,
  updatedAt: string,
  messages: MessageInput[],
  title = `Conversation ${id}`,
) {
  return { id, title, updatedAt, messages };
}

describe("insight source contracts", () => {
  test("rejects malformed envelopes and the whole bundle when any item is malformed", () => {
    expect(() => parseInsightSourceBundle(null)).toThrow("Invalid insight source bundle");
    expect(() => parseInsightSourceBundle({ conversations: "nope" })).toThrow("Invalid insight source bundle");
    expect(() => parseInsightSourceBundle({ conversations: [], hidden: "secret" })).toThrow("Invalid insight source bundle");
    expect(() => parseInsightSourceBundle({
      conversations: [conversation("c1", "2026-07-16T00:00:00.000Z", [
        { id: "m1", role: "user", content: "valid", createdAt: "2026-07-16T00:00:00.000Z" },
        { id: "m2", role: "assistant", content: 42, createdAt: "2026-07-16T00:01:00.000Z" },
      ] as MessageInput[])],
    })).toThrow("Invalid insight source bundle");
    expect(() => parseInsightSourceBundle({
      conversations: [{
        id: "c1",
        title: "Conversation c1",
        updatedAt: "2026-07-16T00:00:00.000Z",
        messages: [{ id: "m1", role: "user", content: "valid", createdAt: "2026-07-16T00:00:00.000Z", hidden: true }],
      }],
    })).toThrow("Invalid insight source bundle");
  });

  test("rejects duplicate conversation ids and duplicate message ids within a conversation", () => {
    const message = { id: "m1", role: "user" as const, content: "valid", createdAt: "2026-07-16T00:00:00.000Z" };

    expect(() => parseInsightSourceBundle({
      conversations: [
        conversation("c1", "2026-07-16T00:00:00.000Z", [message]),
        conversation("c1", "2026-07-17T00:00:00.000Z", [{ ...message, id: "m2" }]),
      ],
    })).toThrow("Invalid insight source bundle");
    expect(() => parseInsightSourceBundle({
      conversations: [conversation("c1", "2026-07-16T00:00:00.000Z", [message, { ...message }])],
    })).toThrow("Invalid insight source bundle");

    expect(parseInsightSourceBundle({
      conversations: [
        conversation("c1", "2026-07-16T00:00:00.000Z", [message]),
        conversation("c2", "2026-07-17T00:00:00.000Z", [message]),
      ],
    }).conversations).toHaveLength(2);
  });

  test("rejects hidden-role injection instead of filtering it at the API boundary", () => {
    expect(() => parseInsightSourceBundle({
      conversations: [conversation("c1", "", [
        { id: "u1", role: "user", content: " question ", createdAt: "" },
        { id: "a1", role: "assistant", content: " answer ", createdAt: "" },
        { id: "s1", role: "system", content: "hidden", createdAt: "" },
      ])],
    })).toThrow("Invalid insight source bundle");
    expect(() => parseInsightSourceBundle({
      conversations: [conversation("c1", "", [
        { id: "t1", role: "tool", content: "hidden", createdAt: "" },
      ])],
    })).toThrow("Invalid insight source bundle");
  });

  test("normalizes visible display text without carrying extra data", () => {
    const parsed = parseInsightSourceBundle({
      conversations: [conversation("c1", "", [
        { id: "u1", role: "user", content: " question ", createdAt: "" },
        { id: "a1", role: "assistant", content: " answer ", createdAt: "" },
      ])],
    });

    expect(parsed.conversations[0].messages).toEqual([
      { id: "u1", role: "user", content: "question", createdAt: "" },
      { id: "a1", role: "assistant", content: "answer", createdAt: "" },
    ]);
  });
});

describe("deterministic insight aggregation", () => {
  test("caps conversations before other limits and omits conversations with no visible messages", async () => {
    const conversations = Array.from({ length: 22 }, (_, index) => conversation(
      `c-${String(index).padStart(2, "0")}`,
      `2026-07-${String(index + 1).padStart(2, "0")}T00:00:00.000Z`,
      [{ id: "u1", role: "user", content: "visible", createdAt: `2026-07-${String(index + 1).padStart(2, "0")}T00:00:00.000Z` }],
    ));
    conversations[21].messages[0].content = "   ";

    const result = await aggregateInsightSources({ conversations });

    expect(result.sources.conversations).toHaveLength(19);
    expect(result.sources.conversations.map((item) => item.id)).not.toContain("c-21");
    expect(result.sources.conversations.map((item) => item.id)).not.toContain("c-01");
    expect(result.sources.conversations.map((item) => item.id)).not.toContain("c-00");
  });

  test("applies exact conversation and message limits newest-first with stable id tie-breakers", async () => {
    const conversations = Array.from({ length: 22 }, (_, index) => {
      const id = `c-${String(index).padStart(2, "0")}`;
      const day = String(index + 1).padStart(2, "0");
      return conversation(id, `2026-06-${day}T00:00:00.000Z`, Array.from({ length: 11 }, (_, messageIndex) => ({
        id: `m-${String(messageIndex).padStart(2, "0")}`,
        role: messageIndex % 2 === 0 ? "user" as const : "assistant" as const,
        content: `${id}-${messageIndex}`,
        createdAt: `2026-06-${day}T00:00:${String(messageIndex).padStart(2, "0")}.000Z`,
      })));
    }).reverse();

    const result = await aggregateInsightSources({ conversations });

    expect(result.sources.conversations).toHaveLength(19);
    expect(result.sources.conversations[0].id).toBe("c-21");
    expect(result.sources.conversations.at(-1)?.id).toBe("c-03");
    expect(result.sources.conversations.flatMap((item) => item.messages)).toHaveLength(200);
    expect(result.sources.conversations.at(-1)?.messages).toHaveLength(2);
    expect(result.sources.conversations.at(-1)?.messages.map((message) => message.id)).toEqual(["m-10", "m-09"]);
  });

  test("uses code points for the exact 60,000 character boundary", async () => {
    const newest = "x".repeat(59_999) + "😀tail";
    const result = await aggregateInsightSources({
      conversations: [conversation("c1", "2026-07-16T12:00:00.000Z", [
        { id: "u1", role: "user", content: newest, createdAt: "2026-07-16T12:00:00.000Z" },
        { id: "a1", role: "assistant", content: "older", createdAt: "2026-07-16T11:00:00.000Z" },
      ])],
    });

    const content = result.sources.conversations[0].messages[0].content;
    expect(Array.from(content)).toHaveLength(60_000);
    expect(content.endsWith("😀")).toBe(true);
    expect(result.sources.conversations[0].messages).toHaveLength(1);
  });

  test("computes eligibility from Shanghai activity days and ignores invalid timestamps", async () => {
    const result = await aggregateInsightSources({ conversations: [
      conversation("c1", "invalid", [
        { id: "u1", role: "user", content: "first", createdAt: "2026-07-15T15:59:00.000Z" },
        { id: "u2", role: "user", content: "second", createdAt: "not-a-date" },
      ]),
      conversation("c2", "", [
        { id: "u3", role: "user", content: "third", createdAt: "2026-07-15T16:01:00.000Z" },
        { id: "a1", role: "assistant", content: "reply", createdAt: "" },
      ]),
    ] });

    expect(result.activityDays).toEqual(["2026-07-15", "2026-07-16"]);
    expect(result.sourceWindow).toEqual({
      from: "2026-07-15T15:59:00.000Z",
      to: "2026-07-15T16:01:00.000Z",
    });
    expect(insightEligibility(result)).toEqual({ eligible: true, conversationCount: 2, userMessageCount: 3, activityDayCount: 2 });
  });

  test("counts only supported routed user topics and exposes only user candidate excerpts", async () => {
    const result = await aggregateInsightSources({ conversations: [
      conversation("c1", "2026-07-16T01:00:00.000Z", [
        { id: "u1", role: "user", content: "考研和工作怎么选", createdAt: "2026-07-16T00:00:00.000Z" },
        { id: "a1", role: "assistant", content: "工作事业财富感情性格最近运势", createdAt: "2026-07-16T01:00:00.000Z" },
      ]),
      conversation("c2", "2026-07-17T00:00:00.000Z", [
        { id: "u2", role: "user", content: "hello", createdAt: "2026-07-17T00:00:00.000Z" },
      ]),
    ] });

    expect(result.topicCounts).toEqual({ career: 1, relationship: 0, wealth: 0, personality: 0, recent_fortune: 0 });
    expect(result.candidates).toEqual([
      { sourceId: "c2:u2", conversationId: "c2", messageId: "u2", excerpt: "hello", createdAt: "2026-07-17T00:00:00.000Z", topic: null },
      { sourceId: "c1:u1", conversationId: "c1", messageId: "u1", excerpt: "考研和工作怎么选", createdAt: "2026-07-16T00:00:00.000Z", topic: "career" },
    ]);
  });

  test("produces an order-independent SHA-256 fingerprint from the normalized truncated set", async () => {
    const a = conversation("a", "2026-07-16T00:00:00.000Z", [
      { id: "same-time-b", role: "assistant", content: "answer", createdAt: "2026-07-16T00:00:00.000Z" },
      { id: "same-time-a", role: "user", content: "question", createdAt: "2026-07-16T00:00:00.000Z" },
    ]);
    const b = conversation("b", "2026-07-17T00:00:00.000Z", [
      { id: "u2", role: "user", content: "new", createdAt: "2026-07-17T00:00:00.000Z" },
    ]);

    const first = await aggregateInsightSources({ conversations: [a, b] });
    const second = await aggregateInsightSources({ conversations: [{ ...b, messages: [...b.messages].reverse() }, { ...a, messages: [...a.messages].reverse() }] });

    expect(first.sourceFingerprint).toMatch(/^[a-f0-9]{64}$/);
    expect(second.sourceFingerprint).toBe(first.sourceFingerprint);
    expect(first.sources).toEqual(second.sources);
    expect(first.sources.conversations[1].messages.map((message) => message.id)).toEqual(["same-time-a", "same-time-b"]);
  });
});
