/**
 * [INPUT]: Depends on Vercel AI SDK text streaming, deterministic agent core, chart tools, skills, and local knowledge
 * [OUTPUT]: Provides POST /api/chat streaming response and evidence metadata for the MVP chat surface
 * [POS]: App Router API boundary that wires session context, tool-grounded analysis, critic, evidence, and persistence
 * [PROTOCOL]: Update this header when changed, then check AGENTS.md
 */

import { randomUUID } from "node:crypto";

import { runResponseCritic } from "../../../lib/agent/critic";
import {
  chatStreamHeader,
  encodeChatStreamEvent,
} from "../../../lib/agent/evidence-events";
import {
  createRequestStores,
  deleteProfileRuntimeData,
  getChartPersistence,
  mergeRequestStoresToSnapshot,
  persistChatMessage,
  recordRouteToolEventToStores,
} from "../../../lib/agent/chat-runtime";
import { routeIntent } from "../../../lib/agent/intent-router";
import { generateLlmAnalysis, reviseLlmAnalysis } from "../../../lib/agent/llm-analyst";
import type { LlmResponseMode } from "../../../lib/agent/llm-analyst";
import { createLlmAnalysisPlan } from "../../../lib/agent/llm-planner";
import { buildConversationContext } from "../../../lib/agent/conversation-context";
import {
  normalizeModelSettings,
  type IncomingModelSettings,
} from "../../../lib/agent/model-provider";
import { buildAnalysisPlan } from "../../../lib/agent/planner";
import { composeResponse } from "../../../lib/agent/response-composer";
import { createAgentTools, type InMemoryToolStores } from "../../../lib/agent/tools";
import type { CritiqueResult, Intent } from "../../../lib/domain/analysis";
import type { ChartFact, ChartTopic, CreateChartInput } from "../../../lib/domain/chart";
import { getDatabaseClient } from "../../../lib/db/client";
import { createPostgresKnowledgeRetriever } from "../../../lib/db/knowledge-retrieval";
import { checkRateLimit } from "../../../lib/http/rate-limit";
import { loadSkill, type SkillId } from "../../../lib/knowledge/skill-loader";
import { searchKnowledge, type KnowledgeSource } from "../../../lib/knowledge/search";
import type { EvidenceGeneration } from "../../../lib/ui/chat-evidence";

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
  evidenceRunId?: string;
};

