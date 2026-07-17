/**
 * [INPUT]: Depends on model provider settings and fully grounded Agent context
 * [OUTPUT]: Provides optional LLM analyst generation after tools, skills, and RAG have run
 * [POS]: Agent brain analysis layer before deterministic critic and fallback
 * [PROTOCOL]: Update this header when changed, then check AGENTS.md
 */

import { buildModelPrompt, generateModelResponse, type ResolvedModelSettings } from "./model-provider";

export type LlmResponseMode = "analysis" | "conversation";

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
  if (responseMode === "conversation") {
    return generateModelResponse({
      settings,
      systemPrompt: "你是紫微知道的中文对话助手。自然、直接地回应用户，不把普通聊天伪装成命盘分析。",
      prompt: buildConversationPrompt({ userContent, conversationContext, hasChart }),
      onToken,
      maxTokens: 800,
    });
  }

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
      "skill 回答规则：",
      formatSkillRules(skillResponseRules),
      "",
      "skill 保守条件：",
      formatSkillRules(skillConservativeConditions),
      "",
      "skill 禁止建议：",
      formatSkillRules(skillForbiddenAdvice),
      "",
      "skill 常见问题路径：",
      formatSkillRules(skillCommonQuestionPaths),
      "",
      conversationContext ? `最近对话：\n${conversationContext}` : "",
      "",
      "请把上面的命盘事实、skill、RAG 来源作为分析材料，给出综合判断；不要只改写本地草稿。",
      "正文控制在 500 至 700 个中文字符，完整保留结论、命盘依据、现实解释、建议和一个追问。",
    ].join("\n"),
    onToken,
    maxTokens: 1_200,
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
  if (responseMode === "conversation") {
    return generateModelResponse({
      settings,
      systemPrompt: "你是紫微知道的中文对话助手。自然、直接地回应用户，不把普通聊天伪装成命盘分析。",
      prompt: [
        buildConversationPrompt({ userContent, conversationContext, hasChart }),
        "",
        "上一版回复未通过安全检查。只根据以下问题修订，不要编造命盘事实：",
        ...finalCriticIssues.map((issue) => `- ${issue}`),
        "",
        "上一版回复：",
        failedContent,
      ].join("\n"),
      timeoutMs: 20_000,
      idleTimeoutMs: 10_000,
      maxTokens: 800,
    });
  }

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
      "skill 回答规则：",
      formatSkillRules(skillResponseRules),
      "",
      "skill 保守条件：",
      formatSkillRules(skillConservativeConditions),
      "",
      "skill 禁止建议：",
      formatSkillRules(skillForbiddenAdvice),
      "",
      "skill 常见问题路径：",
      formatSkillRules(skillCommonQuestionPaths),
      "",
      conversationContext ? `最近对话：\n${conversationContext}` : "",
      "",
      "你上一版回答没有通过最终 critic。请只根据下面问题修订，不要新增命盘事实：",
      finalCriticIssues.map((issue) => `- ${issue}`).join("\n"),
      "强制修订规则：命盘依据是封闭引用区，只能使用上方“命盘事实”逐条引用或保守改写。删除命盘依据中所有未出现在该列表的宫位、星曜、四化和格局；不要把 RAG 术语当成用户事实。",
      "",
      "上一版回答：",
      failedContent,
      "",
      "请输出修订后的最终回答，仍保留“结论 / 命盘依据 / 现实解释 / 建议 / 追问”，并且只保留一个问号。",
    ].join("\n"),
    timeoutMs: 20_000,
    idleTimeoutMs: 10_000,
    maxTokens: 800,
  });
}

function formatSkillRules(rules: string[]) {
  return rules.length > 0 ? rules.map((rule) => `- ${rule}`).join("\n") : "- 暂无";
}

function buildConversationPrompt({
  userContent,
  conversationContext,
  hasChart,
}: Pick<LlmAnalystInput, "userContent" | "conversationContext" | "hasChart">) {
  return [
    `当前命盘状态：${hasChart ? "已设置" : "未设置"}。`,
    "当前不是命盘分析。请自然、直接地回应用户当前消息，并延续已有对话。",
    "不要主动索取出生日期、出生时间、性别或命盘资料。",
    "不要假设用户没有命盘；不要输出结论、命盘依据、现实解释、建议等分析报告格式。",
    "只有当用户明确提出紫微斗数或命盘分析时，才说明可以基于已保存的命盘继续分析。",
    "",
    `用户当前消息：${userContent}`,
    conversationContext ? `\n最近对话：\n${conversationContext}` : "",
  ].join("\n");
}
