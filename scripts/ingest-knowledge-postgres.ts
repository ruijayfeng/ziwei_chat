/**
 * [INPUT]: Depends on DATABASE_URL, content/knowledge Markdown, and OpenAI-compatible embedding env vars
 * [OUTPUT]: Upserts Markdown knowledge chunks with embeddings into Postgres/pgvector
 * [POS]: Optional production-grade RAG ingestion command for database-backed deployments
 * [PROTOCOL]: Update this header when changed, then check AGENTS.md
 */

import postgres from "postgres";

import type { ResolvedProviderSettings } from "../src/lib/agent/model-provider";
import { generateEmbedding } from "../src/lib/knowledge/embedding-provider";
import { loadKnowledgeChunks } from "../src/lib/knowledge/search";

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required to ingest knowledge into Postgres.");
  }

  const settings = readEmbeddingSettingsFromEnv();
  if (!settings.enabled) {
    throw new Error(
      "Embedding settings are incomplete. Set EMBEDDING_BASE_URL, EMBEDDING_API_KEY, and EMBEDDING_MODEL.",
    );
  }

  const sql = postgres(databaseUrl);
  const chunks = await loadKnowledgeChunks(process.cwd());

  await sql`create extension if not exists vector`;

  for (const chunk of chunks) {
    const embedding = await generateEmbedding({
      settings,
      input: `${chunk.title}\n${chunk.topic}\n${chunk.terms.join(" ")}\n${chunk.content}`,
    });
    if (!embedding.ok) {
      throw new Error(`Failed to embed ${chunk.chunkId}: ${embedding.error}`);
    }

    await sql`
      insert into knowledge_chunks (
        chunk_key,
        title,
        content,
        topic,
        terms,
        source,
        source_path,
        source_url,
        license,
        school,
        confidence,
        embedding,
        updated_at
      )
      values (
        ${chunk.chunkId},
        ${chunk.title},
        ${chunk.content},
        ${chunk.topic},
        ${chunk.terms},
        ${chunk.source},
        ${chunk.sourcePath},
        ${chunk.sourceUrl},
        ${chunk.license},
        ${chunk.school},
        ${chunk.confidence},
        ${toVectorLiteral(embedding.embedding)}::vector,
        now()
      )
      on conflict (chunk_key) do update set
        title = excluded.title,
        content = excluded.content,
        topic = excluded.topic,
        terms = excluded.terms,
        source = excluded.source,
        source_path = excluded.source_path,
        source_url = excluded.source_url,
        license = excluded.license,
        school = excluded.school,
        confidence = excluded.confidence,
        embedding = excluded.embedding,
        updated_at = now()
    `;
    console.log(`upserted ${chunk.chunkId}`);
  }

  await sql.end();
  console.log(`upserted ${chunks.length} knowledge chunks`);
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

function toVectorLiteral(values: number[]) {
  return `[${values.join(",")}]`;
}

function trimTrailingSlash(value: string) {
  return value.trim().replace(/\/+$/, "");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
