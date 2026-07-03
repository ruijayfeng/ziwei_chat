/**
 * [INPUT]: Depends on Vercel AI SDK text streaming, deterministic agent core, chart tools, skills, and local knowledge
 * [OUTPUT]: Provides POST /api/chat streaming response for the MVP chat surface
 * [POS]: App Router API boundary that wires session context, tool-grounded analysis, critic, and persistence
 * [PROTOCOL]: Update this header when changed, then check AGENTS.md
 */

import { randomUUID } from "node:crypto";

import { createTextStreamResponse } from "ai";

import { runResponseCritic } from "../../../lib/agent/critic";
import {
  getChatRuntimeStores,
  persistChatMessage,
  recordRouteToolEvent,
} from "../../../lib/agent/chat-runtime";
import { routeIntent } from "../../../lib/agent/intent-router";
import { buildAnalysisPlan } from "../../../lib/agent/planner";
import { composeResponse } from "../../../lib/agent/response-composer";
import { createAgentTools } from "../../../lib/agent/tools";
import type { ChartFact, ChartTopic, CreateChartInput } from "../../../lib/domain/chart";
import type { Intent } from "../../../lib/domain/analysis";
import { loadSkill, type SkillId } from "../../../lib/knowledge/skill-loader";
import { searchKnowledge } from "../../../lib/knowledge/search";

type IncomingMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

type ChatRequestBody = {
  profileId?: string;
  conversationId?: string;
  messages?: IncomingMessage[];
  message?: string;
  chartInput?: CreateChartInput;
};

const chartTopics = new Set<Intent>([
  "career",
  "relationship",
  "wealth",
  "personality",
  "recent_fortune",
  "chart_explanation",
]);

export async function POST(request: Request) {
  const body = (await request.json()) as ChatRequestBody;
  const profileId = body.profileId ?? `anonymous-${randomUUID()}`;
  const conversationId = body.conversationId ?? randomUUID();
  const userContent = readLatestUserContent(body);
  const stores = getChatRuntimeStores();
  const tools = createAgentTools({ stores });

  await persistChatMessage({
    conversationId,
    profileId,
    role: "user",
    content: userContent,
  });

  if (body.chartInput) {
    await tools.createChart({ ...body.chartInput, profileId });
  }

  const route = routeIntent(userContent);
  const plan = buildAnalysisPlan(route);

  if (route.requiresChart) {
    const currentChart = await tools.getCurrentChart({ profileId, conversationId });
    if (!currentChart.ok) {
      return await streamAndPersist({
        profileId,
        conversationId,
        content:
          "请先创建一张命盘，我才能基于确定性排盘给你分析。你可以提供出生日期、出生时间、性别和历法类型。",
        metadata: { intent: route.intent, safetyLevel: route.safetyLevel },
      });
    }

    if (chartTopics.has(route.intent)) {
      const answer = await answerWithChartContext({
        tools,
        intent: route.intent,
        chartId: currentChart.data.chartId,
        plan,
        conversationId,
      });

      return await streamAndPersist({
        profileId,
        conversationId,
        content: answer,
        metadata: { intent: route.intent, safetyLevel: plan.safetyLevel },
      });
    }
  }

  const fallback =
    route.intent === "out_of_scope"
      ? "Ziwei Chat 首版只处理紫微斗数相关问题，暂不做八字、塔罗、风水或其他体系。你可以问我事业、感情、财富、性格或近期运势。"
      : "我可以陪你聊，但如果要做紫微斗数分析，需要先有命盘和具体问题。你现在想先看事业、感情、财富、性格，还是近期运势？";

  return await streamAndPersist({
    profileId,
    conversationId,
    content: fallback,
    metadata: { intent: route.intent, safetyLevel: route.safetyLevel },
  });
}

async function answerWithChartContext({
  tools,
  intent,
  chartId,
  plan,
  conversationId,
}: {
  tools: ReturnType<typeof createAgentTools>;
  intent: Intent;
  chartId: string;
  plan: ReturnType<typeof buildAnalysisPlan>;
  conversationId: string;
}) {
  const topic = toChartTopic(intent);
  const summary = await tools.summarizeChartFacts({
    chartId,
    topics: [topic],
  });
  const chartFacts = summary.ok ? summary.data.facts : [];
  const firstFact = chartFacts[0];
  const skill = await loadRouteSkill(plan.requiredSkills[0]);
  const knowledge = await searchRouteKnowledge(plan.knowledgeQueries[0] ?? topic, topic, firstFact);
  await recordRouteToolEvent(
    conversationId,
    "loadSkill",
    { skillId: plan.requiredSkills[0] },
    skill,
    skill !== null,
  );
  await recordRouteToolEvent(
    conversationId,
    "searchKnowledge",
    { query: plan.knowledgeQueries[0], topic },
    knowledge,
    knowledge.length > 0,
  );

  const draft = composeResponse({
    conclusion: buildConclusion(topic),
    chartBasis:
      firstFact !== undefined
        ? [`${firstFact.palace}：${firstFact.rawText}`]
        : ["当前命盘事实不足，回答需要保持保守。"],
    plainExplanation: buildPlainExplanation(topic, firstFact),
    suggestion: buildSuggestion(topic),
    followUp: buildFollowUp(topic),
  });
  const toolsUsed = getChatRuntimeStores().toolEvents.map((event) => event.toolName);
  const critique = runResponseCritic({
    intent,
    draft,
    toolsUsed,
    chartFacts,
    knowledgeSources: knowledge,
    safetyLevel: plan.safetyLevel,
  });
  await recordRouteToolEvent(
    conversationId,
    "runResponseCritic",
    { intent, draft },
    critique,
    critique.passed,
  );

  if (!critique.passed) {
    return composeResponse({
      conclusion: "这个问题可以看，但我会先保守处理。",
      chartBasis: chartFacts.slice(0, 1).map((fact) => `${fact.palace}：${fact.rawText}`),
      plainExplanation: "目前依据不足以做很强的判断，所以更适合把它当成观察方向。",
      suggestion: "先补足具体背景，再结合命盘事实继续分析。",
      followUp: "你愿意先补充一下当前现实处境吗？",
    });
  }

  return draft;
}

