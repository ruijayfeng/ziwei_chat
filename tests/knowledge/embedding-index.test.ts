import { mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, test, vi } from "vitest";

import { generateEmbedding } from "../../src/lib/knowledge/embedding-provider";
import {
  cosineSimilarity,
  loadKnowledgeEmbeddingIndex,
  rankEmbeddingRecords,
  type KnowledgeEmbeddingRecord,
} from "../../src/lib/knowledge/embedding-index";

describe("knowledge embedding provider", () => {
  test("times out a pending embedding request with a structured error", async () => {
    vi.useFakeTimers();

    try {
      const result = Promise.race([
        generateEmbedding({
          settings: {
            provider: "openai",
            enabled: true,
            baseUrl: "https://api.openai.com/v1",
            apiKey: "sk-test",
            model: "text-embedding-3-small",
          },
          input: "career palace",
          timeoutMs: 25,
          fetchImplementation: vi.fn<typeof fetch>(async () => new Promise<Response>(() => {})),
        }),
        new Promise<{ ok: false; errorCode: "TEST_GUARD_EXPIRED" }>((resolve) => {
          setTimeout(() => resolve({ ok: false, errorCode: "TEST_GUARD_EXPIRED" }), 50);
        }),
      ]);

      await vi.advanceTimersByTimeAsync(50);

      await expect(result).resolves.toMatchObject({
        ok: false,
        errorCode: "EMBEDDING_TIMEOUT",
      });
    } finally {
      vi.useRealTimers();
    }
  });

  test("calls an OpenAI-compatible embeddings endpoint", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () =>
      new Response(JSON.stringify({ data: [{ embedding: [0.1, 0.2, 0.3] }] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    const result = await generateEmbedding({
      settings: {
        provider: "openai",
        enabled: true,
        baseUrl: "https://api.openai.com/v1",
        apiKey: "sk-test",
        model: "text-embedding-3-small",
      },
      input: "事业宫 天同",
      fetchImplementation: fetchMock,
    });

    expect(result).toEqual({ ok: true, embedding: [0.1, 0.2, 0.3] });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.openai.com/v1/embeddings",
      expect.objectContaining({
        method: "POST",
        headers: {
          Authorization: "Bearer sk-test",
          "Content-Type": "application/json",
        },
      }),
    );
    const requestInit = fetchMock.mock.calls[0]?.[1] as RequestInit | undefined;
    expect(JSON.parse(String(requestInit?.body))).toEqual({
      model: "text-embedding-3-small",
      input: "事业宫 天同",
    });
  });

  test("returns a structured failure when embedding settings are incomplete", async () => {
    await expect(
      generateEmbedding({
        settings: {
          provider: "disabled",
          enabled: false,
          baseUrl: "",
          apiKey: "",
          model: "",
        },
        input: "事业",
      }),
    ).resolves.toEqual({ ok: false, error: "embedding settings are incomplete" });
  });
});

describe("knowledge embedding index", () => {
  test("loads a local embedding index when present", async () => {
    const root = path.join(os.tmpdir(), `ziwei-embedding-index-${Date.now()}`);
    const indexDir = path.join(root, "content", "knowledge-index");
    await mkdir(indexDir, { recursive: true });
    await writeFile(
      path.join(indexDir, "embeddings.json"),
      JSON.stringify({
        version: 1,
        model: "test-embedding",
        generatedAt: "2026-07-07T00:00:00.000Z",
        records: [record("career", [1, 0])],
      }),
      "utf8",
    );

    await expect(loadKnowledgeEmbeddingIndex(root)).resolves.toMatchObject({
      version: 1,
      model: "test-embedding",
      records: [expect.objectContaining({ chunkId: "career", embedding: [1, 0] })],
    });
  });

  test("ranks records by vector similarity with confidence and term boosts", () => {
    const results = rankEmbeddingRecords({
      records: [
        record("career-close", [0.9, 0.1], "high", ["官禄"]),
        record("career-far", [0, 1], "high", []),
        record("wealth-close", [1, 0], "high", ["财帛"], "wealth"),
      ],
      queryEmbedding: [1, 0],
      topic: "career",
      chartTerms: ["官禄"],
      limit: 2,
    });

    expect(results.map((item) => item.chunkId)).toEqual(["career-close", "career-far"]);
    expect(results[0]?.retrievalMode).toBe("hybrid");
  });

  test("computes cosine similarity", () => {
    expect(cosineSimilarity([1, 0], [1, 0])).toBe(1);
    expect(cosineSimilarity([1, 0], [0, 1])).toBe(0);
  });
});

function record(
  chunkId: string,
  embedding: number[],
  confidence: KnowledgeEmbeddingRecord["confidence"] = "medium",
  terms: string[] = [],
  topic = "career",
): KnowledgeEmbeddingRecord {
  return {
    chunkId,
    title: chunkId,
    source: "curated",
    sourcePath: "",
    sourceUrl: "",
    license: "",
    school: "default",
    confidence,
    excerpt: `${chunkId} excerpt`,
    retrievalMode: "hybrid",
    topic,
    terms,
    content: `${chunkId} content`,
    embedding,
  };
}
