/**
 * [INPUT]: Depends on Vercel AI SDK text streaming, deterministic agent core, chart tools, skills, and local knowledge
 * [OUTPUT]: Provides POST /api/chat streaming response and evidence metadata for the MVP chat surface
 * [POS]: App Router API boundary that wires session context, tool-grounded analysis, critic, evidence, and persistence
 * [PROTOCOL]: Update this header when changed, then check AGENTS.md
 */

import { randomUUID } from "node:crypto";

import { runResponseCritic } from "../../../lib/agent/critic";
import {
  deleteProfileRuntimeData,
  getChatRuntimeStores,
  persistChatMessage,
  recordRouteToolEvent,
} from "../../../lib/agent/chat-runtime";
import { routeIntent } from "../../../lib/agent/intent-router";
import {
  buildModelPrompt,
  generateModelResponse,
  normalizeModelSettings,
  type IncomingModelSettings,
} from "../../../lib/agent/model-provider";
import { buildAnalysisPlan } from "../../../lib/agent/planner";
import { composeResponse } from "../../../lib/agent/response-composer";
import { createAgentTools } from "../../../lib/agent/tools";
import type { CritiqueResult, Intent } from "../../../lib/domain/analysis";
import type { ChartFact, ChartTopic, CreateChartInput } from "../../../lib/domain/chart";
import { checkRateLimit } from "../../../lib/http/rate-limit";
import { loadSkill, type SkillId } from "../../../lib/knowledge/skill-loader";
import { searchKnowledge, type KnowledgeSource } from "../../../lib/knowledge/search";

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
  modelSettings?: IncomingModelSettings;
};

type ChatEvidence = {
  toolsUsed: string[];
  chartFacts: Array<Pick<ChartFact, "id" | "topic" | "palace" | "stars" | "transforms" | "patterns" | "rawText" | "confidence">>;
  knowledgeSources: KnowledgeSource[];
  critic: {
    status: "not_run" | "passed" | "needs_review";
    issues: string[];
  };
};

type StaticChartAnswer = {
  kind: "static";
  content: string;
  evidence: ChatEvidence;
};

type StreamingChartAnswer = {
  kind: "model_stream";
  deterministicContent: string;
  evidence: ChatEvidence;
  prompt: string;
  modelSettings: ReturnType<typeof normalizeModelSettings>;
};

type ChartAnswer = StaticChartAnswer | StreamingChartAnswer;

const chartTopics = new Set<Intent>([
  "career",
  "relationship",
  "wealth",
  "personality",
  "recent_fortune",
  "chart_explanation",
]);

export async function POST(request: Request) {
  const rateLimitResponse = enforceRateLimit(request, "POST");
  if (rateLimitResponse) return rateLimitResponse;

  const body = (await request.json()) as ChatRequestBody;
  const profileId = toUuid(body.profileId) ?? randomUUID();
  const conversationId = toUuid(body.conversationId) ?? randomUUID();
  const userContent = readLatestUserContent(body);
  const stores = getChatRuntimeStores();
  const toolEventStartIndex = stores.toolEvents.length;
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
        evidence: buildEvidence({
          toolEventStartIndex,
          chartFacts: [],
          knowledgeSources: [],
          critique: null,
        }),
      });
    }

    if (chartTopics.has(route.intent)) {
      const answer = await answerWithChartContext({
        tools,
        profileId,
        intent: route.intent,
        chartId: currentChart.data.chartId,
        plan,
        conversationId,
        toolEventStartIndex,
        userContent,
        modelSettings: normalizeModelSettings(body.modelSettings),
      });

      const metadata = { intent: route.intent, safetyLevel: plan.safetyLevel };

      return answer.kind === "model_stream"
        ? streamModelAndPersist({
            profileId,
            conversationId,
            deterministicContent: answer.deterministicContent,
            evidence: answer.evidence,
            metadata,
            modelSettings: answer.modelSettings,
            prompt: answer.prompt,
          })
        : await streamAndPersist({
            profileId,
            conversationId,
            content: answer.content,
            metadata,
            evidence: answer.evidence,
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
    evidence: buildEvidence({
      toolEventStartIndex,
      chartFacts: [],
      knowledgeSources: [],
      critique: null,
    }),
  });
}

