import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  extractClassicChunks,
  extractPatternChunks,
  knowledgeChunkToMarkdown,
  type ImportedKnowledgeChunk,
} from "../src/lib/knowledge/ziwei-doushu-importer";

const sourceRoot = process.argv[2] ?? process.env.ZIWEI_DOUSHU_SOURCE;
const outputRoot = process.argv[3] ?? path.join(process.cwd(), "content", "knowledge", "imported", "ziwei-doushu");
const maxChunks = Number(process.env.ZIWEI_DOUSHU_IMPORT_LIMIT ?? "80");

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

async function main() {
  if (!sourceRoot) {
    throw new Error("Usage: npm run import:ziwei-doushu -- <path-to-Renhuai123/ziwei-doushu>");
  }

  const chunks = await collectChunks(sourceRoot);
  const selected = chunks.slice(0, maxChunks);

  await mkdir(outputRoot, { recursive: true });
  await Promise.all(
    selected.map((chunk) =>
      writeFile(path.join(outputRoot, `${chunk.chunkId}.md`), knowledgeChunkToMarkdown(chunk), "utf8"),
    ),
  );

  console.log(`Imported ${selected.length} ziwei-doushu knowledge chunks into ${outputRoot}`);
}

async function collectChunks(root: string): Promise<ImportedKnowledgeChunk[]> {
  const classicsDir = path.join(root, "lib", "classics", "data");
  const classicFiles = (await readdir(classicsDir)).filter((fileName) => fileName.endsWith(".ts"));
  const classicChunks = (
    await Promise.all(
      classicFiles.map(async (fileName) => {
        const sourcePath = path.join("lib", "classics", "data", fileName).replaceAll("\\", "/");
        const sourceText = await readFile(path.join(root, sourcePath), "utf8");
        return extractClassicChunks({ sourcePath, sourceText });
      }),
    )
  ).flat();

  const patternsPath = path.join("lib", "ziwei", "patterns.ts");
  const patternText = await readFile(path.join(root, patternsPath), "utf8");
  const patternChunks = extractPatternChunks({
    sourcePath: patternsPath,
    sourceText: patternText,
  });

  return [...classicChunks, ...patternChunks];
}
