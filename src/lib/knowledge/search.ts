/**
 * [INPUT]: Depends on gray-matter, Node filesystem reads, and content/knowledge Markdown files
 * [OUTPUT]: Provides local Markdown/keyword knowledge retrieval with source metadata
 * [POS]: Open-source baseline retrieval layer; vector search remains optional enhancement
 * [PROTOCOL]: Update this header when changed, then check AGENTS.md
 */

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import matter from "gray-matter";

export type SearchKnowledgeInput = {
  query: string;
  topic: string;
  chartTerms: string[];
  limit: number;
  retrievalMode?: "local" | "vector" | "hybrid";
  contentRoot?: string;
};

export type KnowledgeSource = {
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

type KnowledgeChunk = KnowledgeSource & {
  topic: string;
  terms: string[];
  content: string;
};

export async function searchKnowledge({
  query,
  topic,
  chartTerms,
  limit,
  retrievalMode = "local",
  contentRoot = process.cwd(),
}: SearchKnowledgeInput): Promise<KnowledgeSource[]> {
  const chunks = await loadKnowledgeChunks(contentRoot);

  return chunks
    .filter((chunk) => chunk.topic === topic)
    .map((chunk) => ({
      chunk,
      score: scoreChunk(chunk, query, chartTerms),
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ chunk }) => ({
      chunkId: chunk.chunkId,
      title: chunk.title,
      source: chunk.source,
      sourcePath: chunk.sourcePath,
      sourceUrl: chunk.sourceUrl,
      license: chunk.license,
      school: chunk.school,
      confidence: chunk.confidence,
      excerpt: chunk.excerpt,
      retrievalMode,
    }));
}

async function loadKnowledgeChunks(contentRoot: string) {
  const dir = path.join(contentRoot, "content", "knowledge");
  const fileNames = await listMarkdownFiles(dir);

  return Promise.all(
    fileNames.map(async (fileName) => {
      const filePath = path.join(dir, fileName);
      const markdown = await readFile(filePath, "utf8");
      return parseKnowledgeMarkdown(fileName, markdown);
    }),
  );
}

async function listMarkdownFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      if (entry.isDirectory()) {
        const children = await listMarkdownFiles(path.join(dir, entry.name));
        return children.map((child) => path.join(entry.name, child));
      }

      return entry.isFile() && entry.name.endsWith(".md") ? [entry.name] : [];
    }),
  );

  return nested.flat();
}

function parseKnowledgeMarkdown(
  fileName: string,
  markdown: string,
): KnowledgeChunk {
  const parsed = matter(markdown);
  const data = parsed.data as Record<string, unknown>;

  return {
    chunkId: path.basename(fileName, ".md"),
    title: requireString(data, "title", fileName),
    topic: requireString(data, "topic", fileName),
    terms: requireStringArray(data, "terms", fileName),
    source: requireString(data, "source", fileName),
    sourcePath: readOptionalString(data, "sourcePath"),
    sourceUrl: readOptionalString(data, "sourceUrl"),
    license: readOptionalString(data, "license"),
    school: requireString(data, "school", fileName),
    confidence: requireConfidence(data, fileName),
    excerpt: parsed.content.trim().slice(0, 260),
    retrievalMode: "local",
    content: parsed.content,
  };
}

function readOptionalString(data: Record<string, unknown>, field: string) {
  const value = data[field];
  return typeof value === "string" ? value : "";
}

function scoreChunk(chunk: KnowledgeChunk, query: string, chartTerms: string[]) {
  let score = chunk.topic === query ? 2 : 0;
  const lowerQuery = query.toLowerCase();

  if (chunk.title.toLowerCase().includes(lowerQuery)) score += 2;
  if (chunk.content.toLowerCase().includes(lowerQuery)) score += 1;

  for (const term of chartTerms) {
    if (chunk.terms.includes(term)) score += 4;
    if (chunk.content.includes(term)) score += 2;
  }

  return score + confidenceScore(chunk.confidence);
}

function confidenceScore(confidence: KnowledgeChunk["confidence"]) {
  if (confidence === "high") return 2;
  if (confidence === "low") return -2;
  return 0;
}

function requireString(
  data: Record<string, unknown>,
  field: string,
  fileName: string,
) {
  const value = data[field];
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Knowledge ${fileName} is missing required field: ${field}`);
  }

  return value;
}

function requireStringArray(
  data: Record<string, unknown>,
  field: string,
  fileName: string,
) {
  const value = data[field];
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new Error(`Knowledge ${fileName} is missing required field: ${field}`);
  }

  return value as string[];
}

function requireConfidence(data: Record<string, unknown>, fileName: string) {
  const confidence = requireString(data, "confidence", fileName);
  if (
    confidence !== "high" &&
    confidence !== "medium" &&
    confidence !== "low"
  ) {
    throw new Error(`Knowledge ${fileName} has invalid confidence.`);
  }

  return confidence;
}
