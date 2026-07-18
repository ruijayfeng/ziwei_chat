import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, test } from "vitest";

const obsoleteComponents = [
  "src/components/workspace/app-layout.tsx",
  "src/components/workspace/sidebar.tsx",
  "src/components/workspace/mobile-chrome.tsx",
  "src/components/workspace/motion-provider.tsx",
  "src/components/workspace/nav-items.ts",
  "src/components/brand/ziwei-logotype.tsx",
  "src/components/chart/chart-page.tsx",
  "src/components/chart/chart-provider.tsx",
  "src/components/chat/home-chart-ring.tsx",
  "src/components/chat/chat-composer.tsx",
  "src/components/records/life-timeline.tsx",
  "src/lib/chart-data.ts",
  "src/components/report-message.tsx",
  "src/components/markdown-message.tsx",
  "src/lib/ui/chat-report.ts",
  "src/lib/ui/markdown.ts",
];

const activeReplacements = [
  "src/components/app-layout.tsx",
  "src/components/sidebar.tsx",
  "src/components/mobile-chrome.tsx",
  "src/components/motion-provider.tsx",
  "src/components/nav-items.ts",
  "src/components/brand/logotype.tsx",
  "src/components/chart/chart-context.tsx",
  "src/app/(workspace)/chart/page.tsx",
  "src/components/destiny-ring.tsx",
  "src/components/workspace/life-timeline.tsx",
  "src/lib/reference-chart-contract.ts",
];

describe("migration cleanup", () => {
  test("removes superseded presenters while retaining replacement files", () => {
    for (const path of obsoleteComponents) {
      expect(existsSync(resolve(process.cwd(), path)), path).toBe(false);
    }
    for (const path of activeReplacements) {
      expect(existsSync(resolve(process.cwd(), path)), path).toBe(true);
    }
  });

  test("keeps active routes wired to the replacement shell, chart, and records presenters", () => {
    const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

    expect(source("src/app/(workspace)/page.tsx")).toContain("@/components/app-layout");
    expect(source("src/app/(workspace)/chart/page.tsx")).toContain("@/components/chart/chart-context");
    expect(source("src/app/(workspace)/records/page.tsx")).toContain("@/components/workspace/life-timeline");
    expect(source("src/components/sidebar.tsx")).toContain("@/components/brand/logotype");
  });
});
