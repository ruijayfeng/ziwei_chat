import { describe, expect, test } from "vitest";

import { analysisTopicForIntent } from "../../src/lib/agent/analysis-topic";

describe("analysisTopicForIntent", () => {
  test.each([
    ["career", "career"],
    ["relationship", "relationship"],
    ["wealth", "wealth"],
    ["personality", "personality"],
    ["recent_fortune", "recent_fortune"],
    ["chart_explanation", "general"],
  ] as const)("maps %s to the deterministic chart and knowledge topic %s", (intent, topic) => {
    expect(analysisTopicForIntent(intent)).toBe(topic);
  });
});