type ChatEvidence = {
  toolsUsed: string[];
  chartFacts: Array<Pick<ChartFact, "id" | "topic" | "palace" | "stars" | "transforms" | "patterns" | "rawText" | "confidence">>;
  knowledgeSources: KnowledgeSource[];
  critic: {
    status: "not_run" | "passed" | "needs_review";
    issues: string[];
  };
  generation: EvidenceGeneration;
  runs: Array<{
    runId: string;
    title: string;
    summary: string;
    status: "running" | "completed" | "failed";
    startedAt: string;
    completedAt: string;
    steps: Array<{
      id: string;
      label: string;
      detail: string;
      status: "pending" | "running" | "completed" | "failed";
    }>;
  }>;
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
  analysisContext: {
    userContent: string;
    deterministicDraft: string;
    chartFacts: string[];
    skillSteps: string[];
    knowledgeSources: string[];
    criticStatus: "not_run" | "passed" | "needs_review";
    criticIssues: string[];
    conversationContext: string;
    responseMode: LlmResponseMode;
    hasChart?: boolean;
  };
  modelSettings: ReturnType<typeof normalizeModelSettings>;
  postCriticContext: {
    intent: Intent;
    chartFacts: ChartFact[];
    knowledgeSources: KnowledgeSource[];
    safetyLevel: ReturnType<typeof buildAnalysisPlan>["safetyLevel"];
  };
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
  const conversationContext = buildConversationContext(body.messages ?? []);
  const stores = createRequestStores();
  const toolEventStartIndex = 0; // always 0 for request-scoped stores
  const tools = createAgentTools({ stores, chartPersistence: getChartPersistence() });
  const evidenceRunId = body.evidenceRunId ?? randomUUID();

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
  const modelSettings = normalizeModelSettings(body.modelSettings);
  const hasChart = stores.primaryChartByProfileId.has(profileId);

  if (route.requiresChart) {
    const currentChart = await tools.getCurrentChart({ profileId, conversationId });
    if (!currentChart.ok) {
      return await streamAndPersist({
        stores,
        profileId,
        conversationId,
        content:
          "请先创建一张命盘，我才能基于确定性排盘给你分析。你可以提供出生日期、出生时间、性别和历法类型。",
        metadata: { intent: route.intent, safetyLevel: route.safetyLevel },
    evidence: buildEvidence({
      stores,
      runId: evidenceRunId,
      toolEventStartIndex,
      chartFacts: [],
          knowledgeSources: [],
          critique: null,
        }),
      });
    }

    if (chartTopics.has(route.intent)) {
      const answer = await answerWithChartContext({
        stores,
        tools,
        profileId,
        intent: route.intent,
        chartId: currentChart.data.chartId,
        plan,
        conversationId,
        toolEventStartIndex,
        userContent,
        conversationContext,
        modelSettings: modelSettings,
        evidenceRunId,
      });

      const metadata = { intent: route.intent, safetyLevel: plan.safetyLevel };

      return answer.kind === "model_stream"
        ? streamModelAndPersist({
            stores,
            profileId,
            conversationId,
            evidence: answer.evidence,
            analysisContext: answer.analysisContext,
            postCriticContext: answer.postCriticContext,
            metadata,
            modelSettings: answer.modelSettings,
          })
        : await streamAndPersist({
            stores,
            profileId,
            conversationId,
            content: answer.content,
            metadata,
            evidence: answer.evidence,
          });
    }
  }

  // Hard refusals stay as-is regardless of model settings
  if (route.intent === "out_of_scope" || route.intent === "safety_sensitive") {
    const refusal =
      route.intent === "out_of_scope"
        ? "Ziwei Chat 首版只处理紫微斗数相关问题，暂不做八字、塔罗、风水或其他体系。你可以问我事业、感情、财富、性格或近期运势。"
        : "这个问题涉及高风险领域，我不适合给出具体建议。";
    return await streamAndPersist({
      stores,
      profileId,
      conversationId,
      content: refusal,
      metadata: { intent: route.intent, safetyLevel: route.safetyLevel },
      evidence: buildEvidence({ stores, runId: evidenceRunId, toolEventStartIndex, chartFacts: [], knowledgeSources: [], critique: null }),
    });
  }

  // For general chat: if model is configured, answer directly with LLM (like a normal chatbot).
  // The fallback stays neutral because chart availability is explicit request state.
  if (modelSettings.enabled) {
    const generalChatFallback = "我在。你想聊什么？";
    return streamModelAndPersist({
      stores,
      profileId,
      conversationId,
      metadata: { intent: route.intent, safetyLevel: route.safetyLevel },
      evidence: buildEvidence({ stores, runId: evidenceRunId, toolEventStartIndex, chartFacts: [], knowledgeSources: [], critique: null }),
      modelSettings,
      analysisContext: {
        userContent,
        deterministicDraft: generalChatFallback,
        chartFacts: [],
        skillSteps: [],
        knowledgeSources: [],
        criticStatus: "not_run",
        criticIssues: [],
        conversationContext,
        responseMode: "conversation",
        hasChart,
      },
      postCriticContext: {
        intent: route.intent as Intent,
        chartFacts: [],
        knowledgeSources: [],
        safetyLevel: route.safetyLevel,
      },
    });
  }

  const fallback = "我在。你想聊什么？";

  return await streamAndPersist({
    stores,
    profileId,
    conversationId,
    content: fallback,
    metadata: { intent: route.intent, safetyLevel: route.safetyLevel },
    evidence: buildEvidence({ stores, runId: evidenceRunId, toolEventStartIndex, chartFacts: [], knowledgeSources: [], critique: null }),
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
  stores,
  tools,
  profileId,
  intent,
  chartId,
  plan,
  conversationId,
  toolEventStartIndex,
  userContent,
  conversationContext,
  modelSettings,
  evidenceRunId,
}: {
  stores: InMemoryToolStores;
  tools: ReturnType<typeof createAgentTools>;
  profileId: string;
  intent: Intent;
  chartId: string;
  plan: ReturnType<typeof buildAnalysisPlan>;
  conversationId: string;
  toolEventStartIndex: number;
  userContent: string;
  conversationContext: string;
  modelSettings: ReturnType<typeof normalizeModelSettings>;
  evidenceRunId: string;
}): Promise<ChartAnswer> {
  const topic = toChartTopic(intent);
  const summary = await tools.summarizeChartFacts({
    chartId,
    topics: [topic],
  });
  const chartFacts = summary.ok ? summary.data.facts : [];
  const firstFact = chartFacts[0];
  const agentPlan = await createLlmAnalysisPlan({
    settings: modelSettings,
    userContent,
    route: {
      intent,
      confidence: 0.82,
      requiresChart: true,
      safetyLevel: plan.safetyLevel,
      rationale: "Route already resolved before chart analysis.",
    },
    deterministicPlan: plan,
    chartFacts,
    conversationContext,
  });
  await recordRouteToolEventToStores(
    stores,
    profileId,
    conversationId,
    "createAnalysisPlan",
    { intent, deterministicPlan: plan },
    agentPlan,
    true,
  );

  await runSupplementalTools({ tools, chartId, topic, plan: agentPlan, firstFact });

  const skill = await loadRouteSkill(agentPlan.requiredSkills[0]);
  const knowledgeSources = await searchRouteKnowledge(
    agentPlan.knowledgeQueries[0] ?? topic,
    topic,
    firstFact,
    modelSettings,
  );

  await recordRouteToolEventToStores(
    stores,
    profileId,
    conversationId,
    "loadSkill",
    { skillId: agentPlan.requiredSkills[0] },
    skill,
    skill !== null,
  );
  await recordRouteToolEventToStores(
    stores,
    profileId,
    conversationId,
    "searchKnowledge",
    { query: agentPlan.knowledgeQueries[0], topic },
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
  const toolsUsed = stores.toolEvents.slice(toolEventStartIndex).map((event) => event.toolName);
  const critique = runResponseCritic({
    intent,
    draft,
    toolsUsed,
    chartFacts,
    knowledgeSources,
    safetyLevel: agentPlan.safetyLevel,
  });
  await recordRouteToolEventToStores(
    stores,
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
    await recordRouteToolEventToStores(
      stores,
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
      analysisContext: {
        userContent,
        deterministicDraft: deterministicContent,
        chartFacts: chartFacts.map(formatChartFact),
        skillSteps: skill?.analysisSteps ?? [],
        knowledgeSources: knowledgeSources.map(formatKnowledgeSource),
        criticStatus: critique.passed ? "passed" : "needs_review",
        criticIssues: critique.issues,
        conversationContext,
        responseMode: "analysis",
      },
      evidence: buildEvidence({
        stores,
        runId: evidenceRunId,
        toolEventStartIndex,
        chartFacts,
        knowledgeSources,
        critique,
        generation: { mode: "model_pending", detail: "等待回答模型完成分析" },
      }),
      modelSettings,
      postCriticContext: {
        intent,
        chartFacts,
        knowledgeSources,
        safetyLevel: agentPlan.safetyLevel,
      },
    };
  }

  return {
    kind: "static",
    content:
      "我已读取这次问题所需的命盘事实，但当前没有可用的回答模型。请先在设置中配置回答模型；模型就绪后，我会基于这些事实、skill 和知识库完成分析。",
    evidence: buildEvidence({
      stores,
      runId: evidenceRunId,
      toolEventStartIndex,
      chartFacts,
      knowledgeSources,
      critique,
      generation: { mode: "model_required", detail: "未配置可用的回答模型" },
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
  modelSettings: ReturnType<typeof normalizeModelSettings>,
) {
  try {
    return await searchKnowledge({
      query,
      topic,
      chartTerms: fact ? [fact.palace, ...fact.stars] : [],
      limit: 3,
      retrievalMode: modelSettings.embedding.enabled ? "hybrid" : "local",
      embeddingSettings: modelSettings.embedding,
      vectorSearch:
        modelSettings.embedding.enabled && process.env.DATABASE_URL
          ? createPostgresKnowledgeRetriever(getDatabaseClient()).search
          : undefined,
    });
  } catch {
    return [];
  }
}

async function streamAndPersist({
  stores,
  profileId,
  conversationId,
  content,
  metadata,
  evidence,
}: {
  stores: InMemoryToolStores;
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
  mergeRequestStoresToSnapshot(stores);

  return new Response(textToStream(content), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "X-Ziwei-Evidence": encodeURIComponent(JSON.stringify(evidence)),
    },
  });
}

function streamModelAndPersist({
  stores,
  profileId,
  conversationId,
  metadata,
  evidence,
  modelSettings,
  analysisContext,
  postCriticContext,
}: {
  stores: InMemoryToolStores;
  profileId: string;
  conversationId: string;
  metadata: Record<string, unknown>;
  evidence: ChatEvidence;
  modelSettings: ReturnType<typeof normalizeModelSettings>;
  analysisContext: StreamingChartAnswer["analysisContext"];
  postCriticContext: StreamingChartAnswer["postCriticContext"];
}) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
      enqueueEvent(controller, encoder, {
        event: "evidence",
        data: updateEvidenceRunStep(evidence, "model", "running", "模型正在综合命盘、skill 和 RAG。"),
      });
      // Buffer model output fully so critic can gate before any token reaches client
      const modelResult = await generateLlmAnalysis({
        settings: modelSettings,
        ...analysisContext,
      });
      if (!modelResult.ok) {
        const finalEvidence = updateEvidenceAfterModelCritic({
          evidence,
          critique: { passed: false, issues: [modelResult.error], requiredRevision: false },
          usedFallback: true,
          modelError: modelResult.error,
          revisionAttempted: false,
        });
        enqueueEvent(controller, encoder, { event: "evidence", data: finalEvidence });
        mergeRequestStoresToSnapshot(stores);
        enqueueEvent(controller, encoder, { event: "error", data: modelFailureEvent() });
        enqueueEvent(controller, encoder, { event: "done", data: null });
        controller.close();
        return;
      }
      const modelContent = modelResult.content;
      enqueueEvent(controller, encoder, {
        event: "evidence",
        data: updateEvidenceRunStep(evidence, "critic", "running", "正在检查模型回答的事实边界。"),
      });
      let candidateContent = modelContent;
      let postCritique = runResponseCritic({
        intent: postCriticContext.intent,
        draft: candidateContent,
        toolsUsed: evidence.toolsUsed,
        chartFacts: postCriticContext.chartFacts,
        knowledgeSources: postCriticContext.knowledgeSources,
        safetyLevel: postCriticContext.safetyLevel,
      });
      let revisionAttempted = false;

      if (modelResult.ok && !postCritique.passed) {
        revisionAttempted = true;
        enqueueEvent(controller, encoder, {
          event: "evidence",
          data: updateEvidenceRunStep(evidence, "model", "running", "模型首版未通过检查，正在按 critic 意见修订。"),
        });
        const revision = await reviseLlmAnalysis({
          settings: modelSettings,
          ...analysisContext,
          failedContent: candidateContent,
          finalCriticIssues: postCritique.issues,
        });

        if (revision.ok) {
          candidateContent = revision.content;
          postCritique = runResponseCritic({
            intent: postCriticContext.intent,
            draft: candidateContent,
            toolsUsed: evidence.toolsUsed,
            chartFacts: postCriticContext.chartFacts,
            knowledgeSources: postCriticContext.knowledgeSources,
            safetyLevel: postCriticContext.safetyLevel,
          });
        }
      }
      await recordRouteToolEventToStores(
        stores,
        profileId,
        conversationId,
        "runModelResponseCritic",
        {
          intent: postCriticContext.intent,
          draft: candidateContent,
          modelError: null,
          revisionAttempted,
        },
        postCritique,
        postCritique.passed,
      );
      const usedFallback = !postCritique.passed;
      const finalEvidence = updateEvidenceAfterModelCritic({
        evidence,
        critique: postCritique,
        usedFallback,
        modelError: null,
        revisionAttempted,
      });

      enqueueEvent(controller, encoder, { event: "evidence", data: finalEvidence });
      if (usedFallback) {
        mergeRequestStoresToSnapshot(stores);
        enqueueEvent(controller, encoder, { event: "error", data: modelFailureEvent() });
        enqueueEvent(controller, encoder, { event: "done", data: null });
        controller.close();
        return;
      }
      for (const chunk of chunkText(candidateContent, 32)) {
        enqueueEvent(controller, encoder, { event: "token", data: chunk });
      }

      await persistChatMessage({
        conversationId,
        profileId,
        role: "assistant",
        content: candidateContent,
        metadata,
      });
      mergeRequestStoresToSnapshot(stores);
      enqueueEvent(controller, encoder, { event: "done", data: null });
      controller.close();
      } catch (error) {
        // Ensure stream always closes so client doesn't hang indefinitely
        const errorEvidence = updateEvidenceAfterModelCritic({
          evidence,
          critique: { passed: false, issues: [error instanceof Error ? error.message : "未知错误"], requiredRevision: false },
          usedFallback: true,
          modelError: error instanceof Error ? error.message : "未知错误",
          revisionAttempted: false,
        });
        try {
          enqueueEvent(controller, encoder, { event: "evidence", data: errorEvidence });
          mergeRequestStoresToSnapshot(stores);
          enqueueEvent(controller, encoder, { event: "error", data: modelFailureEvent() });
          enqueueEvent(controller, encoder, { event: "done", data: null });
        } catch {
          // ignore enqueue errors if controller is already closed
        }
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ziwei-events; charset=utf-8",
      "X-Ziwei-Stream": chatStreamHeader,
      "X-Ziwei-Evidence": encodeURIComponent(JSON.stringify(evidence)),
    },
  });
}

