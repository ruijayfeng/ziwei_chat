/**
 * [INPUT]: Depends on chat API response headers and structured evidence metadata
 * [OUTPUT]: Provides evidence parsing, timeline run helpers, and UI-ready evidence state contracts
 * [POS]: UI support module between /api/chat evidence snapshots/events and evidence-drawer rendering
 * [PROTOCOL]: Update this header when changed, then check AGENTS.md
 */

export type EvidenceChartFact = {
  id: string;
  topic: string;
  palace: string;
  stars: string[];
  transforms: string[];
  patterns: string[];
  rawText: string;
  confidence: "high" | "medium" | "low";
};

export type EvidenceKnowledgeSource = {
  chunkId: string;
  title: string;
  source: string;
  sourcePath: string;
  sourceUrl: string;
  license: string;
  school: string;
  confidence: "high" | "medium" | "low";
  excerpt: string;
  retrievalMode: "local" | "vector" | "hybrid";
};

export type EvidenceStep = {
  id: string;
  label: string;
  detail: string;
  status: "pending" | "running" | "completed" | "failed";
};

export type EvidenceRun = {
  runId: string;
  title: string;
  summary: string;
  status: "running" | "completed" | "failed";
  startedAt: string;
  completedAt: string;
  steps: EvidenceStep[];
};

export type EvidenceState = {
  toolsUsed: string[];
  chartFacts: EvidenceChartFact[];
  knowledgeSources: EvidenceKnowledgeSource[];
  critic: {
    status: "not_run" | "passed" | "needs_review";
    issues: string[];
  };
  runs: EvidenceRun[];
};

export const initialEvidence: EvidenceState = {
  toolsUsed: [],
  chartFacts: [],
  knowledgeSources: [],
  critic: {
    status: "not_run",
    issues: [],
  },
  runs: [],
};

export function evidenceFromResponse(response: Response): EvidenceState {
  const encoded = response.headers.get("X-Ziwei-Evidence");
  if (!encoded) return initialEvidence;

  try {
    return normalizeEvidence(JSON.parse(decodeURIComponent(encoded)));
  } catch {
    return initialEvidence;
  }
}

export function mergeEvidenceRun(base: EvidenceState, run: EvidenceRun): EvidenceState {
  const index = base.runs.findIndex((item) => item.runId === run.runId);
  const runs =
    index === -1
      ? [...base.runs, run]
      : base.runs.map((item, itemIndex) => (itemIndex === index ? run : item));

  return { ...base, runs };
}

export function evidenceKnowledgeSourceLabel(source: EvidenceKnowledgeSource) {
  const sourceLabel =
    source.source === "Renhuai123/ziwei-doushu"
      ? "开源资料"
      : source.source === "curated-internal" || source.source === "curated"
        ? "项目整理"
        : source.source || "知识来源";
  const retrievalLabel =
    source.retrievalMode === "local"
      ? "本地检索"
      : source.retrievalMode === "vector"
        ? "向量检索"
        : "混合检索";

  return [sourceLabel, source.license, retrievalLabel].filter(Boolean).join(" · ");
}

function normalizeEvidence(value: unknown): EvidenceState {
  if (!isRecord(value)) return initialEvidence;

  const toolsUsed = readStringArray(value.toolsUsed);
  const chartFacts = Array.isArray(value.chartFacts)
    ? value.chartFacts.map(readChartFact).filter(isEvidenceChartFact)
    : [];
  const knowledgeSources = Array.isArray(value.knowledgeSources)
    ? value.knowledgeSources.map(readKnowledgeSource).filter(isEvidenceKnowledgeSource)
    : [];
  const critic = readCritic(value.critic);
  const explicitRuns = Array.isArray(value.runs)
    ? value.runs.map(readEvidenceRun).filter(isEvidenceRun)
    : [];

  return {
    toolsUsed,
    chartFacts,
    knowledgeSources,
    critic,
    runs:
      explicitRuns.length > 0
        ? explicitRuns
        : buildLegacyRun({ toolsUsed, chartFacts, knowledgeSources, critic }),
  };
}

function readChartFact(value: unknown): EvidenceChartFact | null {
  if (!isRecord(value)) return null;

  const confidence = readConfidence(value.confidence);
  if (!confidence) return null;

  return {
    id: readString(value.id),
    topic: readString(value.topic),
    palace: readString(value.palace),
    stars: readStringArray(value.stars),
    transforms: readStringArray(value.transforms),
    patterns: readStringArray(value.patterns),
    rawText: readString(value.rawText),
    confidence,
  };
}

