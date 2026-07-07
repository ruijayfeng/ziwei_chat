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