function modelFailureEvent() {
  return {
    message: "本次 LLM 分析未完成，请检查设置中的模型配置或网络连接后重试。",
    canRetry: true,
  };
}

function enqueueEvent(
  controller: ReadableStreamDefaultController<Uint8Array>,
  encoder: TextEncoder,
  event: Parameters<typeof encodeChatStreamEvent>[0],
) {
  controller.enqueue(encoder.encode(encodeChatStreamEvent(event)));
}

function updateEvidenceRunStep(
  evidence: ChatEvidence,
  stepId: string,
  status: ChatEvidence["runs"][number]["steps"][number]["status"],
  detail: string,
): ChatEvidence {
  return {
    ...evidence,
    runs: evidence.runs.map((run) => ({
      ...run,
      status: status === "failed" ? "failed" : "running",
      steps: run.steps.map((step) =>
        step.id === stepId
          ? {
              ...step,
              status,
              detail,
            }
          : step,
      ),
    })),
  };
}

function updateEvidenceAfterModelCritic({
  evidence,
  critique,
  usedFallback,
  modelError,
  revisionAttempted,
}: {
  evidence: ChatEvidence;
  critique: CritiqueResult;
  usedFallback: boolean;
  modelError: string | null;
  revisionAttempted: boolean;
}): ChatEvidence {
  const fallbackReason = modelError
    ? `模型请求失败：${modelError}`
    : revisionAttempted
      ? "模型修订后仍未通过最终检查，已降级为保守回答。"
      : "模型输出未通过最终检查，已降级为保守回答。";

  return {
    ...evidence,
    generation: usedFallback
      ? { mode: "model_failed", detail: fallbackReason }
      : { mode: "model", detail: "已通过最终事实与安全检查" },
    critic: {
      status: critique.passed ? "passed" : "needs_review",
      issues: modelError ? [fallbackReason, ...critique.issues] : critique.issues,
    },
    runs: evidence.runs.map((run) => ({
      ...run,
      status: usedFallback ? "failed" : "completed",
      completedAt: new Date().toISOString(),
      summary: usedFallback
        ? `${run.summary} 模型输出未通过最终检查，已降级为保守回答。`
        : `${run.summary} 模型输出已通过最终检查。`,
      steps: run.steps.map((step) => {
        if (step.id === "model") {
          return {
            ...step,
            status: "completed",
            detail: usedFallback ? "模型输出已生成，但最终采用保守回答" : "模型已完成综合分析",
          };
        }

        if (step.id === "critic") {
          return {
            ...step,
            status: critique.passed ? "completed" : "failed",
            detail: critique.passed ? "模型输出已通过最终检查" : critique.issues.join("；"),
          };
        }

        return step.status === "running" ? { ...step, status: "completed" } : step;
      }),
    })),
  };
}

