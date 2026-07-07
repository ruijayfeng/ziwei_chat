/**
 * [INPUT]: Depends on chat API response headers and structured evidence metadata
 * [OUTPUT]: Provides evidence parsing and UI-ready evidence state contracts
 * [POS]: UI support module between /api/chat evidence headers and evidence-drawer rendering
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

export type EvidenceState = {
  toolsUsed: string[];
  chartFacts: EvidenceChartFact[];
  knowledgeSources: EvidenceKnowledgeSource[];
  critic: {
    status: "not_run" | "passed" | "needs_review";
    issues: string[];
  };
};

export const initialEvidence: EvidenceState = {
  toolsUsed: [],
  chartFacts: [],
  knowledgeSources: [],
  critic: {
    status: "not_run",
    issues: [],
  },
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

export function evidenceKnowledgeSourceLabel(source: EvidenceKnowledgeSource) {
  const sourceLabel =
    source.source === "Renhuai123/ziwei-doushu"
      ? "开源资料"
      : source.source === "curated-internal"
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

  return {
    toolsUsed: readStringArray(value.toolsUsed),
    chartFacts: Array.isArray(value.chartFacts)
      ? value.chartFacts.map(readChartFact).filter(isEvidenceChartFact)
      : [],
    knowledgeSources: Array.isArray(value.knowledgeSources)
      ? value.knowledgeSources.map(readKnowledgeSource).filter(isEvidenceKnowledgeSource)
      : [],
    critic: readCritic(value.critic),
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

function isEvidenceChartFact(value: EvidenceChartFact | null): value is EvidenceChartFact {
  return value !== null && value.id.length > 0;
}

function isEvidenceKnowledgeSource(
  value: EvidenceKnowledgeSource | null,
): value is EvidenceKnowledgeSource {
  return value !== null && value.chunkId.length > 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
