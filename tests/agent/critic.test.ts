import { describe, expect, test } from "vitest";

import { runResponseCritic } from "../../src/lib/agent/critic";

const chartFact = {
  id: "chart-1:career:官禄",
  topic: "career",
  palace: "官禄",
  stars: ["天同"],
  transforms: ["忌"],
  patterns: [],
  rawText: "官禄 palace has 天同 with transforms 忌.",
  confidence: "high" as const,
};

describe("runResponseCritic", () => {
  test("passes a grounded serious answer with exactly one follow-up question", () => {
    const result = runResponseCritic({
      intent: "career",
      draft:
        "结论：最近更适合先观察机会。\n命盘依据：官禄宫有天同化忌。\n现实解释：这更像工作节奏需要调整。\n建议：先用两周整理选择。\n追问：你现在更想换环境，还是换岗位？",
      toolsUsed: ["getCurrentChart", "summarizeChartFacts"],
      chartFacts: [chartFact],
      knowledgeSources: [],
      safetyLevel: "caution",
    });

    expect(result).toEqual({
      passed: true,
      issues: [],
      requiredRevision: false,
    });
  });

  test("fails serious answers that lack chart facts or use absolute claims", () => {
    const result = runResponseCritic({
      intent: "wealth",
      draft: "你一定会发财。要不要现在买入？",
      toolsUsed: [],
      chartFacts: [],
      knowledgeSources: [],
      safetyLevel: "caution",
    });

    expect(result.passed).toBe(false);
    expect(result.requiredRevision).toBe(true);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        "Serious Ziwei analysis must include chart facts.",
        "Response contains overconfident language.",
      ]),
    );
  });
});
