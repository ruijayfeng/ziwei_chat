import { describe, expect, test, vi } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";

import { createPostgresKnowledgeRetriever } from "../../src/lib/db/knowledge-retrieval";

describe("postgres knowledge retrieval", () => {
  test("maps pgvector search rows to knowledge sources", async () => {
    let capturedQuery: unknown;
    const execute = vi.fn(async (query: unknown) => {
      capturedQuery = query;
      return {
      rows: [
        {
          chunkId: "chunk-1",
          title: "事业知识",
          source: "curated",
          sourcePath: "content/knowledge/career-palace.md",
          sourceUrl: "",
          license: "internal",
          school: "default",
          confidence: "high",
          excerpt: "官禄宫用于观察事业。",
        },
      ],
      };
    });

    const retriever = createPostgresKnowledgeRetriever({ execute });

    await expect(
      retriever.search({
        queryEmbedding: [0.1, 0.2],
        topic: "career",
        chartTerms: ["官禄"],
        limit: 3,
      }),
    ).resolves.toEqual([
      {
        chunkId: "chunk-1",
        title: "事业知识",
        source: "curated",
        sourcePath: "content/knowledge/career-palace.md",
        sourceUrl: "",
        license: "internal",
        school: "default",
        confidence: "high",
        excerpt: "官禄宫用于观察事业。",
        retrievalMode: "vector",
      },
    ]);
    expect(execute).toHaveBeenCalledOnce();
    const query = new PgDialect().sqlToQuery(capturedQuery as SQL);
    expect(query.sql).toContain("terms && array[");
    expect(query.sql).toContain("content ilike any(array[");
  });

  test("does not query the database when the query embedding is empty", async () => {
    const execute = vi.fn();
    const retriever = createPostgresKnowledgeRetriever({ execute });

    await expect(
      retriever.search({
        queryEmbedding: [],
        topic: "career",
        chartTerms: [],
        limit: 3,
      }),
    ).resolves.toEqual([]);
    expect(execute).not.toHaveBeenCalled();
  });

  test("drops database rows with incomplete provenance metadata", async () => {
    const retriever = createPostgresKnowledgeRetriever({ execute: vi.fn(async () => ({ rows: [{
      chunkId: "bad",
      title: "Bad",
      source: "",
      sourcePath: "",
      sourceUrl: "",
      license: "",
      school: "",
      confidence: "high",
      excerpt: "content",
    }] })) });

    await expect(retriever.search({ queryEmbedding: [1], topic: "career", chartTerms: [], limit: 1 })).resolves.toEqual([]);
  });

  test("bounds a hanging vector query so local retrieval can take over", async () => {
    vi.useFakeTimers();

    try {
      const execute = vi.fn(async () => new Promise<{ rows: unknown[] }>(() => {}));
      const retriever = createPostgresKnowledgeRetriever({ execute }, { timeoutMs: 25 });
      const result = retriever.search({
        queryEmbedding: [0.1, 0.2],
        topic: "career",
        chartTerms: ["官禄"],
        limit: 3,
      });

      const guarded = Promise.race([
        result,
        new Promise<unknown>((resolve) => setTimeout(() => resolve("TEST_GUARD_EXPIRED"), 50)),
      ]);
      await vi.advanceTimersByTimeAsync(50);

      await expect(guarded).resolves.toEqual([]);
    } finally {
      vi.useRealTimers();
    }
  });
});
