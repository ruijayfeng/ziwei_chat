/**
 * [INPUT]: Depends on UTF-8 TypeScript source files from Renhuai123/ziwei-doushu
 * [OUTPUT]: Provides conservative extraction and Markdown formatting for local knowledge chunks
 * [POS]: Offline ingestion helper for expanding content/knowledge without coupling runtime to the external repo
 * [PROTOCOL]: Update this header when changed, then check AGENTS.md
 */

export type ImportedKnowledgeChunk = {
  chunkId: string;
  title: string;
  topic: ImportedKnowledgeTopic;
  terms: string[];
  school: string;
  confidence: "high" | "medium" | "low";
  source: string;
  sourcePath: string;
  sourceUrl: string;
  license: string;
  excerpt: string;
};

type ImportedKnowledgeTopic =
  | "career"
  | "relationship"
  | "wealth"
  | "personality"
  | "recent_fortune"
  | "general";

type SourceInput = {
  sourcePath: string;
  sourceText: string;
};

const sourceRepo = "Renhuai123/ziwei-doushu";
const sourceUrl = "https://github.com/Renhuai123/ziwei-doushu";
const sourceLicense = "MIT";

export function extractClassicChunks({
  sourcePath,
  sourceText,
}: SourceInput): ImportedKnowledgeChunk[] {
  const bookTitle = readFirstStringProperty(sourceText, "title") ?? "紫微斗数古籍";
  const chunks: ImportedKnowledgeChunk[] = [];
  const paragraphs = sourceText.matchAll(
    /\{\s*id:\s*'([^']+)'[\s\S]*?text:\s*'([^']+)'[\s\S]*?\}/g,
  );

  for (const paragraph of paragraphs) {
    const id = paragraph[1];
    const text = paragraph[2].trim();
    if (!text) continue;

    const chapterTitle = findNearestChapterTitle(sourceText, paragraph.index ?? 0, bookTitle);
    const terms = inferTerms(text, ["紫微", "斗数", "星曜"]);

    chunks.push({
      chunkId: `ziwei-doushu-classic-${slugify(id)}`,
      title: `${bookTitle}：${chapterTitle}`,
      topic: inferTopic(text, chapterTitle, terms),
      terms,
      school: "default",
      confidence: inferConfidence(text),
      source: sourceRepo,
      sourcePath,
      sourceUrl,
      license: sourceLicense,
      excerpt: text,
    });
  }

  return chunks;
}

export function extractPatternChunks({
  sourcePath,
  sourceText,
}: SourceInput): ImportedKnowledgeChunk[] {
  const chunks: ImportedKnowledgeChunk[] = [];
  const patternBlocks = sourceText.matchAll(/patterns\.push\(\{([\s\S]*?)\}\);/g);

  for (const match of patternBlocks) {
    const block = match[1];
    const name = readFirstStringProperty(block, "name");
    const description = readFirstStringProperty(block, "description");
    if (!name || !description || description.includes("${")) continue;

    const palaces = readStringArrayProperty(block, "palaces");
    const terms = inferTerms(`${name} ${description}`, unique([name, ...palaces]));
    chunks.push({
      chunkId: `ziwei-doushu-pattern-${slugify(name)}`,
      title: `格局：${name}`,
      topic: inferTopic(`${name} ${description}`, name, terms),
      terms,
      school: "default",
      confidence: inferConfidence(description),
      source: sourceRepo,
      sourcePath,
      sourceUrl,
      license: sourceLicense,
      excerpt: description.trim(),
    });
  }

  return chunks;
}

export function knowledgeChunkToMarkdown(chunk: ImportedKnowledgeChunk): string {
  return [
    "---",
    `title: ${chunk.title}`,
    `topic: ${chunk.topic}`,
    "terms:",
    ...chunk.terms.map((term) => `  - ${term}`),
    `school: ${chunk.school}`,
    `confidence: ${chunk.confidence}`,
    `source: ${chunk.source}`,
    `sourcePath: ${chunk.sourcePath}`,
    `sourceUrl: ${chunk.sourceUrl}`,
    `license: ${chunk.license}`,
    "---",
    "",
    chunk.excerpt,
    "",
  ].join("\n");
}

