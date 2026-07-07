ALTER TABLE "knowledge_chunks" ADD COLUMN IF NOT EXISTS "chunk_key" text;
--> statement-breakpoint
UPDATE "knowledge_chunks" SET "chunk_key" = "id"::text WHERE "chunk_key" IS NULL;
--> statement-breakpoint
ALTER TABLE "knowledge_chunks" ALTER COLUMN "chunk_key" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "knowledge_chunks" ADD COLUMN IF NOT EXISTS "source_path" text;
--> statement-breakpoint
ALTER TABLE "knowledge_chunks" ADD COLUMN IF NOT EXISTS "license" text;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "knowledge_chunks_chunk_key_idx" ON "knowledge_chunks" ("chunk_key");