export async function DELETE(request: Request) {
  const rateLimitResponse = enforceRateLimit(request, "DELETE");
  if (rateLimitResponse) return rateLimitResponse;

  const url = new URL(request.url);
  const profileId = toUuid(url.searchParams.get("profileId") ?? undefined);

  if (!profileId) {
    return new Response("valid profileId is required", { status: 400 });
  }

  await deleteProfileRuntimeData(profileId);

  return new Response(null, { status: 204 });
}

async function answerWithChartContext({
  tools,
  profileId,
  intent,
  chartId,
  plan,
  conversationId,
  toolEventStartIndex,
  userContent,
  modelSettings,
}: {
  tools: ReturnType<typeof createAgentTools>;
  profileId: string;
  intent: Intent;
  chartId: string;
  plan: ReturnType<typeof buildAnalysisPlan>;
  conversationId: string;
  toolEventStartIndex: number;
  userContent: string;
  modelSettings: ReturnType<typeof normalizeModelSettings>;
}): Promise<ChartAnswer> {
  const topic = toChartTopic(intent);
  const summary = await tools.summarizeChartFacts({
    chartId,
    topics: [topic],
  });
  const chartFacts = summary.ok ? summary.data.facts : [];
  const firstFact = chartFacts[0];

  await runSupplementalTools({ tools, chartId, topic, plan, firstFact });

  const skill = await loadRouteSkill(plan.requiredSkills[0]);
  const knowledgeSources = await searchRouteKnowledge(
    plan.knowledgeQueries[0] ?? topic,
    topic,
    firstFact,
  );

  await recordRouteToolEvent(
    profileId,
    conversationId,
    "loadSkill",
    { skillId: plan.requiredSkills[0] },
    skill,
    skill !== null,
  );
  await recordRouteToolEvent(
    profileId,
    conversationId,
    "searchKnowledge",
    { query: plan.knowledgeQueries[0], topic },
    knowledgeSources,
    knowledgeSources.length > 0,
  );

  const draft = composeResponse({
    conclusion: buildConclusion(topic),
    chartBasis:
      firstFact !== undefined
        ? [formatChartFact(firstFact)]
        : ["当前命盘事实不足，回答需要保持保守。"],
    plainExplanation: buildPlainExplanation(topic, firstFact, skill !== null, knowledgeSources),
    suggestion: buildSuggestion(topic),
    followUp: buildFollowUp(topic),
    analysisSteps: skill?.analysisSteps,
    knowledgeSources: knowledgeSources.map((source) => source.title),
  });
  const toolsUsed = getChatRuntimeStores()
    .toolEvents.slice(toolEventStartIndex)
    .map((event) => event.toolName);
  const critique = runResponseCritic({
    intent,
    draft,
    toolsUsed,
    chartFacts,
    knowledgeSources,
    safetyLevel: plan.safetyLevel,
  });
  await recordRouteToolEvent(
    profileId,
    conversationId,
    "runResponseCritic",
    { intent, draft },
    critique,
    critique.passed,
  );

  const deterministicContent = critique.passed
    ? draft
    : composeResponse({
        conclusion: "这个问题可以看，但我会先保守处理。",
        chartBasis: chartFacts.slice(0, 1).map(formatChartFact),
        plainExplanation:
          "目前依据不足以做很强的判断，所以更适合把它当成观察方向，而不是定论。",
        suggestion: "先补充具体背景，再结合命盘事实继续分析。",
        followUp: "你愿意先补充一下当前现实处境吗？",
      });
  if (modelSettings.enabled) {
    const prompt = buildModelPrompt({
      userContent,
      deterministicDraft: deterministicContent,
      chartFacts: chartFacts.map(formatChartFact),
      knowledgeSources: knowledgeSources.map(formatKnowledgeSource),
      criticStatus: critique.passed ? "passed" : "needs_review",
      criticIssues: critique.issues,
    });

    await recordRouteToolEvent(
      profileId,
      conversationId,
      "generateModelResponse",
      {
        provider: modelSettings.provider,
        baseUrl: modelSettings.baseUrl,
        model: modelSettings.model,
      },
      { streaming: true },
      true,
    );

    return {
      kind: "model_stream",
      deterministicContent,
      evidence: buildEvidence({
        toolEventStartIndex,
        chartFacts,
        knowledgeSources,
        critique,
      }),
      modelSettings,
      prompt,
    };
  }

  return {
    kind: "static",
    content: deterministicContent,
    evidence: buildEvidence({
      toolEventStartIndex,
      chartFacts,
      knowledgeSources,
      critique,
    }),
  };
}