function readFirstStringProperty(source: string, property: string): string | null {
  const quoted = new RegExp(`${property}:\\s*'([^']+)'`).exec(source);
  if (quoted) return quoted[1];

  const templated = new RegExp(`${property}:\\s*\`([^\`]+)\``).exec(source);
  if (templated && !templated[1].includes("${")) return templated[1];

  return null;
}

function readStringArrayProperty(source: string, property: string): string[] {
  const match = new RegExp(`${property}:\\s*\\[([^\\]]*)\\]`).exec(source);
  if (!match) return [];

  return Array.from(match[1].matchAll(/'([^']+)'/g), (item) => item[1]);
}

function inferTerms(text: string, defaults: string[]): string[] {
  const candidates = topicTermRules
    .flatMap((rule) => rule.terms)
    .concat(["紫微", "斗数", "星曜", "三方四正", "四化", "绱井", "鏂楁暟", "鏄熸洔"])
    .filter((term) => text.includes(term));

  return unique([...candidates, ...defaults]).slice(0, 8);
}

function inferTopic(
  text: string,
  title: string,
  terms: string[],
): ImportedKnowledgeTopic {
  const haystack = `${title} ${text} ${terms.join(" ")}`;

  return (
    topicTermRules.find((rule) => rule.terms.some((term) => haystack.includes(term)))?.topic ??
    "general"
  );
}

function inferConfidence(text: string): ImportedKnowledgeChunk["confidence"] {
  const absoluteMarkers = ["必为", "必主", "必成", "定主", "主贵", "主富", "不绝"];
  return absoluteMarkers.some((marker) => text.includes(marker)) ? "low" : "medium";
}

function findNearestChapterTitle(
  sourceText: string,
  beforeIndex: number,
  bookTitle: string,
): string {
  const titles = Array.from(
    sourceText.slice(0, beforeIndex).matchAll(/title:\s*'([^']+)'/g),
    (match) => match[1],
  );
  return titles.reverse().find((title) => title !== bookTitle) ?? "古籍摘录";
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.filter((value) => value.trim().length > 0)));
}

function slugify(value: string): string {
  const mapped = value
    .normalize("NFKD")
    .replace(/君臣庆会/g, "jun-chen-qing-hui")
    .replace(/紫府同宫/g, "zi-fu-tong-gong")
    .replace(/府相朝垣/g, "fu-xiang-chao-yuan")
    .replace(/阳梁昌禄/g, "yang-liang-chang-lu")
    .replace(/杀破狼/g, "sha-po-lang")
    .replace(/机月同梁/g, "ji-yue-tong-liang")
    .replace(/鍚涜嚕搴嗕細/g, "jun-chen-qing-hui")
    .replace(/绱簻鍚屽/g, "zi-fu-tong-gong")
    .replace(/搴滅浉鏈濆灒/g, "fu-xiang-chao-yuan")
    .replace(/闃虫鏄岀/g, "yang-liang-chang-lu")
    .replace(/鏉€鐮寸嫾/g, "sha-po-lang")
    .replace(/鏈烘湀鍚屾/g, "ji-yue-tong-liang");

  return mapped
    .replace(/[^a-zA-Z0-9\u4e00-\u9fa5]+/g, "-")
    .replace(/[\u4e00-\u9fa5]/g, "")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
    .toLowerCase();
}

const topicTermRules: Array<{ topic: ImportedKnowledgeTopic; terms: string[] }> = [
  {
    topic: "career",
    terms: ["官禄", "事业", "工作", "职业", "职位", "瀹樼", "浜嬩笟", "鑱屼笟"],
  },
  {
    topic: "relationship",
    terms: ["夫妻", "感情", "婚姻", "伴侣", "关系", "澶", "鎰熸儏"],
  },
  {
    topic: "wealth",
    terms: ["财帛", "财富", "钱财", "财务", "收入", "璐㈠笡", "璐㈠瘜"],
  },
  {
    topic: "personality",
    terms: ["命宫", "身宫", "性格", "气质", "行事", "鍛藉", "韬", "鎬ф牸"],
  },
  {
    topic: "recent_fortune",
    terms: ["大限", "流年", "运限", "近期", "运势", "澶ч檺", "娴佸勾", "杩愰檺"],
  },
];
