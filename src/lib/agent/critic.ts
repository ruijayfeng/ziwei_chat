/**
 * [INPUT]: Depends on draft response text, tools used, chart facts, knowledge sources, and safety level
 * [OUTPUT]: Provides deterministic critique result before final user-facing response
 * [POS]: Agent quality gate after response composition and before persistence
 * [PROTOCOL]: Update this header when changed, then check AGENTS.md
 */

import type { CritiqueResult, Intent, SafetyLevel } from "../domain/analysis";
import type { ChartFact } from "../domain/chart";
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

const overconfidentTerms = [
  "一定",
  "必然",
  "注定",
  "绝对",
  "必须",
  "必为",
  "必主",
  "涓€瀹?",
  "蹇呯劧",
  "娉ㄥ畾",
  "缁濆",
  "蹇呴』",
];

const prohibitedAdviceTerms = [
  "买入",
  "卖出",
  "加杠杆",
  "借钱投资",
  "辞职",
  "离婚",
  "治疗",
  "诊断",
  "涔板叆",
  "鍗栧嚭",
  "娌荤枟",
  "璇婃柇",
];

const palaceTerms = [
  "命宫",
  "身宫",
  "兄弟宫",
  "夫妻宫",
  "子女宫",
  "财帛宫",
  "疾厄宫",
  "迁移宫",
  "交友宫",
  "官禄宫",
  "田宅宫",
  "福德宫",
  "父母宫",
];

const starTerms = [
  "紫微",
  "天机",
  "太阳",
  "武曲",
  "天同",
  "廉贞",
  "天府",
  "太阴",
  "贪狼",
  "巨门",
  "天相",
  "天梁",
  "七杀",
  "破军",
];

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

  if (overconfidentTerms.some((term) => containsUnqualifiedTerm(draft, term))) {
    issues.push("Response contains overconfident language.");
  }

  if (seriousIntents.has(intent) && mentionsUnknownChartFact(draft, chartFacts)) {
    issues.push("Response mentions chart facts that tools did not return.");
  }

  if (prohibitedAdviceTerms.some((term) => draft.includes(term))) {
    issues.push("Response contains prohibited high-stakes advice.");
  }

  const followUpCount = countVisibleQuestions(draft);
  if (followUpCount !== 1) {
    issues.push("Response must include exactly one useful follow-up question.");
  }

  if (safetyLevel === "refusal" && prohibitedAdviceTerms.some((term) => draft.includes(term))) {
    issues.push("Refusal-level response contains prohibited instruction language.");
  }

  return {
    passed: issues.length === 0,
    issues,
    requiredRevision: issues.length > 0,
  };
}

function countVisibleQuestions(draft: string) {
  return (draft.match(/[?？]/g) ?? []).length;
}

function containsUnqualifiedTerm(draft: string, term: string) {
  let index = draft.indexOf(term);

  while (index !== -1) {
    const prefix = draft.slice(Math.max(0, index - 12), index);
    if (!hasNearbyQualifier(prefix)) {
      return true;
    }

    index = draft.indexOf(term, index + term.length);
  }

  return false;
}

function hasNearbyQualifier(prefix: string) {
  return ["不", "不能", "不是", "并非", "不要", "避免", "不宜", "未必", "难以", "无法"].some((term) =>
    prefix.includes(term),
  );
}

function mentionsUnknownChartFact(draft: string, chartFacts: ChartFact[]) {
  const basis = readChartBasisSection(draft);
  const knownPalaces = new Set(chartFacts.flatMap((fact) => [fact.palace, `${fact.palace}宫`]));
  const knownStars = new Set(chartFacts.flatMap((fact) => fact.stars));

  const unknownPalace = palaceTerms.some(
    (palace) => basis.includes(palace) && !knownPalaces.has(palace),
  );
  const unknownStar = starTerms.some((star) => basis.includes(star) && !knownStars.has(star));

  return unknownPalace || unknownStar;
}

function readChartBasisSection(draft: string) {
  const start = draft.search(/命盘依据|鍛界洏渚濇嵁/);
  if (start === -1) return draft;

  const rest = draft.slice(start);
  const end = rest.search(/\n\n(?:现实解释|鐜板疄瑙ｉ噴|建议|寤鸿)/);

  return end === -1 ? rest : rest.slice(0, end);
}
