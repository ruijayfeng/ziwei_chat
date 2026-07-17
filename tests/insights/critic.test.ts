import { describe, expect, test } from "vitest";

import { approvedInsightReport, critiqueInsightReport } from "../../src/lib/insights/critic";
import type { InsightAggregation, InsightReportCandidate } from "../../src/lib/insights/contracts";

const sourceWindow = {
  from: "2026-07-15T15:59:00.000Z",
  to: "2026-07-16T16:01:00.000Z",
};

function aggregation(overrides: Partial<InsightAggregation> = {}): InsightAggregation {
  return {
    sources: { conversations: [] },
    sourceWindow,
    conversationCount: 2,
    userMessageCount: 3,
    activityDays: ["2026-07-15", "2026-07-17"],
    topicCounts: { career: 2, relationship: 1, wealth: 0, personality: 0, recent_fortune: 0 },
    candidates: [
      { sourceId: "c1:u1", conversationId: "c1", messageId: "u1", excerpt: "first", createdAt: sourceWindow.from, topic: "career" },
      { sourceId: "c1:u2", conversationId: "c1", messageId: "u2", excerpt: "second", createdAt: "2026-07-16T00:00:00.000Z", topic: "career" },
      { sourceId: "c2:u3", conversationId: "c2", messageId: "u3", excerpt: "third", createdAt: sourceWindow.to, topic: "relationship" },
    ],
    sourceFingerprint: "a".repeat(64),
    ...overrides,
  };
}

function candidate(overrides: Partial<InsightReportCandidate> = {}): InsightReportCandidate {
  return {
    weeklyLetter: {
      greeting: "  Hello,  ",
      paragraphs: [
        { text: "  You returned to work rhythm several times this week.  ", sourceIds: ["c1:u1", "c1:u1"] },
      ],
      signoff: "  Take care.  ",
    },
    patterns: [
      {
        id: "  work-rhythm  ",
        title: "  Work rhythm  ",
        detail: "  Two notes reflected on rearranging your work rhythm.  ",
        topic: "  career  ",
        sourceIds: ["c1:u1", "c1:u2", "c1:u1"],
      },
    ],
    ...overrides,
  };
}

