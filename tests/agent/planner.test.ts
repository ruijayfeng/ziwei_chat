import { describe, expect, test } from "vitest";

import { buildAnalysisPlan } from "../../src/lib/agent/planner";

describe("buildAnalysisPlan", () => {
  test("plans a serious career question with chart, skill, knowledge, and critic requirements", () => {
    const plan = buildAnalysisPlan({
      intent: "career",
      confidence: 0.82,
      requiresChart: true,
      safetyLevel: "caution",
      rationale: "career keyword matched",
    });

    expect(plan).toMatchObject({
      topic: "career",
      requiredSkills: ["career"],
      safetyLevel: "caution",
      expectedResponseShape: [
        "conclusion",
        "chart_basis",
        "plain_explanation",
        "suggestion",
        "follow_up",
      ],
    });
    expect(plan.requiredTools).toEqual(
      expect.arrayContaining([
        "getCurrentChart",
        "summarizeChartFacts",
        "loadSkill",
        "searchKnowledge",
        "runResponseCritic",
      ]),
    );
  });

  test("plans out-of-scope prompts without chart tools", () => {
    const plan = buildAnalysisPlan({
      intent: "out_of_scope",
      confidence: 0.9,
      requiresChart: false,
      safetyLevel: "refusal",
      rationale: "Ba Zi is outside scope",
    });

    expect(plan.requiredTools).not.toContain("summarizeChartFacts");
    expect(plan.safetyLevel).toBe("refusal");
  });
});
