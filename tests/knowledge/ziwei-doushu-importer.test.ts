import { describe, expect, test } from "vitest";

import {
  extractClassicChunks,
  extractPatternChunks,
  knowledgeChunkToMarkdown,
} from "../../src/lib/knowledge/ziwei-doushu-importer";

describe("ziwei-doushu importer", () => {
  test("extracts classic paragraph chunks with source attribution", () => {
    const chunks = extractClassicChunks({
      sourcePath: "lib/classics/data/quanji.ts",
      sourceText: `
        export const ziWeiQuanJi = {
          title: '紫微斗数全集',
          chapters: [{
            title: '卷二·紫微星论',
            paragraphs: [{
              id: 'qj-2-1',
              text: '紫微为北斗之主，统辖众星。紫微属土，乃尊贵之星。'
            }]
          }]
        };
      `,
    });

    expect(chunks).toEqual([
      expect.objectContaining({
        chunkId: "ziwei-doushu-classic-qj-2-1",
        title: "紫微斗数全集：卷二·紫微星论",
        topic: "general",
        terms: ["紫微", "斗数", "星曜"],
        source: "Renhuai123/ziwei-doushu",
        sourcePath: "lib/classics/data/quanji.ts",
        license: "MIT",
        excerpt: "紫微为北斗之主，统辖众星。紫微属土，乃尊贵之星。",
      }),
    ]);
  });

  test("classifies classic chunks into beta topics from palace and timing terms", () => {
    const chunks = extractClassicChunks({
      sourcePath: "lib/classics/data/topic.ts",
      sourceText: `
        export const topicClassic = {
          title: '紫微斗数摘录',
          chapters: [{
            title: '宫位论',
            paragraphs: [
              { id: 'career-1', text: '官禄宫可观察事业、职位责任与工作上的进退节奏。' },
              { id: 'relationship-1', text: '夫妻宫用于观察婚姻感情互动，不可单独断定成败。' },
              { id: 'wealth-1', text: '财帛宫看钱财进出、财富管理与风险承受。' },
              { id: 'personality-1', text: '命宫与身宫常用于观察性格、气质和行事方式。' },
              { id: 'fortune-1', text: '大限、流年与运限用于观察近期运势，不宜绝对化。' },
              { id: 'absolute-1', text: '官禄宫见此格，必为高官。' }
            ]
          }]
        };
      `,
    });

    expect(chunks.map((chunk) => chunk.topic)).toEqual([
      "career",
      "relationship",
      "wealth",
      "personality",
      "recent_fortune",
      "career",
    ]);
    expect(chunks[0]).toMatchObject({
      terms: expect.arrayContaining(["官禄", "事业"]),
      confidence: "medium",
    });
    expect(chunks[5]).toMatchObject({
      topic: "career",
      confidence: "low",
    });
  });

  test("extracts static pattern chunks and skips dynamic template descriptions", () => {
    const chunks = extractPatternChunks({
      sourcePath: "lib/ziwei/patterns.ts",
      sourceText: `
        patterns.push({
          name: '君臣庆会',
          level: 'excellent',
          description: '紫微入命，左辅右弼同会，主贵人不绝。',
          palaces: ['命宫'],
          source: '《紫微斗数全书·君臣庆会格》',
        });
        patterns.push({
          name: '动态格局',
          level: 'good',
          description: \`这里包含 \${starName}，暂不导入。\`,
          source: 'dynamic',
        });
      `,
    });

    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toMatchObject({
      chunkId: "ziwei-doushu-pattern-jun-chen-qing-hui",
      title: "格局：君臣庆会",
      topic: "personality",
      terms: expect.arrayContaining(["君臣庆会", "命宫"]),
      confidence: "low",
      excerpt: "紫微入命，左辅右弼同会，主贵人不绝。",
    });
  });

  test("formats imported chunks as local knowledge Markdown", () => {
    const markdown = knowledgeChunkToMarkdown({
      chunkId: "ziwei-doushu-pattern-jun-chen-qing-hui",
      title: "格局：君臣庆会",
      topic: "general",
      terms: ["君臣庆会", "命宫"],
      school: "default",
      confidence: "medium",
      source: "Renhuai123/ziwei-doushu",
      sourcePath: "lib/ziwei/patterns.ts",
      sourceUrl: "https://github.com/Renhuai123/ziwei-doushu",
      license: "MIT",
      excerpt: "紫微入命，左辅右弼同会，主贵人不绝。",
    });

    expect(markdown).toContain("title: 格局：君臣庆会");
    expect(markdown).toContain("sourcePath: lib/ziwei/patterns.ts");
    expect(markdown).toContain("- 君臣庆会");
    expect(markdown).toContain("紫微入命，左辅右弼同会，主贵人不绝。");
  });
});
