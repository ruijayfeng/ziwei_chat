import { mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, test, vi } from "vitest";

import { searchKnowledge } from "../../src/lib/knowledge/search";

describe("hybrid knowledge search", () => {
  test("labels keyword fallback as local when vector retrieval has no results", async () => {
    const root = path.join(os.tmpdir(), `ziwei-hybrid-fallback-${Date.now()}`);
    const knowledgeDir = path.join(root, "content", "knowledge");
    await mkdir(knowledgeDir, { recursive: true });
    await writeFile(
      path.join(knowledgeDir, "career.md"),
      [
        "---",
        "title: 事业基础",
        "topic: career",
        "terms:",
        "  - 官禄",
        "source: curated",
        "school: default",
        "confidence: high",
        "---",
        "官禄宫用于观察事业发展。",
      ].join("\n"),
      "utf8",
    );
    const fetchMock = vi.fn<typeof fetch>(async () =>
      new Response(JSON.stringify({ data: [{ embedding: [1, 0] }] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    await expect(
      searchKnowledge({
        query: "事业发展",
        topic: "career",
        chartTerms: ["官禄"],
        limit: 3,
        retrievalMode: "vector",
        contentRoot: root,
        embeddingSettings: {
          provider: "openai-compatible",
          enabled: true,
          baseUrl: "https://example.test/v1",
          apiKey: "sk-test",
          model: "test-embedding",
        },
        fetchImplementation: fetchMock,
        vectorSearch: vi.fn(async () => []),
      }),
    ).resolves.toEqual([
      expect.objectContaining({
        chunkId: "career",
        retrievalMode: "local",
      }),
    ]);
  });

  test("falls back to local knowledge when vector retrieval throws", async () => {
    const root = path.join(os.tmpdir(), `ziwei-hybrid-error-fallback-${Date.now()}`);
    const knowledgeDir = path.join(root, "content", "knowledge");
    await mkdir(knowledgeDir, { recursive: true });
    await writeFile(
      path.join(knowledgeDir, "career.md"),
      [
        "---",
        "title: 事业基础",
        "topic: career",
        "terms:",
        "  - 官禄",
        "source: curated",
        "school: default",
        "confidence: high",
        "---",
        "官禄宫用于观察事业发展。",
      ].join("\n"),
      "utf8",
    );

    await expect(
      searchKnowledge({
        query: "事业发展",
        topic: "career",
        chartTerms: ["官禄"],
        limit: 3,
        retrievalMode: "vector",
        contentRoot: root,
        embeddingSettings: {
          provider: "openai-compatible",
          enabled: true,
          baseUrl: "https://example.test/v1",
          apiKey: "sk-test",
          model: "test-embedding",
        },
        fetchImplementation: vi.fn<typeof fetch>(async () =>
          new Response(JSON.stringify({ data: [{ embedding: [1, 0] }] }), {
            status: 200,
            headers: { "content-type": "application/json" },
          }),
        ),
        vectorSearch: vi.fn(async () => {
          throw new Error("vector database unavailable");
        }),
      }),
    ).resolves.toEqual([
      expect.objectContaining({
        chunkId: "career",
        retrievalMode: "local",
      }),
    ]);
  });

  test("uses an embedding index when embedding settings are configured", async () => {
    const root = path.join(os.tmpdir(), `ziwei-hybrid-search-${Date.now()}`);
    const indexDir = path.join(root, "content", "knowledge-index");
    await mkdir(indexDir, { recursive: true });
    await writeFile(
      path.join(indexDir, "embeddings.json"),
      JSON.stringify({
        version: 1,
        model: "test-embedding",
        generatedAt: "2026-07-07T00:00:00.000Z",
        records: [
          {
            chunkId: "career-vector",
            title: "事业向量知识",
            source: "curated",
            sourcePath: "",
            sourceUrl: "",
            license: "",
            school: "default",
            confidence: "high",
            excerpt: "事业检索命中。",
            retrievalMode: "hybrid",
            topic: "career",
            terms: ["官禄"],
            content: "官禄宫事业知识",
            embedding: [1, 0],
          },
        ],
      }),
      "utf8",
    );
    const fetchMock = vi.fn<typeof fetch>(async () =>
      new Response(JSON.stringify({ data: [{ embedding: [1, 0] }] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    await expect(
      searchKnowledge({
        query: "换工作",
        topic: "career",
        chartTerms: ["官禄"],
        limit: 3,
        retrievalMode: "vector",
        contentRoot: root,
        embeddingSettings: {
          provider: "openai",
          enabled: true,
          baseUrl: "https://api.openai.com/v1",
          apiKey: "sk-test",
          model: "text-embedding-3-small",
        },
        fetchImplementation: fetchMock,
      }),
    ).resolves.toEqual([
      expect.objectContaining({
        chunkId: "career-vector",
        retrievalMode: "vector",
      }),
    ]);
  });

  test("prefers a database vector searcher over the local embedding index", async () => {
    const root = path.join(os.tmpdir(), `ziwei-hybrid-db-search-${Date.now()}`);
    const fetchMock = vi.fn<typeof fetch>(async () =>
      new Response(JSON.stringify({ data: [{ embedding: [1, 0] }] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    const vectorSearch = vi.fn(async () => [
      {
        chunkId: "db-vector",
        title: "数据库知识",
        source: "curated",
        sourcePath: "content/knowledge/career-palace.md",
        sourceUrl: "",
        license: "internal",
        school: "default",
        confidence: "high" as const,
        excerpt: "数据库向量召回。",
        retrievalMode: "vector" as const,
      },
    ]);

    await expect(
      searchKnowledge({
        query: "换工作",
        topic: "career",
        chartTerms: ["官禄"],
        limit: 3,
        retrievalMode: "hybrid",
        contentRoot: root,
        embeddingSettings: {
          provider: "openai",
          enabled: true,
          baseUrl: "https://api.openai.com/v1",
          apiKey: "sk-test",
          model: "text-embedding-3-small",
        },
        fetchImplementation: fetchMock,
        vectorSearch,
      }),
    ).resolves.toEqual([
      expect.objectContaining({
        chunkId: "db-vector",
        retrievalMode: "vector",
      }),
    ]);
    expect(vectorSearch).toHaveBeenCalledWith({
      queryEmbedding: [1, 0],
      topic: "career",
      chartTerms: ["官禄"],
      limit: 3,
    });
  });
});
