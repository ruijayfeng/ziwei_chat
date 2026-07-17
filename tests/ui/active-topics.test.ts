import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";

import { routeIntent } from "../../src/lib/agent/intent-router";
import { buildAnalysisPlan } from "../../src/lib/agent/planner";
import {
  ACTIVE_TOPICS,
  starterQuestionSafetyIssues,
} from "../../src/lib/ui/active-topics";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("active topic catalog", () => {
  test("defines the canonical six topics in release order", () => {
    expect(ACTIVE_TOPICS.map((topic) => topic.id)).toEqual([
      "recent_fortune",
      "career",
      "relationship",
      "wealth",
      "personality",
      "chart_explanation",
    ]);
  });

  test("has unique, non-empty consumer-facing entry values", () => {
    const values = (key: "id" | "label" | "question") => ACTIVE_TOPICS.map((topic) => topic[key]);

    for (const key of ["id", "label", "question"] as const) {
      expect(new Set(values(key)).size).toBe(ACTIVE_TOPICS.length);
      expect(values(key).every((value) => value.trim().length > 0)).toBe(true);
    }

    for (const topic of ACTIVE_TOPICS) {
      expect(topic.icon).toBeTruthy();
      expect(topic.accent).toMatch(/^var\(--[a-z-]+\)$/);
    }
  });

  test("routes every starter question to its declared intent and skill", () => {
    for (const topic of ACTIVE_TOPICS) {
      const route = routeIntent(topic.question);
      const plan = buildAnalysisPlan(route);

      expect(route, topic.id).toMatchObject({
        intent: topic.intent,
        requiresChart: true,
      });
      expect(plan.requiredSkills, topic.id).toEqual([topic.skillId]);
    }
  });

  test("rejects guarantees, irreversible advice, regulated instructions, exact dates, and long reports", () => {
    const unsafeQuestions = [
      "保证我三年内一定升职",
      "告诉我必须辞职还是创业",
      "按命盘给我股票买入建议",
      "按命盘诊断我的疾病并给治疗方案",
      "告诉我该怎么起诉对方",
      "预测我会在 2027 年 3 月 18 日发生什么",
      "生成未来三年的年度运势报告",
    ];

    for (const question of unsafeQuestions) {
      expect(starterQuestionSafetyIssues(question), question).not.toEqual([]);
    }
  });

  test("keeps every active starter question inside the safe-copy boundary", () => {
    for (const topic of ACTIVE_TOPICS) {
      expect(starterQuestionSafetyIssues(topic.question), topic.id).toEqual([]);
    }
  });

  test("does not retain unsupported ids in the active catalog source", () => {
    const activeTopicsSource = source("src/lib/ui/active-topics.ts");

    for (const unsupportedId of [
      "growth",
      "marriage",
      "family",
      "startup",
      "year",
      "study",
      "health",
      "character",
      "future",
    ]) {
      expect(activeTopicsSource).not.toMatch(new RegExp(`id: [\\\"']${unsupportedId}[\\\"']`));
    }
  });
});