function readKnowledgeSource(value: unknown): EvidenceKnowledgeSource | null {
  if (!isRecord(value)) return null;

  const confidence = readConfidence(value.confidence);
  const retrievalMode = readRetrievalMode(value.retrievalMode);
  if (!confidence || !retrievalMode) return null;

  return {
    chunkId: readString(value.chunkId),
    title: readString(value.title),
    source: readString(value.source),
    sourcePath: readString(value.sourcePath),
    sourceUrl: readString(value.sourceUrl),
    license: readString(value.license),
    school: readString(value.school),
    confidence,
    excerpt: readString(value.excerpt),
    retrievalMode,
  };
}

function readCritic(value: unknown): EvidenceState["critic"] {
  if (!isRecord(value)) return initialEvidence.critic;
  const status =
    value.status === "passed" || value.status === "needs_review" || value.status === "not_run"
      ? value.status
      : "not_run";

  return {
    status,
    issues: readStringArray(value.issues),
  };
}

function readEvidenceRun(value: unknown): EvidenceRun | null {
  if (!isRecord(value)) return null;
  const status = readRunStatus(value.status);
  if (!status) return null;

  return {
    runId: readString(value.runId),
    title: readString(value.title),
    summary: readString(value.summary),
    status,
    startedAt: readString(value.startedAt),
    completedAt: readString(value.completedAt),
    steps: Array.isArray(value.steps)
      ? value.steps.map(readEvidenceStep).filter(isEvidenceStep)
      : [],
  };
}

function readEvidenceStep(value: unknown): EvidenceStep | null {
  if (!isRecord(value)) return null;
  const status = readStepStatus(value.status);
  if (!status) return null;

  return {
    id: readString(value.id),
    label: readString(value.label),
    detail: readString(value.detail),
    status,
  };
}

function buildLegacyRun({
  toolsUsed,
  chartFacts,
  knowledgeSources,
  critic,
}: Pick<EvidenceState, "toolsUsed" | "chartFacts" | "knowledgeSources" | "critic">) {
  if (
    toolsUsed.length === 0 &&
    chartFacts.length === 0 &&
    knowledgeSources.length === 0 &&
    critic.status === "not_run"
  ) {
    return [];
  }

  return [
    {
      runId: `legacy-${toolsUsed.join("-") || "response"}`,
      title: "本次分析",
      summary: `调用 ${toolsUsed.length} 个工具，读取 ${chartFacts.length} 条命盘事实，检索 ${knowledgeSources.length} 条知识。`,
      status: critic.status === "needs_review" ? "failed" : "completed",
      startedAt: "",
      completedAt: "",
      steps: [
        {
          id: "intent",
          label: "理解问题",
          detail: "识别问题类型与安全边界",
          status: "completed",
        },
        {
          id: "chart",
          label: "读取命盘",
          detail: chartFacts.length > 0 ? `${chartFacts.length} 条命盘事实` : "暂无命盘事实",
          status: chartFacts.length > 0 ? "completed" : "pending",
        },
        {
          id: "knowledge",
          label: "检索知识",
          detail:
            knowledgeSources.length > 0
              ? `${knowledgeSources.length} 条知识来源`
              : "未命中知识来源",
          status: knowledgeSources.length > 0 ? "completed" : "pending",
        },
        {
          id: "critic",
          label: "critic 检查",
          detail: critic.status === "passed" ? "已通过" : critic.issues.join("；"),
          status: critic.status === "needs_review" ? "failed" : "completed",
        },
      ],
    } satisfies EvidenceRun,
  ];
}

function readString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function readStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function readConfidence(value: unknown) {
  return value === "high" || value === "medium" || value === "low" ? value : null;
}

function readRetrievalMode(value: unknown) {
  return value === "local" || value === "vector" || value === "hybrid" ? value : null;
}

function readRunStatus(value: unknown) {
  return value === "running" || value === "completed" || value === "failed" ? value : null;
}

function readStepStatus(value: unknown) {
  return value === "pending" || value === "running" || value === "completed" || value === "failed"
    ? value
    : null;
}

function isEvidenceChartFact(value: EvidenceChartFact | null): value is EvidenceChartFact {
  return value !== null && value.id.length > 0;
}

function isEvidenceKnowledgeSource(
  value: EvidenceKnowledgeSource | null,
): value is EvidenceKnowledgeSource {
  return value !== null && value.chunkId.length > 0;
}

function isEvidenceRun(value: EvidenceRun | null): value is EvidenceRun {
  return value !== null && value.runId.length > 0;
}

function isEvidenceStep(value: EvidenceStep | null): value is EvidenceStep {
  return value !== null && value.id.length > 0 && value.label.length > 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