async function loadRouteSkill(skillId: string | undefined) {
  if (!skillId) return null;
  return loadSkill(skillId as SkillId);
}

async function searchRouteKnowledge(
  query: string,
  topic: ChartTopic,
  fact: ChartFact | undefined,
) {
  const sources = await searchKnowledge({
    query,
    topic,
    chartTerms: fact ? [fact.palace, ...fact.stars] : [],
    limit: 3,
    retrievalMode: "local",
  });

  return sources;
}

async function streamAndPersist({
  profileId,
  conversationId,
  content,
  metadata,
}: {
  profileId: string;
  conversationId: string;
  content: string;
  metadata: Record<string, unknown>;
}) {
  await persistChatMessage({
    conversationId,
    profileId,
    role: "assistant",
    content,
    metadata,
  });

  return createTextStreamResponse({
    stream: textToStream(content),
  });
}

function textToStream(content: string) {
  return new ReadableStream<string>({
    start(controller) {
      for (const chunk of chunkText(content, 32)) {
        controller.enqueue(chunk);
      }
      controller.close();
    },
  });
}

function chunkText(content: string, size: number) {
  const chunks: string[] = [];
  for (let index = 0; index < content.length; index += size) {
    chunks.push(content.slice(index, index + size));
  }

  return chunks.length > 0 ? chunks : [""];
}

function readLatestUserContent(body: ChatRequestBody) {
  const latestUserMessage = [...(body.messages ?? [])]
    .reverse()
    .find((message) => message.role === "user");

  return body.message ?? latestUserMessage?.content ?? "";
}

function toChartTopic(intent: Intent): ChartTopic {
  return intent === "chart_explanation" ? "general" : (intent as ChartTopic);
}

function buildConclusion(topic: ChartTopic) {
  const conclusions: Record<ChartTopic, string> = {
    career: "你最近更适合先观察机会，再决定要不要动。",
    relationship: "这段关系更适合先看互动模式，而不是急着下定论。",
    wealth: "这个盘更适合先看赚钱方式和风险节奏。",
    personality: "这个盘给人的感觉是有明确倾向，但不能用单一标签概括。",
    recent_fortune: "近期更像是需要整理重点、避免被情绪推着走。",
    general: "这张盘可以先从核心宫位和主星开始理解。",
  };

  return conclusions[topic];
}

function buildPlainExplanation(topic: ChartTopic, fact: ChartFact | undefined) {
  if (!fact) {
    return "落到现实里，目前只能给出保守观察，不能直接做强判断。";
  }

  return `落到现实里，${topic} 相关的重点会先看 ${fact.palace}，再结合主星和四化去判断倾向。`;
}

function buildSuggestion(topic: ChartTopic) {
  const suggestions: Record<ChartTopic, string> = {
    career: "先用两周整理目标、岗位条件和市场反馈，不急着做不可逆决定。",
    relationship: "先观察沟通里反复出现的模式，再决定怎么表达需求。",
    wealth: "先记录收入、支出和风险承受度，不把命盘当成投资指令。",
    personality: "先挑一个最想理解的行为模式，再回到命盘依据里看。",
    recent_fortune: "先把近期最重要的一件事拆小，避免同时推进太多方向。",
    general: "先从一个具体问题开始看，命盘解释会更清楚。",
  };

  return suggestions[topic];
}

function buildFollowUp(topic: ChartTopic) {
  const followUps: Record<ChartTopic, string> = {
    career: "你现在更想离开当前环境，还是想换一种工作内容？",
    relationship: "你更想看对方的相处模式，还是你们之间的沟通问题？",
    wealth: "你更关心赚钱方式、存钱压力，还是近期财务决策？",
    personality: "你最想理解自己的哪一种反复出现的行为模式？",
    recent_fortune: "你最近最想看的具体事情是哪一类？",
    general: "你想先看命宫、事业，还是感情相关的位置？",
  };

  return followUps[topic];
}
