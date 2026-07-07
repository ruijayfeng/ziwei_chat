import { mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, test, vi } from "vitest";

import { searchKnowledge } from "../../src/lib/knowledge/search";

describe("hybrid knowledge search", () => {
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
      }),
    ).resolves.toEqual([
      expect.objectContaining({
        chunkId: "career-vector",
        retrievalMode: "hybrid",
      }),
    ]);
  });
});
