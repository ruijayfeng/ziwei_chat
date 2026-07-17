import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, test } from "vitest";

import { createPostgresKnowledgeRetriever } from "../../src/lib/db/knowledge-retrieval";

const databaseUrl = process.env.DATABASE_URL;
const describePostgres = databaseUrl ? describe : describe.skip;

describePostgres("Postgres knowledge retrieval integration", () => {
  const client = postgres(databaseUrl!, { max: 1 });
  const database = drizzle(client);

  afterAll(async () => client.end({ timeout: 5 }));

  test("executes the pgvector retrieval query against the configured release database", async () => {
    const extension = await client`select extversion from pg_extension where extname = 'vector'`;
    expect(extension[0]?.extversion).toEqual(expect.any(String));
    const vectorProbe = await client`select '[1,0]'::vector <=> '[1,0]'::vector as distance`;
    expect(Number(vectorProbe[0]?.distance)).toBe(0);

    const suffix = randomUUID();
    const chunkKey = `integration-${suffix}`;
    const topic = `integration-${suffix}`;
    const term = `term-${suffix}`;
    const embedding = Array.from({ length: 1024 }, (_, index) => index === 0 ? 1 : 0);
    const vector = `[${embedding.join(",")}]`;

    try {
      const inserted = await client`
        insert into knowledge_chunks (
          chunk_key, title, content, topic, terms, source, source_path,
          source_url, license, school, confidence, embedding
        ) values (
          ${chunkKey}, 'Integration fixture', 'Integration content', ${topic},
          ${client.array([term])}, 'integration-test', 'tests/db/knowledge-retrieval.postgres.test.ts',
          '', 'internal', 'default', 'high', ${vector}::vector
        )
        returning id::text as "chunkId"
      `;
      const expectedChunkId = String(inserted[0]?.chunkId);
      const retriever = createPostgresKnowledgeRetriever({ execute: (query) => database.execute(query as never) });
      const results = await retriever.search({
        queryEmbedding: embedding,
        topic,
        chartTerms: [term],
        limit: 1,
      });

      expect(results).toEqual([expect.objectContaining({ chunkId: expectedChunkId, source: "integration-test" })]);
    } finally {
      await client`delete from knowledge_chunks where chunk_key = ${chunkKey}`;
    }
  });
});
