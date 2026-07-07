/**
 * [INPUT]: Depends on model provider settings and fully grounded Agent context
 * [OUTPUT]: Provides optional LLM analyst generation after tools, skills, and RAG have run
 * [POS]: Agent brain analysis layer before deterministic critic and fallback
 * [PROTOCOL]: Update this header when changed, then check AGENTS.md
 */

import { buildModelPrompt, generateModelResponse, type ResolvedModelSettings } from "./model-provider";

export type LlmAnalystInput = {
  settings: ResolvedModelSettings;
  userContent: string;
  deterministicDraft: string;
  chartFacts: string[];
  skillSteps: string[];
  knowledgeSources: string[];
  criticStatus: "not_run" | "passed" | "needs_review";
  criticIssues: string[];
  onToken?: (token: string) => void;
};

export type LlmRevisionInput = LlmAnalystInput & {
  failedContent: string;
  finalCriticIssues: string[];
};

export async function generateLlmAnalysis({
  settings,
  userContent,
  deterministicDraft,
  chartFacts,
  skillSteps,
  knowledgeSources,
  criticStatus,
  criticIssues,
  onToken,
}: LlmAnalystInput) {
  return generateModelResponse({
    settings,
    prompt: [
      buildModelPrompt({
        userContent,
        deterministicDraft,
        chartFacts,
        knowledgeSources,
        criticStatus,
        criticIssues,
      }),
      "",
      "主题 skill 分析步骤：",
      skillSteps.length > 0 ? skillSteps.map((step) => `- ${step}`).join("\n") : "- 暂无",
      "",
      "请把上面的命盘事实、skill、RAG 来源作为分析材料，给出综合判断；不要只改写本地草稿。",
    ].join("\n"),
    onToken,
  });
}

export async function reviseLlmAnalysis({
  settings,
  userContent,
  deterministicDraft,
  chartFacts,
  skillSteps,
  knowledgeSources,
  criticStatus,
  criticIssues,
  failedContent,
  finalCriticIssues,
}: LlmRevisionInput) {
  return generateModelResponse({
    settings,
    prompt: [
      buildModelPrompt({
        userContent,
        deterministicDraft,
        chartFacts,
        knowledgeSources,
        criticStatus,
        criticIssues,
      }),
      "",
      "主题 skill 分析步骤：",
      skillSteps.length > 0 ? skillSteps.map((step) => `- ${step}`).join("\n") : "- 暂无",
      "",
      "你上一版回答没有通过最终 critic。请只根据下面问题修订，不要新增命盘事实：",
      finalCriticIssues.map((issue) => `- ${issue}`).join("\n"),
      "",
      "上一版回答：",
      failedContent,
      "",
      "请输出修订后的最终回答，仍保留“结论 / 命盘依据 / 现实解释 / 建议 / 追问”，并且只保留一个问号。",
    ].join("\n"),
  });
}
