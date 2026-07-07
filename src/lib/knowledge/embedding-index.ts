/**
 * [INPUT]: Depends on optional content/knowledge-index/embeddings.json files
 * [OUTPUT]: Provides local embedding index loading, validation, and cosine ranking
 * [POS]: No-database semantic retrieval support beside Markdown keyword retrieval
 * [PROTOCOL]: Update this header when changed, then check AGENTS.md
 */

import { readFile } from "node:fs/promises";
import path from "node:path";

import type { KnowledgeSource } from "./search";

export type KnowledgeEmbeddingRecord = KnowledgeSource & {
  topic: string;
  terms: string[];
  content: string;
  embedding: number[];
};

export type KnowledgeEmbeddingIndex = {
  version: 1;
  model: string;
  generatedAt: string;
  records: KnowledgeEmbeddingRecord[];
};

export async function loadKnowledgeEmbeddingIndex(contentRoot = process.cwd()) {
  const filePath = path.join(contentRoot, "content", "knowledge-index", "embeddings.json");

  try {
    const raw = await readFile(filePath, "utf8");
    return parseKnowledgeEmbeddingIndex(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function rankEmbeddingRecords({
  records,
  queryEmbedding,
  topic,
  chartTerms,
  limit,
}: {
  records: KnowledgeEmbeddingRecord[];
  queryEmbedding: number[];
  topic: string;
  chartTerms: string[];
  limit: number;
}): KnowledgeSource[] {
  return records
    .filter((record) => record.topic === topic)
    .map((record) => ({
      record,
      score:
        cosineSimilarity(queryEmbedding, record.embedding) +
        confidenceBoost(record.confidence) +
        termBoost(record, chartTerms),
    }))
    .filter((item) => Number.isFinite(item.score))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ record }) => ({
      chunkId: record.chunkId,
      title: record.title,
      source: record.source,
      sourcePath: record.sourcePath,
      sourceUrl: record.sourceUrl,
      license: record.license,
      school: record.school,
      confidence: record.confidence,
      excerpt: record.excerpt,
      retrievalMode: "hybrid",
    }));
}

export function cosineSimilarity(left: number[], right: number[]) {
  if (left.length === 0 || left.length !== right.length) return Number.NEGATIVE_INFINITY;

  let dot = 0;
  let leftNorm = 0;
  let rightNorm = 0;

  for (let index = 0; index < left.length; index += 1) {
    const leftValue = left[index] ?? 0;
    const rightValue = right[index] ?? 0;
    dot += leftValue * rightValue;
    leftNorm += leftValue * leftValue;
    rightNorm += rightValue * rightValue;
  }

  if (leftNorm === 0 || rightNorm === 0) return Number.NEGATIVE_INFINITY;

  return dot / (Math.sqrt(leftNorm) * Math.sqrt(rightNorm));
}

function parseKnowledgeEmbeddingIndex(value: unknown): KnowledgeEmbeddingIndex | null {
  if (!isRecord(value) || value.version !== 1 || !Array.isArray(value.records)) return null;

  const records = value.records.map(readRecord).filter(isKnowledgeEmbeddingRecord);

  return {
    version: 1,
    model: readString(value.model),
    generatedAt: readString(value.generatedAt),
    records,
  };
}

function readRecord(value: unknown): KnowledgeEmbeddingRecord | null {
  if (!isRecord(value)) return null;
  const confidence = readConfidence(value.confidence);
  const retrievalMode = readRetrievalMode(value.retrievalMode);
  if (!confidence || !retrievalMode || !isNumberArray(value.embedding)) return null;

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
    topic: readString(value.topic),
    terms: readStringArray(value.terms),
    content: readString(value.content),
    embedding: value.embedding,
  };
}

function confidenceBoost(confidence: KnowledgeEmbeddingRecord["confidence"]) {
  if (confidence === "high") return 0.08;
  if (confidence === "medium") return 0.03;
  return -0.08;
}

function termBoost(record: KnowledgeEmbeddingRecord, chartTerms: string[]) {
  return chartTerms.reduce((score, term) => {
    if (record.terms.includes(term)) return score + 0.04;
    if (record.content.includes(term)) return score + 0.02;
    return score;
  }, 0);
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

function isKnowledgeEmbeddingRecord(
  value: KnowledgeEmbeddingRecord | null,
): value is KnowledgeEmbeddingRecord {
  return value !== null && value.chunkId.length > 0 && value.embedding.length > 0;
}

function isNumberArray(value: unknown): value is number[] {
  return Array.isArray(value) && value.length > 0 && value.every((item) => typeof item === "number");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
