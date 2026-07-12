/**
 * [INPUT]: Depends on Drizzle execute capability, knowledge_chunks schema, and pgvector
 * [OUTPUT]: Provides Postgres/pgvector knowledge retrieval adapter
 * [POS]: Optional database-backed RAG path used when DATABASE_URL and embeddings are configured
 * [PROTOCOL]: Update this header when changed, then check AGENTS.md
 */

import { sql, type SQL } from "drizzle-orm";

import type { KnowledgeSource } from "../knowledge/search";

export type PostgresKnowledgeSearchInput = {
  queryEmbedding: number[];
  topic: string;
  chartTerms: string[];
  limit: number;
};

type ExecuteDatabase = {
  execute(query: unknown): Promise<{ rows?: unknown[] } | unknown[]>;
};

export function createPostgresKnowledgeRetriever(database: ExecuteDatabase) {
  return {
    async search(input: PostgresKnowledgeSearchInput): Promise<KnowledgeSource[]> {
      if (input.queryEmbedding.length === 0) return [];
      const chartTerms = toTextArray(input.chartTerms);
      const contentPatterns = toTextArray(input.chartTerms.map((term) => `%${term}%`));

      const result = await database.execute(
        sql`
          select
            id::text as "chunkId",
            title,
            source,
            source_path as "sourcePath",
            source_url as "sourceUrl",
            license,
            school,
            confidence,
            left(content, 260) as excerpt,
            1 - (embedding <=> ${toVectorLiteral(input.queryEmbedding)}::vector) as similarity
          from knowledge_chunks
          where topic = ${input.topic}
            and embedding is not null
            and (
              ${input.chartTerms.length} = 0
              or terms && ${chartTerms}
              or content ilike any(${contentPatterns})
            )
          order by similarity desc
          limit ${input.limit}
        `,
      );

      return readRows(result).map(readKnowledgeSource).filter(isKnowledgeSource);
    },
  };
}

function toVectorLiteral(values: number[]) {
  return `[${values.join(",")}]`;
}

function toTextArray(values: string[]): SQL {
  if (values.length === 0) return sql`array[]::text[]`;

  return sql`array[${sql.join(values.map((value) => sql`${value}`), sql`, `)}]::text[]`;
}

function readRows(value: unknown) {
  if (Array.isArray(value)) return value;
  if (typeof value === "object" && value !== null && "rows" in value && Array.isArray(value.rows)) {
    return value.rows;
  }

  return [];
}

function readKnowledgeSource(value: unknown): KnowledgeSource | null {
  if (!isRecord(value)) return null;
  const confidence = readConfidence(value.confidence);
  if (!confidence) return null;

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
    retrievalMode: "vector",
  };
}

function readString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function readConfidence(value: unknown) {
  return value === "high" || value === "medium" || value === "low" ? value : null;
}

function isKnowledgeSource(value: KnowledgeSource | null): value is KnowledgeSource {
  return value !== null && value.chunkId.length > 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
