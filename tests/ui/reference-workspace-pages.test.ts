import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("reference workspace pages", () => {
  test("keeps the reference records composition", () => {
    const page = source("src/app/(workspace)/records/page.tsx");
    const timeline = source("src/components/workspace/life-timeline.tsx");

    expect(page).toContain("你的人生，");
    expect(page).toContain("<LifeTimeline />");
    expect(timeline).toContain("useWorkspace()");
    expect(timeline).toContain("loadConversationList");
    expect(timeline).toContain("loadConversationMessages");
    expect(timeline).toContain("type ConversationDetailState");
    expect(timeline).toContain("retryDetail");
    expect(timeline).not.toContain("MONTHLY_REFLECTION");
    expect(timeline).not.toContain("RECORDS.map");
  });

  test("keeps the reference insights composition", () => {
    const page = source("src/app/(workspace)/insights/page.tsx");

    expect(page).toContain("过去的你，");
    expect(page).toContain("<WeeklyLetter />");
    expect(page).toContain("<PatternList />");
  });
});