async function runSupplementalTools({
  tools,
  chartId,
  topic,
  plan,
  firstFact,
}: {
  tools: ReturnType<typeof createAgentTools>;
  chartId: string;
  topic: ChartTopic;
  plan: ReturnType<typeof buildAnalysisPlan>;
  firstFact: ChartFact | undefined;
}) {
  if (plan.requiredTools.includes("getPalaceAnalysis") && firstFact) {
    await tools.getPalaceAnalysis({
      chartId,
      palace: firstFact.palace,
      topic,
    });
  }

  if (plan.requiredTools.includes("getStarAnalysis") && firstFact?.stars.length) {
    await tools.getStarAnalysis({
      chartId,
      stars: firstFact.stars.slice(0, 3),
      palace: firstFact.palace,
      topic,
    });
  }

  if (plan.requiredTools.includes("getPatternAnalysis")) {
    await tools.getPatternAnalysis({ chartId, topic });
  }

  if (plan.requiredTools.includes("getLuckCycle")) {
    await tools.getLuckCycle({
      chartId,
      date: new Date().toISOString().slice(0, 10),
      range: topic === "recent_fortune" ? "three_months" : "current",
      topic,
    });
  }
}

async function loadRouteSkill(skillId: string | undefined) {
  if (!skillId) return null;

  try {
    return await loadSkill(skillId as SkillId);
  } catch {
    return null;
  }
}

async function searchRouteKnowledge(
  query: string,
  topic: ChartTopic,
  fact: ChartFact | undefined,
) {
  try {
    return await searchKnowledge({
      query,
      topic,
      chartTerms: fact ? [fact.palace, ...fact.stars] : [],
      limit: 3,
      retrievalMode: "local",
    });
  } catch {
    return [];
  }
}

async function streamAndPersist({
  profileId,
  conversationId,
  content,
  metadata,
  evidence,
}: {
  profileId: string;
  conversationId: string;
  content: string;
  metadata: Record<string, unknown>;
  evidence: ChatEvidence;
}) {
  await persistChatMessage({
    conversationId,
    profileId,
    role: "assistant",
    content,
    metadata,
  });

  return new Response(textToStream(content), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "X-Ziwei-Evidence": encodeURIComponent(JSON.stringify(evidence)),
    },
  });
}

function streamModelAndPersist({
  profileId,
  conversationId,
  deterministicContent,
  metadata,
  evidence,
  modelSettings,
  prompt,
}: {
  profileId: string;
  conversationId: string;
  deterministicContent: string;
  metadata: Record<string, unknown>;
  evidence: ChatEvidence;
  modelSettings: ReturnType<typeof normalizeModelSettings>;
  prompt: string;
}) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const modelResult = await generateModelResponse({
        settings: modelSettings,
        prompt,
        onToken: (token) => controller.enqueue(encoder.encode(token)),
      });
      const content = modelResult.ok ? modelResult.content : deterministicContent;

      if (!modelResult.ok) {
        controller.enqueue(encoder.encode(deterministicContent));
      }

      await persistChatMessage({
        conversationId,
        profileId,
        role: "assistant",
        content,
        metadata,
      });
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "X-Ziwei-Evidence": encodeURIComponent(JSON.stringify(evidence)),
    },
  });
}