function buildEvidence({
  stores,
  runId,
  toolEventStartIndex,
  chartFacts,
  knowledgeSources,
  critique,
  generation = { mode: "not_applicable" },
}: {
  stores: InMemoryToolStores;
  runId: string;
  toolEventStartIndex: number;
  chartFacts: ChartFact[];
  knowledgeSources: KnowledgeSource[];
  critique: CritiqueResult | null;
  generation?: EvidenceGeneration;
}): ChatEvidence {
  const toolsUsed = stores.toolEvents.slice(toolEventStartIndex).map((event) => event.toolName);
  const critic = {
    status: critique === null ? ("not_run" as const) : critique.passed ? ("passed" as const) : ("needs_review" as const),
    issues: critique?.issues ?? [],
  };
  const completedAt = new Date().toISOString();

  return {
    toolsUsed,
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
    critic,
    generation,
    runs: [
      {
        runId,
        title: "本次分析",
        summary: `调用 ${toolsUsed.length} 个工具，读取 ${chartFacts.length} 条命盘事实，检索 ${knowledgeSources.length} 条知识。`,
        status:
          generation.mode === "model_required" || generation.mode === "model_failed" || critic.status === "needs_review"
            ? "failed"
            : "completed",
        startedAt: "",
        completedAt,
        steps: buildEvidenceSteps({ toolsUsed, chartFacts, knowledgeSources, critic, generation }),
      },
    ],
  };
}

