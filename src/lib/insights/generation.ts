/**
 * [INPUT]: Depends on bounded insight aggregation, normalized model settings, and the model provider adapter
 * [OUTPUT]: Provides privacy-minimal prompt construction and critic-approved report generation
 * [POS]: Pure generation boundary between deterministic insight sources and the Insights API route
 * [PROTOCOL]: Update this header when changed, then check AGENTS.md
 */

import {
  generateModelResponse,
  type ResolvedModelSettings,
} from "../agent/model-provider";
import type { InsightAggregation, InsightReport } from "./contracts";
import { approvedInsightReport, critiqueInsightReport } from "./critic";

type GenerationDependencies = {
  fetchImplementation?: typeof fetch;
  now?: () => Date;
};

export type InsightGenerationResult =
  | { ok: true; report: InsightReport }
  | { ok: false; reason: "provider" | "invalid_response" | "critic" };

const systemPrompt = [
  "你是 Ziwei Chat 的对话洞见整理器。",
  "只依据用户原话摘录进行温和、反思式总结，不做诊断，不替用户或他人断言意图，不给医疗、法律或投资结论。",
  "每段和每个模式必须引用给出的 sourceId；模式必须引用至少两个不同 sourceId。",
  "仅输出一个严格 JSON 对象，不要添加解释、前后缀或其他文本。",
].join("\n");

export function buildInsightPrompt(aggregation: InsightAggregation) {
  const evidence = {
    conversationCount: aggregation.conversationCount,
    userMessageCount: aggregation.userMessageCount,
    activityDayCount: aggregation.activityDays.length,
    topicCounts: aggregation.topicCounts,
    candidates: aggregation.candidates.map(({ sourceId, excerpt }) => ({ sourceId, excerpt })),
  };

  return [
    "根据以下确定性统计和候选摘录生成一封简短周信及最多三个观察模式。",
    "输出字段必须严格匹配：",
    '{"weeklyLetter":{"greeting":"string","paragraphs":[{"text":"string","sourceIds":["string"]}],"signoff":"string"},"patterns":[{"id":"string","title":"string","detail":"string","topic":"string","sourceIds":["string","string"]}]}',
    "weeklyLetter.paragraphs 必须为 1 至 3 项，patterns 必须为 0 至 3 项，不得增加任何字段。",
    JSON.stringify(evidence),
  ].join("\n");
}

export async function generateApprovedInsightReport(
  aggregation: InsightAggregation,
  settings: ResolvedModelSettings,
  dependencies: GenerationDependencies = {},
): Promise<InsightGenerationResult> {
  const response = await generateModelResponse({
    settings,
    prompt: buildInsightPrompt(aggregation),
    systemPrompt,
    fetchImplementation: dependencies.fetchImplementation,
    timeoutMs: 20_000,
    idleTimeoutMs: 8_000,
    maxTokens: 900,
  });

  if (!response.ok) return { ok: false, reason: "provider" };

  const candidate = parseCandidateJson(response.content);
  if (!candidate) return { ok: false, reason: "invalid_response" };

  const critique = critiqueInsightReport(candidate, aggregation);
  if (!critique.passed) return { ok: false, reason: "critic" };

  const report = approvedInsightReport(candidate, aggregation, dependencies.now);
  return report ? { ok: true, report } : { ok: false, reason: "critic" };
}

export function parseCandidateJson(content: string): unknown | null {
  const trimmed = content.trim();
  const fenced = trimmed.match(/^```json\s*\r?\n([\s\S]*?)\r?\n```$/i);
  const json = fenced ? fenced[1] : trimmed;
  if (!json || (!fenced && trimmed.startsWith("```"))) return null;

  try {
    const candidate: unknown = JSON.parse(json);
    return typeof candidate === "object" && candidate !== null && !Array.isArray(candidate)
      ? candidate
      : null;
  } catch {
    return null;
  }
}
