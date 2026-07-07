import { describe, expect, test } from "vitest";

import { runResponseCritic } from "../../src/lib/agent/critic";

const chartFact = {
  id: "chart-1:career:官禄",
  topic: "career",
  palace: "官禄",
  stars: ["天同"],
  transforms: ["忌"],
  patterns: [],
  rawText: "官禄宫位主星为 天同，四化为 忌。",
  confidence: "high" as const,
};

describe("runResponseCritic", () => {
  test("accepts a grounded model answer with a full-width Chinese follow-up question mark", () => {
    const result = runResponseCritic({
      intent: "career",
      draft:
        "结论：考研这件事更适合当成一段需要稳定投入的长期选择来看。\n\n命盘依据：\n- 工具已经提供事业判断基础。\n\n现实解释：这不是直接断定一定能不能上岸，而是看学习节奏、压力承受和阶段投入是否匹配。\n\n建议：先用两周做一次真题和复习时间评估，再决定是否投入完整周期。\n\n追问：你现在更担心的是考试结果，还是备考过程能不能坚持？",
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

  test("passes a grounded serious answer with exactly one follow-up question", () => {
    const result = runResponseCritic({
      intent: "career",
      draft:
        "结论：最近更适合先观察机会。\n\n命盘依据：官禄宫有天同化忌。\n\n现实解释：这更像工作节奏需要调整。\n\n建议：先用两周整理选择。\n\n追问：你现在更想换环境，还是换岗位？",
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

  test("fails answers that fabricate palaces or stars not returned by tools", () => {
    const result = runResponseCritic({
      intent: "career",
      draft:
        "结论：先观察机会。\n\n命盘依据：\n- 官禄宫有天同，也可以看出迁移宫有紫微。\n\n现实解释：这只是倾向。\n\n建议：先整理选择。\n\n追问：你现在更想换环境还是换内容？",
      toolsUsed: ["getCurrentChart", "summarizeChartFacts"],
      chartFacts: [
        {
          ...chartFact,
          palace: "官禄",
          stars: ["天同"],
          rawText: "官禄宫主星为天同。",
        },
      ],
      knowledgeSources: [],
      safetyLevel: "caution",
    });

    expect(result.passed).toBe(false);
    expect(result.issues).toContain("Response mentions chart facts that tools did not return.");
  });

  test("fails dangerous advice and missing follow-up questions", () => {
    const result = runResponseCritic({
      intent: "wealth",
      draft:
        "结论：财运很好。\n\n命盘依据：财帛宫有依据。\n\n现实解释：这是倾向。\n\n建议：现在买入并加杠杆。",
      toolsUsed: ["getCurrentChart", "summarizeChartFacts"],
      chartFacts: [
        {
          ...chartFact,
          topic: "wealth",
          palace: "财帛",
          stars: ["武曲"],
          rawText: "财帛宫主星为武曲。",
        },
      ],
      knowledgeSources: [],
      safetyLevel: "caution",
    });

    expect(result.passed).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        "Response contains prohibited high-stakes advice.",
        "Response must include exactly one useful follow-up question.",
      ]),
    );
  });
});
