import { describe, expect, test } from "vitest";

import { seedEvalCases } from "../../src/lib/evaluation/cases";
import { runEvaluationCases } from "../../src/lib/evaluation/run-evals";
import { ACTIVE_TOPICS } from "../../src/lib/ui/active-topics";

describe("seedEvalCases", () => {
  test("keeps every evaluation prompt and assertion as valid Chinese copy", () => {
    const serialized = JSON.stringify(seedEvalCases);

    expect(serialized).not.toMatch(/[鎴戞渶杩戝懡鐩樿储杩愮殑]/);
    expect(seedEvalCases[0].userPrompt).toBe("我最近想换工作，适合动吗？");
    expect(seedEvalCases[0].expectedFacts).toContain("官禄");
  });

  test("covers required regressions, chart explanation, and all canonical entries", () => {
    expect(seedEvalCases.slice(0, 11).map((item) => item.topic)).toEqual([
      "career",
      "relationship",
      "recent_fortune",
      "personality",
      "wealth",
      "chart_explanation",
      "missing_chart",
      "invalid_birth_time",
      "health_adjacent",
      "investment",
      "out_of_scope",
    ]);
    expect(seedEvalCases.slice(11).map((item) => item.id)).toEqual(
      ACTIVE_TOPICS.map((topic) => `canonical-entry-${topic.id}`),
    );
  });
});

describe("runEvaluationCases", () => {
  test("derives actual stages instead of copying expected tool fixtures", async () => {
    const evalCase = {
      ...seedEvalCases[0],
      expectedTools: ["fixture-only-tool"],
    };

    const [run] = await runEvaluationCases([evalCase]);

    expect(run.toolEvents).not.toContain("fixture-only-tool");
    expect(run.toolEvents).toEqual(expect.arrayContaining(["getCurrentChart", "summarizeChartFacts"]));
    expect(run.toolEvents).not.toEqual(expect.arrayContaining(["loadSkill", "searchKnowledge", "runResponseCritic"]));
    expect(run.stages).toMatchObject({
      route: { intent: "career" },
      plan: { requiredSkills: ["career"] },
      facts: expect.arrayContaining([expect.objectContaining({ palace: "官禄" })]),
      skill: { executed: true, success: true, skillId: "career" },
      retrieval: { executed: true, success: true, mode: "local" },
      critic: { executed: true, passed: expect.any(Boolean) },
    });
    expect(run.passed).toBe(false);
    expect(run.failures).toContain("tools: missing fixture-only-tool");
  });

  test("does not copy expected fact fixtures into chart evidence or response", async () => {
    const evalCase = {
      ...seedEvalCases[0],
      expectedFacts: ["fixture-only-fact"],
    };

    const [run] = await runEvaluationCases([evalCase]);

    expect(run.response).not.toContain("fixture-only-fact");
    expect(JSON.stringify(run.stages.facts)).not.toContain("fixture-only-fact");
    expect(run).toMatchObject({
      passed: false,
      failures: ["facts: missing fixture-only-fact"],
    });
  });

  test("routes every canonical entry through its real skill and local retrieval", async () => {
    const canonicalCases = seedEvalCases.filter((item) => item.topic === "canonical_entry");
    const runs = await runEvaluationCases(canonicalCases);

    expect(runs.map((run) => run.stages.route.intent)).toEqual(ACTIVE_TOPICS.map((topic) => topic.intent));
    expect(runs.map((run) => run.stages.skill?.skillId)).toEqual(ACTIVE_TOPICS.map((topic) => topic.skillId));
    expect(runs.every((run) => run.stages.retrieval.sources.length > 0)).toBe(true);
    expect(runs.every((run) => run.criticResult.passed)).toBe(true);
    expect(runs.every((run) => run.stages.requiredFacts.missing.length === 0)).toBe(true);
  });

  test("reports a stage-prefixed chart failure and continues the batch", async () => {
    const invalidFixtureCase = {
      ...seedEvalCases[0],
      chartFixture: { ...seedEvalCases[0].chartFixture!, birthDate: "invalid-date" },
    };

    const [failed, continued] = await runEvaluationCases([
      invalidFixtureCase,
      seedEvalCases[1],
    ]);

    expect(failed).toMatchObject({
      outcome: "failed",
      passed: false,
      failures: ["chart.create: Birth date must be a valid YYYY-MM-DD date."],
    });
    expect(continued).toMatchObject({ outcome: "accepted", passed: true });
  });

  test("runs the real critic for missing-chart and invalid-time responses", async () => {
    const cases = seedEvalCases.filter((item) =>
      item.topic === "missing_chart" || item.topic === "invalid_birth_time",
    );

    const runs = await runEvaluationCases(cases);

    expect(runs).toHaveLength(2);
    expect(runs.every((run) => run.stages.critic.executed)).toBe(true);
    expect(runs.every((run) => !run.toolEvents.includes("runResponseCritic"))).toBe(true);
    expect(runs.map((run) => run.stages.critic.passed)).toEqual([true, true]);
    expect(runs.map((run) => run.outcome)).toEqual(["setup_required", "accepted"]);
    expect(runs.every((run) => run.passed)).toBe(true);
  });

  test("records response, tools, critic result, and pass/fail for every seed case", async () => {
    const runs = await runEvaluationCases(seedEvalCases);

    expect(runs).toHaveLength(seedEvalCases.length);
    expect(runs.every((run) => run.response.length > 0)).toBe(true);
    expect(runs.every((run) => Array.isArray(run.toolEvents))).toBe(true);
    expect(runs.every((run) => typeof run.criticResult.passed === "boolean")).toBe(
      true,
    );
    expect(runs.every((run) => run.passed)).toBe(true);
  });
});
