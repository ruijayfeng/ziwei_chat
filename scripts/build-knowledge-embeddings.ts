/**
 * [INPUT]: Depends on content/knowledge Markdown files and OpenAI-compatible embedding env vars
 * [OUTPUT]: Writes content/knowledge-index/embeddings.json for local semantic RAG
 * [POS]: Offline knowledge indexing command; runtime can fall back when the index is absent
 * [PROTOCOL]: Update this header when changed, then check AGENTS.md
 */

import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import matter from "gray-matter";

import { generateEmbedding } from "../src/lib/knowledge/embedding-provider";
import type { KnowledgeEmbeddingIndex, KnowledgeEmbeddingRecord } from "../src/lib/knowledge/embedding-index";
import type { ResolvedProviderSettings } from "../src/lib/agent/model-provider";

async function main() {
  const settings = readEmbeddingSettingsFromEnv();
  if (!settings.enabled) {
    throw new Error(
      "Embedding settings are incomplete. Set EMBEDDING_BASE_URL, EMBEDDING_API_KEY, and EMBEDDING_MODEL.",
    );
  }

  const contentRoot = process.cwd();
  const records: KnowledgeEmbeddingRecord[] = [];

  for (const fileName of await listMarkdownFiles(path.join(contentRoot, "content", "knowledge"))) {
    const filePath = path.join(contentRoot, "content", "knowledge", fileName);
    const markdown = await readFile(filePath, "utf8");
    const chunk = parseKnowledgeMarkdown(fileName, markdown);
    if (!chunk) continue;

    const embedding = await generateEmbedding({
      settings,
      input: `${chunk.title}\n${chunk.topic}\n${chunk.terms.join(" ")}\n${chunk.content}`,
    });
    if (!embedding.ok) {
      throw new Error(`Failed to embed ${fileName}: ${embedding.error}`);
    }

    records.push({ ...chunk, embedding: embedding.embedding });
    console.log(`embedded ${fileName}`);
  }

  const index: KnowledgeEmbeddingIndex = {
    version: 1,
    model: settings.model,
    generatedAt: new Date().toISOString(),
    records,
  };
  const outputDir = path.join(contentRoot, "content", "knowledge-index");
  await mkdir(outputDir, { recursive: true });
  await writeFile(path.join(outputDir, "embeddings.json"), JSON.stringify(index, null, 2), "utf8");
  console.log(`wrote ${records.length} knowledge embeddings`);
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
): Omit<KnowledgeEmbeddingRecord, "embedding"> | null {
  const parsed = matter(markdown);
  const data = parsed.data as Record<string, unknown>;
  const confidence = readConfidence(data.confidence);
  const topic = readRequiredString(data.topic);
  const terms = readStringArray(data.terms);

  if (!confidence || !topic || terms.length === 0) return null;

  return {
    chunkId: path.basename(fileName, ".md"),
    title: readRequiredString(data.title) || fileName,
    source: readRequiredString(data.source) || "unknown",
    sourcePath: readString(data.sourcePath),
    sourceUrl: readString(data.sourceUrl),
    license: readString(data.license),
    school: readRequiredString(data.school) || "default",
    confidence,
    excerpt: parsed.content.trim().slice(0, 260),
    retrievalMode: "hybrid",
    topic,
    terms,
    content: parsed.content.trim(),
  };
}

function readEmbeddingSettingsFromEnv(): ResolvedProviderSettings {
  const baseUrl = trimTrailingSlash(process.env.EMBEDDING_BASE_URL ?? "");
  const apiKey = (process.env.EMBEDDING_API_KEY ?? process.env.EMBEDDING_PROVIDER_API_KEY ?? "").trim();
  const model = (process.env.EMBEDDING_MODEL ?? "").trim();

  if (!baseUrl || !apiKey || !model) {
    return {
      provider: "disabled",
      enabled: false,
      baseUrl: "",
      apiKey: "",
      model: "",
    };
  }

  return {
    provider: "openai-compatible",
    enabled: true,
    baseUrl,
    apiKey,
    model,
  };
}

function readRequiredString(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : "";
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

function trimTrailingSlash(value: string) {
  return value.trim().replace(/\/+$/, "");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
