/**
 * [INPUT]: Depends on gray-matter, Node filesystem reads, and content/skills Markdown files
 * [OUTPUT]: Provides validated skill loading for deterministic topic workflows
 * [POS]: Knowledge workflow layer used by agent planning and loadSkill tools
 * [PROTOCOL]: Update this header when changed, then check AGENTS.md
 */

import { readFile } from "node:fs/promises";
import path from "node:path";

import matter from "gray-matter";

export type SkillId =
  | "career"
  | "relationship"
  | "wealth"
  | "personality"
  | "recent_fortune"
  | "chart_explanation";

export type ParsedSkill = {
  skillId: SkillId;
  version: string;
  topic: string;
  tools: string[];
  requiredFacts: string[];
  analysisSteps: string[];
  responseRules: string[];
  safetyNotes: string[];
  body: string;
};

type ParseSkillInput = {
  filePath: string;
  markdown: string;
};

const skillFiles: Record<SkillId, string> = {
  career: "career.md",
  relationship: "relationship.md",
  wealth: "wealth.md",
  personality: "personality.md",
  recent_fortune: "recent-fortune.md",
  chart_explanation: "chart-explanation.md",
};

export async function loadSkill(skillId: SkillId, contentRoot = process.cwd()) {
  const fileName = skillFiles[skillId];
  const filePath = path.join(contentRoot, "content", "skills", fileName);
  const markdown = await readFile(filePath, "utf8");

  return parseSkillMarkdown({ filePath, markdown });
}

export function parseSkillMarkdown({
  filePath,
  markdown,
}: ParseSkillInput): ParsedSkill {
  const parsed = matter(markdown);
  const data = parsed.data as Record<string, unknown>;

  const id = requireString(data, "id", filePath) as SkillId;
  const version = requireString(data, "version", filePath);
  const topic = requireString(data, "topic", filePath);
  const requiredFacts = requireStringArray(data, "requiredFacts", filePath);
  const tools = requireStringArray(data, "tools", filePath);

  return {
    skillId: id,
    version,
    topic,
    tools,
    requiredFacts,
    analysisSteps: readSectionItems(parsed.content, "Analysis Steps"),
    responseRules: readSectionItems(parsed.content, "Response Rules"),
    safetyNotes: readSectionItems(parsed.content, "Safety Notes"),
    body: parsed.content.trim(),
  };
}

function requireString(
  data: Record<string, unknown>,
  field: string,
  filePath: string,
) {
  const value = data[field];
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Skill ${filePath} is missing required field: ${field}`);
  }

  return value;
}

function requireStringArray(
  data: Record<string, unknown>,
  field: string,
  filePath: string,
) {
  const value = data[field];
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new Error(`Skill ${filePath} is missing required field: ${field}`);
  }

  return value as string[];
}

function readSectionItems(content: string, heading: string) {
  const normalized = content.replace(/\r\n/g, "\n");
  const lines = normalized.split("\n");
  const startIndex = lines.findIndex((line) => line.trim() === `## ${heading}`);
  if (startIndex === -1) {
    return [];
  }

  return readUntilNextHeading(lines, startIndex + 1);
}

function readUntilNextHeading(lines: string[], startIndex: number) {
  const sectionLines: string[] = [];

  for (const line of lines.slice(startIndex)) {
    if (line.startsWith("## ")) {
      break;
    }

    sectionLines.push(line);
  }

  return sectionLines
    .map((line) => line.trim())
    .map((line) => line.replace(/^[-*]\s+/, "").replace(/^\d+\.\s+/, ""))
    .filter(Boolean);
}
