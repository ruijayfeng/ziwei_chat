/**
 * [INPUT]: Depends on draft response text, tools used, chart facts, knowledge sources, and safety level
 * [OUTPUT]: Provides deterministic critique result before final user-facing response
 * [POS]: Agent quality gate after response composition and before persistence
 * [PROTOCOL]: Update this header when changed, then check AGENTS.md
 */

import type { ChartFact } from "../domain/chart";
import type { CritiqueResult, Intent, SafetyLevel } from "../domain/analysis";
import type { KnowledgeSource } from "../knowledge/search";

type RunResponseCriticInput = {
  intent: Intent | string;
  draft: string;
  toolsUsed: string[];
  chartFacts: ChartFact[];
  knowledgeSources: KnowledgeSource[];
  safetyLevel: SafetyLevel;
};

const seriousIntents = new Set([
  "recent_fortune",
  "career",
  "relationship",
  "wealth",
  "personality",
  "chart_explanation",
]);

const overconfidentTerms = ["一定", "必然", "注定", "绝对", "必须"];

export function runResponseCritic({
  intent,
  draft,
  toolsUsed,
  chartFacts,
  safetyLevel,
}: RunResponseCriticInput): CritiqueResult {
  const issues: string[] = [];

  if (seriousIntents.has(intent) && chartFacts.length === 0) {
    issues.push("Serious Ziwei analysis must include chart facts.");
  }

  if (
    seriousIntents.has(intent) &&
    !toolsUsed.some((tool) => tool === "summarizeChartFacts" || tool === "getCurrentChart")
  ) {
    issues.push("Required chart tools did not run.");
  }

  if (overconfidentTerms.some((term) => draft.includes(term))) {
    issues.push("Response contains overconfident language.");
  }

  const followUpCount = countQuestions(draft);
  if (followUpCount !== 1) {
    issues.push("Response must include exactly one useful follow-up question.");
  }

  if (safetyLevel === "refusal" && /买入|卖出|治疗|诊断/.test(draft)) {
    issues.push("Refusal-level response contains prohibited instruction language.");
  }

  return {
    passed: issues.length === 0,
    issues,
    requiredRevision: issues.length > 0,
  };
}

function countQuestions(draft: string) {
  return (draft.match(/[？?]/g) ?? []).length;
}