function buildEvidence({
  toolEventStartIndex,
  chartFacts,
  knowledgeSources,
  critique,
}: {
  toolEventStartIndex: number;
  chartFacts: ChartFact[];
  knowledgeSources: KnowledgeSource[];
  critique: CritiqueResult | null;
}): ChatEvidence {
  return {
    toolsUsed: getChatRuntimeStores()
      .toolEvents.slice(toolEventStartIndex)
      .map((event) => event.toolName),
    chartFacts: chartFacts.map((fact) => ({
      id: fact.id,
      topic: fact.topic,
      palace: fact.palace,
      stars: fact.stars,
      transforms: fact.transforms,
      patterns: fact.patterns,
      rawText: fact.rawText,
      confidence: fact.confidence,
    })),
    knowledgeSources,
    critic: {
      status: critique === null ? "not_run" : critique.passed ? "passed" : "needs_review",
      issues: critique?.issues ?? [],
    },
  };
}

function textToStream(content: string) {
  const encoder = new TextEncoder();

  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunkText(content, 32)) {
        controller.enqueue(encoder.encode(chunk));
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

function enforceRateLimit(request: Request, method: "POST" | "DELETE") {
  const decision = checkRateLimit({
    request,
    route: "/api/chat",
    method,
  });

  if (decision.allowed) return null;

  return new Response("rate limit exceeded", {
    status: 429,
    headers: {
      "Retry-After": decision.retryAfterSeconds.toString(),
    },
  });
}

function toUuid(value: string | undefined) {
  if (!value) return undefined;
  const match = value.match(
    /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i,
  );

  return match?.[0];
}

function toChartTopic(intent: Intent): ChartTopic {
  return intent === "chart_explanation" ? "general" : (intent as ChartTopic);
}

function formatChartFact(fact: ChartFact) {
  const starText = fact.stars.length > 0 ? `主星 ${fact.stars.join("、")}` : "暂无主星";
  const transformText =
    fact.transforms.length > 0 ? `，四化 ${fact.transforms.join("、")}` : "";

  return `${fact.palace}：${starText}${transformText}。${fact.rawText}`;
}

function formatKnowledgeSource(source: KnowledgeSource) {
  return `${source.title}（${source.source} / ${source.school}）：${source.excerpt}`;
}

function buildConclusion(topic: ChartTopic) {
  const conclusions: Record<ChartTopic, string> = {
    career: "你最近更适合先观察机会，再决定要不要行动。",
    relationship: "这段关系更适合先看互动模式，而不是急着下定论。",
    wealth: "这个问题更适合先看赚钱方式和风险节奏。",
    personality: "这张盘能看出一些稳定倾向，但不能用单一标签概括你。",
    recent_fortune: "近期重点更像是整理优先级，避免被情绪推着走。",
    general: "这张盘可以先从核心宫位和主星开始理解。",
  };

  return conclusions[topic];
}

function buildPlainExplanation(
  topic: ChartTopic,
  fact: ChartFact | undefined,
  hasSkill: boolean,
  knowledgeSources: KnowledgeSource[],
) {
  const supportNotes: string[] = [];
  if (!hasSkill) supportNotes.push("当前还没有加载到完整技能流程");
  if (knowledgeSources.length === 0) supportNotes.push("本地知识库没有命中可用条目");
  const supportText =
    supportNotes.length > 0 ? `（${supportNotes.join("，")}，所以我会保守表达。）` : "";

  if (!fact) {
    return `落到现实里，目前只能给出保守观察，不能直接做强判断。${supportText}`;
  }

  return `落到现实里，${topicLabel(topic)} 会先看 ${fact.palace}，再结合主星、四化和当前问题判断倾向。${supportText}`;
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

function topicLabel(topic: ChartTopic) {
  const labels: Record<ChartTopic, string> = {
    career: "事业工作",
    relationship: "感情关系",
    wealth: "财富节奏",
    personality: "性格倾向",
    recent_fortune: "近期运势",
    general: "命盘结构",
  };

  return labels[topic];
}
