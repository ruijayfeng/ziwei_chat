/**
 * [INPUT]: Depends on draft response text, tools used, chart facts, knowledge sources, and safety level
 * [OUTPUT]: Provides deterministic critique result before final user-facing response
 * [POS]: Agent quality gate after response composition and before persistence
 * [PROTOCOL]: Update this header when changed, then check AGENTS.md
 */

import type { CritiqueResult, Intent, SafetyLevel } from "../domain/analysis";
import type { ChartFact } from "../domain/chart";
import type { KnowledgeSource } from "../knowledge/search";
import type { SkillProhibitionId } from "../knowledge/skill-loader";

type RunResponseCriticInput = {
  intent: Intent | string;
  draft: string;
  toolsUsed: string[];
  chartFacts: ChartFact[];
  knowledgeSources: KnowledgeSource[];
  safetyLevel: SafetyLevel;
  prohibitionIds?: SkillProhibitionId[];
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
  prohibitionIds = [],
}: RunResponseCriticInput): CritiqueResult {
  const issues: string[] = [];
  const chartSetupPrompt = chartFacts.length === 0 && isChartSetupPrompt(draft);

  if (seriousIntents.has(intent) && chartFacts.length === 0 && !chartSetupPrompt) {
    issues.push("Serious Ziwei analysis must include chart facts.");
  }

  if (
    seriousIntents.has(intent) &&
    !chartSetupPrompt &&
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

  if (prohibitedAdviceTerms.some((term) => containsUnqualifiedTerm(draft, term))) {
    issues.push("Response contains prohibited high-stakes advice.");
  }

  if (conflictsWithSkillProhibitions(draft, prohibitionIds)) {
    issues.push("Response conflicts with the active skill's forbidden advice.");
  }

  const followUpCount = countVisibleQuestions(draft);
  if (seriousIntents.has(intent) && followUpCount !== 1) {
    issues.push("Response must include exactly one useful follow-up question.");
  }

  if (safetyLevel === "refusal" && prohibitedAdviceTerms.some((term) => containsUnqualifiedTerm(draft, term))) {
    issues.push("Refusal-level response contains prohibited instruction language.");
  }

  return {
    passed: issues.length === 0,
    issues,
    requiredRevision: issues.length > 0,
  };
}

function isChartSetupPrompt(draft: string) {
  const requestsChartSetup = /(?:请先|需要先|先)(?:创建|建立|补充).{0,12}(?:命盘|出生资料|出生信息)/.test(draft);
  const mentionsChartFact = [...palaceTerms, ...starTerms].some((term) => draft.includes(term));
  return requestsChartSetup && !mentionsChartFact;
}

const skillProhibitionPatterns: Record<SkillProhibitionId, RegExp[]> = {
  immediate_career_exit: [/立即辞职|马上辞职/],
  career_outcome_certainty: [/保证.{0,8}(升职|录用|裁员|收入)|一定.{0,8}(升职|录用|裁员|涨薪)/],
  legal_or_retaliation_instruction: [/起诉|报复上司|职场报复|伪造证据/],
  timing_certainty: [/一定会在|必然会在|确定会在/],
  relationship_manipulation: [/查看.{0,4}(手机|聊天记录)|监视|操控|试探对方|向对方施压/],
  relationship_fatalism: [/命中注定|天生一对|唯一正缘/],
  unsafe_relationship_advice: [/忍受.{0,6}(暴力|虐待)|留在.{0,6}(暴力|虐待)/],
  relationship_outcome_certainty: [/一定.{0,6}(复合|结婚|离婚|出轨|怀孕)/],
  financial_action_instruction: [/买入|卖出|借钱|加杠杆|赌博|全仓/],
  financial_outcome_certainty: [/保证.{0,8}(赚钱|盈利|回本|成功)|一定.{0,8}(暴富|亏损|发财)/],
  professional_financial_boundary: [/替代.{0,8}(财务|税务|法律).{0,4}(建议|意见)|无需咨询.{0,6}(会计师|律师|理财师)/],
  exact_income_prediction: [/(?:收入|年薪|月薪).{0,8}(?:达到|会有|是)\s*\d+/],
  clinical_diagnosis: [/诊断.{0,8}(人格障碍|抑郁|ADHD|创伤)|你有.{0,5}(人格障碍|抑郁症|ADHD)/i],
  fixed_personality_label: [/你就是.{0,8}(自私|冷漠|懒惰|控制狂)|天生.{0,8}(自私|冷漠|懒惰)/],
  fixed_personality_certainty: [/性格.{0,8}(永远|绝不|无法).{0,5}(改变|变化)|你永远不会改变/],
  harmful_behavior_excuse: [/因为命盘.{0,12}(伤害|控制|欺骗).{0,5}(没错|合理|正常)/],
  fear_prediction: [/大祸临头|血光之灾|厄运将至/],
  disaster_or_windfall_prediction: [/(?:会|必有|将有).{0,5}(事故|死亡|重病|诉讼|横财)/],
  regulated_instruction: [/应该.{0,6}(服药|停药|起诉|买入|卖出)|治疗方案|法律策略/],
  unsupported_lucky_date: [/(?:\d{1,2}月\d{1,2}日|\d{4}年\d{1,2}月\d{1,2}日).{0,6}(吉日|凶日|最幸运|最倒霉)/],
  single_factor_determinism: [/单凭.{0,8}(一颗星|一个宫位).{0,8}(决定|断定)|一颗星决定/],
  undisclosed_school_mixing: [/混合.{0,8}(流派|派别).{0,6}(不说明|无需说明)|各流派结论都一样/],
  invented_chart_fact: [/假设你.{0,8}(命宫|夫妻宫|财帛宫|官禄宫).{0,8}(有|落)|就当作.{0,8}(化禄|化权|化科|化忌)/],
  chart_explanation_prediction: [/我预测|将会发生|注定会|一定会发生/],
};

function conflictsWithSkillProhibitions(draft: string, prohibitionIds: SkillProhibitionId[]) {
  return prohibitionIds.some((id) =>
    skillProhibitionPatterns[id].some((pattern) => hasUnqualifiedMatch(draft, pattern)),
  );
}

function hasUnqualifiedMatch(draft: string, pattern: RegExp) {
  const flags = pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`;
  const matcher = new RegExp(pattern.source, flags);
  for (const match of draft.matchAll(matcher)) {
    if (match.index === undefined) continue;
    const prefix = qualifierPrefix(draft, match.index);
    if (!hasNearbyQualifier(prefix)) return true;
  }
  return false;
}

function countVisibleQuestions(draft: string) {
  return (draft.match(/[?？]/g) ?? []).length;
}

function containsUnqualifiedTerm(draft: string, term: string) {
  let index = draft.indexOf(term);

  while (index !== -1) {
    const prefix = qualifierPrefix(draft, index);
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

function qualifierPrefix(draft: string, index: number) {
  const prefix = draft.slice(Math.max(0, index - 12), index);
  const boundaries = [...prefix.matchAll(/[，。！？；,!?;\n]/g)];
  const boundary = boundaries.at(-1)?.index ?? -1;
  return prefix.slice(boundary + 1);
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
  const lines = draft.split(/\r?\n/);
  const startLine = lines.findIndex((line) => line.includes("命盘依据"));
  if (startLine === -1) return draft;

  const basisLines: string[] = [];
  const inlineBasis = lines[startLine]?.split("命盘依据", 2)[1]?.replace(/^[\s*：:]+/, "");
  if (inlineBasis) basisLines.push(inlineBasis);

  for (const line of lines.slice(startLine + 1)) {
    if (isChartBasisBoundary(line)) break;
    basisLines.push(line);
  }

  return basisLines.join("\n");
}

function isChartBasisBoundary(line: string) {
  const heading = line
    .trim()
    .replace(/^#{1,6}\s*/, "")
    .replace(/^[-+*]\s+/, "")
    .replace(/^(?:(?:\d+|[一二三四五六七八九十]+)[.、．]|[（(](?:\d+|[一二三四五六七八九十]+)[）)])\s*/, "")
    .replace(/^\*{1,2}/, "")
    .replace(/\*{1,2}$/, "")
    .trim();

  return /^(?:现实(?:层面(?:的)?(?:解释)?|解释)(?:与建议)?|建议|追问|参考知识(?:来源)?)(?:\s*[：:]|\s*$)/.test(heading);
}
