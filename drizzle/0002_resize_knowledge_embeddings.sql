DROP INDEX IF EXISTS "knowledge_chunks_embedding_idx";
--> statement-breakpoint
ALTER TABLE "knowledge_chunks"
  ALTER COLUMN "embedding" TYPE vector(1024)
  USING "embedding"::vector(1024);
--> statement-breakpoint
CREATE INDEX "knowledge_chunks_embedding_idx"
  ON "knowledge_chunks"
  USING hnsw ("embedding" vector_cosine_ops);
