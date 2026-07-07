import { describe, expect, test, vi } from "vitest";

import { createPostgresKnowledgeRetriever } from "../../src/lib/db/knowledge-retrieval";

describe("postgres knowledge retrieval", () => {
  test("maps pgvector search rows to knowledge sources", async () => {
    const execute = vi.fn(async () => ({
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
    }));

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
});