describe("critiqueInsightReport", () => {
  test("accepts the exact model-owned shape", () => {
    expect(critiqueInsightReport(candidate(), aggregation())).toEqual({ passed: true, issues: [] });
  });

  test.each([
    ["model generatedAt", { ...candidate(), generatedAt: "2020-01-01T00:00:00.000Z" }],
    ["model source window", { ...candidate(), sourceWindow }],
    ["model fingerprint", { ...candidate(), sourceFingerprint: "model-value" }],
    ["model critic", { ...candidate(), critic: { passed: true, issues: [] } }],
    ["unknown root key", { ...candidate(), hidden: true }],
    ["unknown letter key", candidate({ weeklyLetter: { ...candidate().weeklyLetter, hidden: true } as never })],
    ["unknown paragraph key", candidate({ weeklyLetter: { ...candidate().weeklyLetter, paragraphs: [{ text: "valid", sourceIds: ["c1:u1"], hidden: true } as never] } })],
    ["unknown pattern key", candidate({ patterns: [{ ...candidate().patterns[0], hidden: true } as never] })],
  ])("rejects strict-key violation: %s", (_label, value) => {
    expect(critiqueInsightReport(value, aggregation()).passed).toBe(false);
  });

  test.each([
    ["empty greeting", candidate({ weeklyLetter: { ...candidate().weeklyLetter, greeting: "   " } })],
    ["empty signoff", candidate({ weeklyLetter: { ...candidate().weeklyLetter, signoff: "   " } })],
    ["empty paragraph", candidate({ weeklyLetter: { ...candidate().weeklyLetter, paragraphs: [{ text: " ", sourceIds: ["c1:u1"] }] } })],
    ["empty pattern id", candidate({ patterns: [{ ...candidate().patterns[0], id: " " }] })],
    ["empty pattern title", candidate({ patterns: [{ ...candidate().patterns[0], title: " " }] })],
    ["empty pattern detail", candidate({ patterns: [{ ...candidate().patterns[0], detail: " " }] })],
    ["empty pattern topic", candidate({ patterns: [{ ...candidate().patterns[0], topic: " " }] })],
    ["no paragraphs", candidate({ weeklyLetter: { ...candidate().weeklyLetter, paragraphs: [] } })],
    ["four paragraphs", candidate({ weeklyLetter: { ...candidate().weeklyLetter, paragraphs: Array.from({ length: 4 }, (_, index) => ({ text: `paragraph ${index}`, sourceIds: ["c1:u1"] })) } })],
    ["four patterns", candidate({ patterns: Array.from({ length: 4 }, (_, index) => ({ id: `p${index}`, title: "title", detail: "detail", topic: "career", sourceIds: ["c1:u1", "c1:u2"] })) })],
  ])("rejects invalid text or count: %s", (_label, value) => {
    expect(critiqueInsightReport(value, aggregation()).passed).toBe(false);
  });

  test("requires an eligible aggregation with a source window", () => {
    expect(critiqueInsightReport(candidate(), aggregation({ userMessageCount: 2 })).passed).toBe(false);
    expect(critiqueInsightReport(candidate(), aggregation({ sourceWindow: null })).passed).toBe(false);
  });

  test("requires known candidate provenance on every paragraph and pattern", () => {
    const cases = [
      candidate({ weeklyLetter: { ...candidate().weeklyLetter, paragraphs: [{ text: "missing", sourceIds: [] }] } }),
      candidate({ weeklyLetter: { ...candidate().weeklyLetter, paragraphs: [{ text: "unknown", sourceIds: ["c1:a1"] }] } }),
      candidate({ patterns: [{ ...candidate().patterns[0], sourceIds: [] }] }),
      candidate({ patterns: [{ ...candidate().patterns[0], sourceIds: ["c1:u1", "c1:a1"] }] }),
    ];

    for (const value of cases) expect(critiqueInsightReport(value, aggregation()).passed).toBe(false);
  });

  test("requires two distinct known candidate ids for each pattern after deduplication", () => {
    const value = candidate({ patterns: [{ ...candidate().patterns[0], sourceIds: ["c1:u1", "c1:u1"] }] });
    expect(critiqueInsightReport(value, aggregation()).passed).toBe(false);
  });

  test.each([
    ["medical instruction", "Stop taking your prescribed medication."],
    ["medical fact", "You have heart disease."],
    ["Chinese medical instruction", "你应该立即停止服药。"],
    ["Chinese diagnostic fact", "这说明你有焦虑症。"],
    ["legal instruction", "You should ignore the court order."],
    ["legal fact", "This contract is illegal."],
    ["Chinese legal instruction", "你应该忽略法院命令。"],
    ["Chinese legal fact", "这份合同违法。"],
    ["diagnostic fact", "This means you have an anxiety disorder."],
    ["prescriptive investment", "You should buy this stock now."],
    ["prescriptive divestment", "Sell your shares immediately."],
    ["guaranteed investment", "This investment has guaranteed returns."],
    ["Chinese prescriptive investment", "你应该立即买入这只股票。"],
    ["partner intent", "Your partner wants to leave you."],
    ["coworker intent", "Your coworker is trying to sabotage you."],
    ["Chinese other-person intent", "你的同事想害你。"],
    ["absolute certainty", "You will definitely succeed."],
    ["behavioral certainty", "You always avoid responsibility."],
    ["ziwei certainty", "This palace proves you are destined to fail."],
    ["Chinese certainty", "你注定会失败。"],
  ])("rejects unsafe generated text: %s", (_label, text) => {
    const value = candidate({
      weeklyLetter: { ...candidate().weeklyLetter, paragraphs: [{ text, sourceIds: ["c1:u1"] }] },
    });

    expect(critiqueInsightReport(value, aggregation()).passed).toBe(false);
  });

  test.each([
    "You mentioned reading about investing and reflecting on your risk tolerance.",
    "Your relationship has been an important topic in your recent notes.",
    "You wondered whether your coworker understood your concern.",
    "You may want to notice how certain work situations feel.",
    "你提到最近在了解投资，也在反思自己的风险承受能力。",
    "你最近多次思考这段关系，可以继续留意自己的感受。",
  ])("allows neutral reflection: %s", (text) => {
    const value = candidate({
      weeklyLetter: { ...candidate().weeklyLetter, paragraphs: [{ text, sourceIds: ["c1:u1"] }] },
    });
    expect(critiqueInsightReport(value, aggregation())).toEqual({ passed: true, issues: [] });
  });

  test("scans generated text but never source excerpts", () => {
    const unsafeSources = aggregation({
      candidates: aggregation().candidates.map((item) => ({
        ...item,
        excerpt: "Your partner wants to leave. Buy this stock now. You have depression.",
      })),
    });
    expect(critiqueInsightReport(candidate(), unsafeSources)).toEqual({ passed: true, issues: [] });
  });
});

describe("approvedInsightReport", () => {
  test("returns the exact sanitized report with server-owned metadata", () => {
    const now = new Date("2026-07-17T08:09:10.000Z");

    expect(approvedInsightReport(candidate(), aggregation(), () => now)).toEqual({
      sourceWindow,
      generatedAt: now.toISOString(),
      sourceFingerprint: "a".repeat(64),
      weeklyLetter: {
        greeting: "Hello,",
        paragraphs: [{ text: "You returned to work rhythm several times this week.", sourceIds: ["c1:u1"] }],
        signoff: "Take care.",
      },
      patterns: [{
        id: "work-rhythm",
        title: "Work rhythm",
        detail: "Two notes reflected on rearranging your work rhythm.",
        topic: "career",
        sourceIds: ["c1:u1", "c1:u2"],
      }],
      critic: { passed: true, issues: [] },
    });
  });

  test("does not approve invalid, unsafe, ineligible, windowless, or invalid-clock input", () => {
    expect(approvedInsightReport({ ...candidate(), extra: true }, aggregation())).toBeNull();
    expect(approvedInsightReport(candidate(), aggregation({ userMessageCount: 2 }))).toBeNull();
    expect(approvedInsightReport(candidate(), aggregation({ sourceWindow: null }))).toBeNull();
    expect(approvedInsightReport(candidate(), aggregation(), new Date("invalid"))).toBeNull();
  });
});
