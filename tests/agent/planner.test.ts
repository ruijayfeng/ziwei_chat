import { describe, expect, test } from "vitest";

import { buildAnalysisPlan } from "../../src/lib/agent/planner";
import { ACTIVE_TOPICS } from "../../src/lib/ui/active-topics";

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
        "natural_dialogue",
        "grounded_interpretation",
        "practical_direction",
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

  test("uses the existing chart explanation skill for chart explanation intent", () => {
    const plan = buildAnalysisPlan({
      intent: "chart_explanation",
      confidence: 0.9,
      requiresChart: true,
      safetyLevel: "caution",
      rationale: "chart explanation keyword matched",
    });

    expect(plan.requiredSkills).toEqual(["chart_explanation"]);
  });

  test("selects each canonical entry's declared skill", () => {
    for (const topic of ACTIVE_TOPICS) {
      const plan = buildAnalysisPlan({
        intent: topic.intent,
        confidence: 0.82,
        requiresChart: true,
        safetyLevel: "normal",
        rationale: "canonical active topic",
      });

      expect(plan.requiredSkills, topic.id).toEqual([topic.skillId]);
    }
  });
});
