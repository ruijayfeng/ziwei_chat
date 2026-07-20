import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("reference workspace pages", () => {
  test("keeps the reference records composition", () => {
    const page = source("src/app/(workspace)/records/page.tsx");
    const timeline = source("src/components/workspace/life-timeline.tsx");

    expect(page).toContain("你关心过的事，");
    expect(page).toContain("<LifeTimeline />");
    expect(timeline).toContain("useWorkspace()");
    expect(timeline).toContain("loadConversationList");
    expect(timeline).toContain("loadConversationMessages");
    expect(timeline).toContain("type ConversationDetailState");
    expect(timeline).toContain("retryDetail");
    expect(timeline).toContain("retryList");
    expect(timeline).toContain("conversationDetailView");
    expect(timeline).toContain("AbortController");
    expect(timeline).toContain("resumeConversation");
    expect(timeline).toContain("继续聊");
    expect(timeline).toContain("MarkdownAnswer");
    expect(timeline).toContain("px-4 pb-4");
    expect(timeline).toContain("message.role === 'assistant' ? (");
    expect(timeline).not.toContain("MONTHLY_REFLECTION");
    expect(timeline).not.toContain("RECORDS.map");
  });

  test("keeps the reference insights composition", () => {
    const page = source("src/app/(workspace)/insights/page.tsx");
    const controller = source("src/components/insights/insights-controller.tsx");
    const weeklyLetter = source("src/components/insights/weekly-letter.tsx");
    const patterns = source("src/components/insights/pattern-list.tsx");

    expect(page).toContain("<InsightsController />");
    expect(page).not.toContain("<InsightsEmptyState />");
    expect(controller).toContain("loadInsightSourceBundle");
    expect(controller).toContain("aggregateInsightSources");
    expect(controller).toContain("<WeeklyLetter");
    expect(controller).toContain("<PatternList");
    expect(weeklyLetter).toContain("<InsightSources");
    expect(patterns).toContain("<article");
    expect(patterns).toContain("<InsightSources");
    expect(patterns).toContain("size-10");
    expect(patterns).toContain("topicPresentation");
    expect(patterns).not.toContain("<button");
    expect(patterns).not.toContain("<a ");
    const sources = source("src/components/insights/insight-sources.tsx");
    expect(sources).toContain("source.createdAt ? <time");
    expect(sources).toContain("时间未持久化");
    expect(sources).not.toContain("当前浏览器会话，时间未持久化");
  });
});
