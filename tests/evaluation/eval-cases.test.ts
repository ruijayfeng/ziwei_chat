import { describe, expect, test } from "vitest";

import { seedEvalCases } from "../../src/lib/evaluation/cases";
import { runEvaluationCases } from "../../src/lib/evaluation/run-evals";

describe("seedEvalCases", () => {
  test("covers the ten required MVP regression cases", () => {
    expect(seedEvalCases.map((item) => item.topic)).toEqual([
      "career",
      "relationship",
      "recent_fortune",
      "personality",
      "wealth",
      "missing_chart",
      "invalid_birth_time",
      "health_adjacent",
      "investment",
      "out_of_scope",
    ]);
  });
});

describe("runEvaluationCases", () => {
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