function buildEvidenceSteps({
  toolsUsed,
  chartFacts,
  knowledgeSources,
  critic,
  generation,
}: Pick<ChatEvidence, "toolsUsed" | "knowledgeSources" | "critic" | "generation"> & {
  chartFacts: ChartFact[];
}): ChatEvidence["runs"][number]["steps"] {
  return [
    {
      id: "intent",
      label: "理解问题",
      detail: "识别主题与安全边界",
      status: "completed",
    },
    {
      id: "chart",
      label: "读取命盘",
      detail:
        chartFacts.length > 0
          ? `提取 ${chartFacts.length} 条命盘事实`
          : toolsUsed.includes("getCurrentChart")
            ? "已尝试读取命盘"
            : "未进入命盘读取",
      status: chartFacts.length > 0 ? "completed" : "pending",
    },
    {
      id: "plan",
      label: "生成计划",
      detail: toolsUsed.length > 0 ? "确定需要调用的工具与知识" : "使用基础回复流程",
      status: toolsUsed.length > 0 ? "completed" : "pending",
    },
    {
      id: "tools",
      label: "调用工具",
      detail: toolsUsed.length > 0 ? toolsUsed.map(labelToolForEvidence).join("、") : "暂无工具调用",
      status: toolsUsed.length > 0 ? "completed" : "pending",
    },
    {
      id: "skill",
      label: "加载 skill",
      detail: toolsUsed.includes("loadSkill") ? "已加载主题分析流程" : "未加载主题分析流程",
      status: toolsUsed.includes("loadSkill") ? "completed" : "pending",
    },
    {
      id: "rag",
      label: "检索知识",
      detail:
        knowledgeSources.length > 0
          ? `命中 ${knowledgeSources.length} 条知识来源`
          : toolsUsed.includes("searchKnowledge")
            ? "已检索，未命中高相关知识"
            : "未检索知识库",
      status: knowledgeSources.length > 0 ? "completed" : toolsUsed.includes("searchKnowledge") ? "completed" : "pending",
    },
    {
      id: "model",
      label: "模型分析",
      detail:
        generation.mode === "model_required"
          ? "未配置可用的回答模型"
          : generation.mode === "model_failed"
            ? generation.detail ?? "模型生成未完成"
            : toolsUsed.includes("generateModelResponse")
              ? "已交给配置模型生成分析"
              : "尚未进入模型生成",
      status:
        generation.mode === "model_failed"
          ? "failed"
          : generation.mode === "model_required"
            ? "pending"
            : toolsUsed.includes("generateModelResponse")
              ? "completed"
              : "pending",
    },
    {
      id: "critic",
      label: "critic 检查",
      detail:
        critic.status === "passed"
          ? "已通过事实与安全检查"
          : critic.status === "needs_review"
            ? critic.issues.join("；")
            : "尚未运行",
      status:
        critic.status === "passed"
          ? "completed"
          : critic.status === "needs_review"
            ? "failed"
            : "pending",
    },
  ];
}

function labelToolForEvidence(toolName: string) {
  const labels: Record<string, string> = {
    createChart: "创建命盘",
    getCurrentChart: "读取命盘",
    summarizeChartFacts: "提取事实",
    getPalaceAnalysis: "宫位分析",
    getStarAnalysis: "星曜分析",
    getPatternAnalysis: "格局分析",
    getLuckCycle: "运限分析",
    createAnalysisPlan: "生成计划",
    loadSkill: "skill",
    searchKnowledge: "RAG",
    runResponseCritic: "critic",
    generateModelResponse: "LLM",
  };

  return labels[toolName] ?? toolName;
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
