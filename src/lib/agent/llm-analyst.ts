/**
 * [INPUT]: Depends on model provider settings and fully grounded Agent context
 * [OUTPUT]: Provides optional LLM analyst generation after tools, skills, and RAG have run
 * [POS]: Agent brain analysis layer before deterministic critic and fallback
 * [PROTOCOL]: Update this header when changed, then check AGENTS.md
 */

import { generateModelResponse, type ResolvedModelSettings } from "./model-provider";
import {
  buildZhiweiRuntimePrompt,
  buildZhiweiSystemPrompt,
} from "./zhiwei-persona";

export type LlmResponseMode = "analysis" | "conversation" | "palace";

export type LlmAnalystInput = {
  settings: ResolvedModelSettings;
  userContent: string;
  deterministicDraft: string;
  chartFacts: string[];
  skillSteps: string[];
  skillResponseRules: string[];
  skillConservativeConditions: string[];
  skillForbiddenAdvice: string[];
  skillCommonQuestionPaths: string[];
  knowledgeSources: string[];
  criticStatus: "not_run" | "passed" | "needs_review";
  criticIssues: string[];
  responseMode?: LlmResponseMode;
  conversationContext?: string;
  hasChart?: boolean;
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
  skillResponseRules,
  skillConservativeConditions,
  skillForbiddenAdvice,
  skillCommonQuestionPaths,
  knowledgeSources,
  criticStatus,
  criticIssues,
  responseMode = "analysis",
  conversationContext = "",
  hasChart = false,
  onToken,
}: LlmAnalystInput) {
  return generateModelResponse({
    settings,
    systemPrompt: buildZhiweiSystemPrompt(responseMode),
    prompt: buildZhiweiRuntimePrompt({
      mode: responseMode,
      taskRules: buildTaskRules({
        responseMode,
        deterministicDraft,
        skillSteps,
        skillResponseRules,
        skillConservativeConditions,
        skillForbiddenAdvice,
        skillCommonQuestionPaths,
        criticStatus,
        criticIssues,
        hasChart,
      }),
      chartFacts,
      knowledgeSources,
      conversationContext,
      userContent,
    }),
    onToken,
    maxTokens: responseMode === "palace" ? 520 : responseMode === "conversation" ? 800 : 1_200,
  });
}

export async function reviseLlmAnalysis({
  settings,
  userContent,
  deterministicDraft,
  chartFacts,
  skillSteps,
  skillResponseRules,
  skillConservativeConditions,
  skillForbiddenAdvice,
  skillCommonQuestionPaths,
  knowledgeSources,
  criticStatus,
  criticIssues,
  responseMode = "analysis",
  conversationContext = "",
  hasChart = false,
  failedContent,
  finalCriticIssues,
}: LlmRevisionInput) {
  return generateModelResponse({
    settings,
    systemPrompt: buildZhiweiSystemPrompt(responseMode),
    prompt: buildZhiweiRuntimePrompt({
      mode: responseMode,
      taskRules: [
        ...buildTaskRules({
          responseMode,
          deterministicDraft,
          skillSteps,
          skillResponseRules,
          skillConservativeConditions,
          skillForbiddenAdvice,
          skillCommonQuestionPaths,
          criticStatus,
          criticIssues,
          hasChart,
        }),
        "上一版回答没有通过最终检查。只根据下列问题修订，不要新增命盘事实。",
        ...finalCriticIssues.map((issue) => `修订问题：${issue}`),
        `上一版回答：${failedContent}`,
      ],
      chartFacts,
      knowledgeSources,
      conversationContext,
      userContent,
    }),
    timeoutMs: 20_000,
    idleTimeoutMs: 10_000,
    maxTokens: responseMode === "palace" ? 520 : 800,
  });
}

function buildTaskRules({
  responseMode,
  deterministicDraft,
  skillSteps,
  skillResponseRules,
  skillConservativeConditions,
  skillForbiddenAdvice,
  skillCommonQuestionPaths,
  criticStatus,
  criticIssues,
  hasChart,
}: Pick<
  LlmAnalystInput,
  | "responseMode"
  | "deterministicDraft"
  | "skillSteps"
  | "skillResponseRules"
  | "skillConservativeConditions"
  | "skillForbiddenAdvice"
  | "skillCommonQuestionPaths"
  | "criticStatus"
  | "criticIssues"
  | "hasChart"
>) {
  if (responseMode === "conversation") {
    return [
      `当前命盘状态：${hasChart ? "已设置" : "未设置"}。`,
      "不把聊天、倾诉或产品问答强行解释为命盘分析，也不要主动索要出生信息。",
    ];
  }

  if (responseMode === "palace") {
    return [
      "围绕当前宫位的确定性事实解释主星、辅星、四化或结构如何共同呈现。",
      "只说明观察重点与组合特征，不把单一宫位扩展成完整人生结论。",
    ];
  }

  return [
    "用命盘事实、主题 Skill 和知识来源形成综合判断；不要只改写本地草稿。",
    `本地确定性草稿（仅作参考）：${deterministicDraft}`,
    ...skillSteps.map((step) => `分析步骤：${step}`),
    ...skillResponseRules.map((rule) => `回答规则：${rule}`),
    ...skillConservativeConditions.map((condition) => `保守条件：${condition}`),
    ...skillForbiddenAdvice.map((advice) => `禁止建议：${advice}`),
    ...skillCommonQuestionPaths.map((path) => `可参考的问题路径：${path}`),
    `预检状态：${criticStatus}`,
    ...criticIssues.map((issue) => `预检问题：${issue}`),
  ];
}
