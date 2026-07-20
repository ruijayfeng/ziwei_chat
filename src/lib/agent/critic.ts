/**
 * [INPUT]: Depends on draft response text, tools used, chart facts, knowledge sources, and safety level
 * [OUTPUT]: Provides deterministic critique result before final user-facing response
 * [POS]: Agent quality gate after response composition and before persistence
 * [PROTOCOL]: Update this header when changed, then check AGENTS.md
 */

import type { CriticIssue, CritiqueResult, Intent, SafetyLevel } from "../domain/analysis";
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

const transformTerms = ["化禄", "化权", "化科", "化忌"];

export function runResponseCritic({
  intent,
  draft,
  toolsUsed,
  chartFacts,
  safetyLevel,
  prohibitionIds = [],
}: RunResponseCriticInput): CritiqueResult {
  const structuredIssues: CriticIssue[] = [];
  const addIssue = (code: string, message: string, severity: CriticIssue["severity"]) => {
    structuredIssues.push({ code, message, severity });
  };
  const chartSetupPrompt = chartFacts.length === 0 && isChartSetupPrompt(draft);

  if (seriousIntents.has(intent) && chartFacts.length === 0 && !chartSetupPrompt) {
    addIssue("missing_chart_facts", "Serious Ziwei analysis must include chart facts.", "blocking");
  }

  if (
    seriousIntents.has(intent) &&
    !chartSetupPrompt &&
    !toolsUsed.some((tool) =>
      tool === "summarizeChartFacts" || tool === "getCurrentChart" || tool === "getPalaceAnalysis",
    )
  ) {
    addIssue("missing_chart_tools", "Required chart tools did not run.", "blocking");
  }

  if (overconfidentTerms.some((term) => containsUnqualifiedTerm(draft, term))) {
    addIssue("overconfident_language", "Response contains overconfident language.", "blocking");
  }

  if (seriousIntents.has(intent) && hasUnsupportedCurrentChartAssertion(draft, chartFacts)) {
    addIssue("unsupported_current_chart_fact", "Response mentions chart facts that tools did not return.", "blocking");
  }

  if (prohibitedAdviceTerms.some((term) => containsUnqualifiedTerm(draft, term))) {
    addIssue("prohibited_high_stakes_advice", "Response contains prohibited high-stakes advice.", "blocking");
  }

  if (conflictsWithSkillProhibitions(draft, prohibitionIds)) {
    addIssue("skill_prohibition", "Response conflicts with the active skill's forbidden advice.", "blocking");
  }

  if (safetyLevel === "refusal" && prohibitedAdviceTerms.some((term) => containsUnqualifiedTerm(draft, term))) {
    addIssue("refusal_instruction_language", "Refusal-level response contains prohibited instruction language.", "blocking");
  }

  const blockingIssues = structuredIssues.filter((issue) => issue.severity === "blocking");
  return {
    passed: blockingIssues.length === 0,
    issues: structuredIssues.map((issue) => issue.message),
    requiredRevision: blockingIssues.length > 0,
    ...(structuredIssues.length > 0 ? { structuredIssues } : {}),
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

function hasUnsupportedCurrentChartAssertion(draft: string, chartFacts: ChartFact[]) {
  const knownPalaces = new Set(chartFacts.flatMap((fact) => [fact.palace, `${fact.palace}宫`]));
  const knownStars = new Set(chartFacts.flatMap((fact) => fact.stars));
  const knownTransforms = new Set(chartFacts.flatMap((fact) => fact.transforms.map((transform) => `化${transform}`)));
  const hasPatternFacts = chartFacts.some((fact) => fact.patterns.length > 0);

  return draft.split(/[。！？\n]/).some((sentence) => {
    const ownership = /(你的|你命盘|本命|命盘中|盘里|当前命盘|这张盘)/.test(sentence);
    const relationship = /(有|坐|落|见|化|为|是|形成|构成|位于)/.test(sentence);
    if (!ownership && !relationship) return false;
    if (/如果|通常|一般|可能|可以作为|并非本次命盘事实|不是本次命盘依据/.test(sentence)) return false;
    const assertedTerms = [...palaceTerms, ...starTerms, ...transformTerms].filter((term) => sentence.includes(term));
    const hasPalace = assertedTerms.some((term) => palaceTerms.includes(term));
    const hasPatternClaim = /(格局|结构|三方四正|会照)/.test(sentence);
    const isKnownTerm = (term: string) =>
      knownPalaces.has(term) || knownStars.has(term) || knownTransforms.has(term);

    return relationship && (
      ((ownership || (hasPalace && hasStarAssertion(sentence)) && assertedTerms.some((term) => starTerms.includes(term))) &&
        hasPalace &&
        assertedTerms.some((term) => !isKnownTerm(term))) ||
      (ownership && hasPatternClaim && !hasPatternFacts)
    );
  });
}

function hasStarAssertion(sentence: string) {
  return starTerms.some((term) => sentence.includes(term));
}
