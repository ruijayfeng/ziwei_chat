/**
 * [INPUT]: Depends on model provider settings, deterministic plan fallback, and grounded chart facts
 * [OUTPUT]: Provides optional LLM-driven constrained analysis planning
 * [POS]: Agent brain planning layer before service-side allowlisted tool and RAG execution
 * [PROTOCOL]: Update this header when changed, then check AGENTS.md
 */

import type { AnalysisPlan, IntentRoute } from "../domain/analysis";
import type { ChartFact } from "../domain/chart";
import { generateModelResponse, type ResolvedModelSettings } from "./model-provider";

export type LlmPlannerInput = {
  settings: ResolvedModelSettings;
  userContent: string;
  route: IntentRoute;
  deterministicPlan: AnalysisPlan;
  chartFacts: ChartFact[];
};

const allowedTools = new Set([
  "getCurrentChart",
  "summarizeChartFacts",
  "getPalaceAnalysis",
  "getStarAnalysis",
  "getPatternAnalysis",
  "getLuckCycle",
  "loadSkill",
  "searchKnowledge",
  "runResponseCritic",
]);

export async function createLlmAnalysisPlan({
  settings,
  userContent,
  route,
  deterministicPlan,
  chartFacts,
}: LlmPlannerInput): Promise<AnalysisPlan> {
  if (!settings.enabled) return deterministicPlan;

  const result = await generateModelResponse({
    settings,
    systemPrompt:
      "你是 Ziwei Chat 的 Agent planner。只输出 JSON 计划，不输出用户最终回答。不能自行排盘，不能编造命盘事实。",
    prompt: buildPlannerPrompt({ userContent, route, deterministicPlan, chartFacts }),
  });
  if (!result.ok) return deterministicPlan;

  return normalizePlannerOutput(result.content, deterministicPlan);
}

function buildPlannerPrompt({
  userContent,
  route,
  deterministicPlan,
  chartFacts,
}: Omit<LlmPlannerInput, "settings">) {
  return [
    "请基于用户问题、已识别 intent、确定性 fallback 计划和命盘事实，选择需要执行的工具、skill 和知识检索词。",
    "约束：只允许使用 schema 里的工具名；不要输出 Markdown；不要生成最终回答；不要新增命盘事实。",
    "",
    `用户问题：${userContent}`,
    `已识别 intent：${route.intent}`,
    `安全级别：${route.safetyLevel}`,
    "",
    "已知命盘事实：",
    chartFacts.length > 0
      ? chartFacts.map((fact) => `- ${fact.palace}: ${fact.rawText}`).join("\n")
      : "- 暂无",
    "",
    "确定性 fallback 计划：",
    JSON.stringify({
      topic: deterministicPlan.topic,
      requiredTools: deterministicPlan.requiredTools,
      requiredSkills: deterministicPlan.requiredSkills,
      knowledgeQueries: deterministicPlan.knowledgeQueries,
      expectedResponseShape: deterministicPlan.expectedResponseShape,
    }),
    "",
    "输出 JSON schema：",
    '{"requiredTools":["getCurrentChart"],"requiredSkills":["career"],"knowledgeQueries":["career palace"],"analysisFocus":["先看官禄宫"]}',
  ].join("\n");
}

function normalizePlannerOutput(content: string, fallback: AnalysisPlan): AnalysisPlan {
  try {
    const parsed = JSON.parse(extractJson(content)) as Partial<AnalysisPlan> & {
      analysisFocus?: unknown;
    };

    return {
      ...fallback,
      requiredTools: readAllowedTools(parsed.requiredTools, fallback.requiredTools),
      requiredSkills: readStringArray(parsed.requiredSkills, fallback.requiredSkills).slice(0, 3),
      knowledgeQueries: readStringArray(parsed.knowledgeQueries, fallback.knowledgeQueries).slice(0, 5),
    };
  } catch {
    return fallback;
  }
}

function extractJson(content: string) {
  const start = content.indexOf("{");
  const end = content.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return content;
  return content.slice(start, end + 1);
}

function readAllowedTools(value: unknown, fallback: string[]) {
  const tools = readStringArray(value, fallback).filter((tool) => allowedTools.has(tool));
  return tools.length > 0 ? tools : fallback;
}

function readStringArray(value: unknown, fallback: string[]) {
  return Array.isArray(value) && value.every((item) => typeof item === "string")
    ? value
    : fallback;
}
