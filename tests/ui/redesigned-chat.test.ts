import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("redesigned real chat surface", () => {
  test("keeps transport in the shared workspace session rather than presentation components", () => {
    const provider = source("src/components/workspace/workspace-provider.tsx");
    const experience = source("src/components/chat/chat-experience.tsx");
    const composer = source("src/components/chat/chat-composer.tsx");

    expect(provider).toContain("sendChatRequest(");
    expect(provider).toContain("chatSessionReducer");
    expect(experience).not.toContain("fetch(");
    expect(composer).not.toContain("fetch(");
    expect(composer).toContain('aria-label="输入命盘问题"');
    expect(composer).toContain("disabled={disabled}");
  });

  test("maps every real evidence category into the inspector", () => {
    const inspector = source("src/components/chat/evidence-inspector.tsx");

    for (const label of ["分析过程", "工具调用", "命盘事实", "知识来源", "critic 检查", "生成状态"]) {
      expect(inspector).toContain(label);
    }
    expect(inspector).toContain("evidence.toolsUsed");
    expect(inspector).toContain("evidence.chartFacts");
    expect(inspector).toContain("evidence.knowledgeSources");
    expect(inspector).toContain("evidence.critic");
    expect(inspector).toContain("evidence.generation");
  });

  test("uses real chart state and avoids demo replies or decorative AI motion", () => {
    const ring = source("src/components/chat/home-chart-ring.tsx");
    const bubble = source("src/components/chat/message-bubble.tsx");
    const experience = source("src/components/chat/chat-experience.tsx");

    expect(ring).toContain("ChartDisplayModel");
    expect(ring).not.toContain("PALACES");
    expect(`${bubble}${experience}`).not.toMatch(/DEMO_REPLY|DEMO_REFS|Sparkles|repeat:\s*Infinity|animate-pulse/);
  });

  test("connects browser-local model settings and explicit anonymous-data deletion", () => {
    const settings = source("src/app/(workspace)/settings/page.tsx");

    expect(settings).toContain("ModelSettingsPanel");
    expect(settings).toContain("deleteAnonymousData");
    expect(settings).toContain("API Key 只保存在当前浏览器");
    expect(settings).toContain("配置数据库时");
  });
});
