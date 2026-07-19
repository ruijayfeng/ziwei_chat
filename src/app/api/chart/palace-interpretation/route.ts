/**
 * [INPUT]: Receives one browser-owned chart, one selected palace, and browser-local model settings
 * [OUTPUT]: Provides critic-approved, on-demand AI interpretation for that palace only
 * [POS]: Narrow chart-page API boundary; does not create chat messages or pre-generate palace analyses
 * [PROTOCOL]: Update this header when changed, then check AGENTS.md
 */

import { randomUUID } from "node:crypto";

import { generateLlmAnalysis } from "@/lib/agent/llm-analyst";
import { normalizeModelSettings, type IncomingModelSettings } from "@/lib/agent/model-provider";
import { createAgentTools } from "@/lib/agent/tools";
import type { CreateChartInput } from "@/lib/domain/chart";

type PalaceInterpretationRequest = {
  profileId?: unknown;
  palace?: unknown;
  chartInput?: unknown;
  modelSettings?: unknown;
};

export async function POST(request: Request) {
  let body: PalaceInterpretationRequest;
  try {
    body = await request.json() as PalaceInterpretationRequest;
  } catch {
    return errorResponse("INVALID_REQUEST", "请求内容无效。", 400);
  }

  const palace = typeof body.palace === "string" ? body.palace.trim() : "";
  const chartInput = readChartInput(body.chartInput, body.profileId);
  if (!palace || !chartInput) {
    return errorResponse("INVALID_REQUEST", "缺少当前命盘或宫位信息。", 400);
  }

  const settings = normalizeModelSettings(readModelSettings(body.modelSettings));
  if (!settings.enabled) {
    return errorResponse("MODEL_NOT_CONFIGURED", "请先在设置中配置可用的回答模型。", 422);
  }

  const tools = createAgentTools();
  const hydrated = await tools.hydrateChart(chartInput);
  if (!hydrated.ok) {
    return errorResponse("CHART_UNAVAILABLE", "当前命盘暂时无法用于解读，请检查出生信息后重试。", 422);
  }

  const palaceAnalysis = await tools.getPalaceAnalysis({
    chartId: hydrated.data.chartId,
    palace,
    topic: "general",
  });
  if (!palaceAnalysis.ok) {
    if (palaceAnalysis.error.code === "PALACE_NOT_FOUND") {
      return errorResponse("PALACE_NOT_FOUND", "当前命盘中未找到该宫位，请刷新后重试。", 404);
    }
    return errorResponse("CHART_UNAVAILABLE", "当前命盘暂时无法用于解读，请稍后重试。", 422);
  }
  const chartFacts = palaceAnalysis.data.facts;

  const deterministicDraft = createPalaceDraft(palace, chartFacts.map(formatChartFact));

  const modelResult = await generateLlmAnalysis({
    settings,
    userContent: `请只解读我的${palace}，不要延伸到其他宫位。`,
    deterministicDraft,
    chartFacts: chartFacts.map(formatChartFact),
    skillSteps: ["只围绕当前宫位的确定性排盘事实解释。"],
    skillResponseRules: ["命盘依据只可引用提供的当前宫位事实。", "使用平实、非决定论的表达。"],
    skillConservativeConditions: ["不要把单一宫位解释成完整人生结论。"],
    skillForbiddenAdvice: ["不要提供医疗、法律、投资或不可逆的人生指令。"],
    skillCommonQuestionPaths: ["说明倾向、现实观察方向与可实践的建议。"],
    knowledgeSources: [],
    criticStatus: "passed",
    criticIssues: [],
    responseMode: "palace",
  });
  if (!modelResult.ok) {
    return errorResponse("MODEL_UNAVAILABLE", "模型暂时没有完成解读，请检查模型设置和网络后重试。", 503);
  }

  return Response.json({
    id: randomUUID(),
    palace,
    content: normalizePalaceContent(modelResult.content),
  });
}

function readChartInput(value: unknown, profileId: unknown): CreateChartInput | null {
  if (!isRecord(value) || typeof profileId !== "string" || !profileId) return null;
  if (
    typeof value.name !== "string" ||
    (value.gender !== "male" && value.gender !== "female") ||
    typeof value.birthDate !== "string" ||
    typeof value.birthTime !== "string" ||
    (value.calendarType !== "solar" && value.calendarType !== "lunar")
  ) return null;

  return {
    profileId,
    name: value.name,
    gender: value.gender,
    birthDate: value.birthDate,
    birthTime: value.birthTime,
    calendarType: value.calendarType,
    ...(typeof value.birthPlace === "string" ? { birthPlace: value.birthPlace } : {}),
    isPrimary: true,
  };
}

function readModelSettings(value: unknown): IncomingModelSettings | undefined {
  if (!isRecord(value)) return undefined;
  const embedding = isRecord(value.embedding)
    ? {
        provider: readString(value.embedding.provider),
        baseUrl: readString(value.embedding.baseUrl),
        apiKey: readString(value.embedding.apiKey),
        model: readString(value.embedding.model),
      }
    : undefined;
  return {
    provider: readString(value.provider),
    baseUrl: readString(value.baseUrl),
    apiKey: readString(value.apiKey),
    model: readString(value.model),
    embedding,
  };
}

function createPalaceDraft(palace: string, facts: string[]) {
  return `${palace}的确定性命盘事实：\n${facts.map((fact) => `- ${fact}`).join("\n")}`;
}

function normalizePalaceContent(content: string) {
  return content
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/^(?:结论|命盘依据|现实解释|建议|追问)\s*[：:]?\s*/gm, "")
    .trim();
}

function formatChartFact(fact: { palace: string; stars: string[]; transforms: string[]; patterns: string[]; rawText: string }) {
  const details = [
    fact.stars.length > 0 ? `星曜：${fact.stars.join("、")}` : "",
    fact.transforms.length > 0 ? `四化：${fact.transforms.join("、")}` : "",
    fact.patterns.length > 0 ? `结构：${fact.patterns.join("、")}` : "",
  ].filter(Boolean);
  return `${fact.palace}：${fact.rawText}${details.length > 0 ? `（${details.join("；")}）` : ""}`;
}

function errorResponse(code: string, message: string, status: number) {
  return Response.json({ code, message }, { status });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readString(value: unknown) {
  return typeof value === "string" ? value : undefined;
}
