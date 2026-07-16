# Final Real Data Surfaces Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the remaining static identity and inert controls on records, sidebar, home header, and default inspector with real anonymous-workspace state while preserving the accepted redesign.

**Architecture:** Pure `src/lib/ui/*` adapters normalize records, chart summary, and calendar display. Existing client presentation components consume those adapters and `WorkspaceProvider`; only the records controller performs conversation fetches. Unsupported attachment, music, and Pro controls are removed rather than given speculative service contracts.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 5, Vitest 4, iztro-backed chart DTOs, Motion, Tailwind CSS v4.

## Global Constraints

- The supplied redesign remains the visual source of truth.
- Backend state adapts through focused view-models; accepted page composition is not simplified to fit service contracts.
- The browser-scoped anonymous profile remains the only identity required.
- The LLM never invents chart facts, calendar facts, conversation history, or insights.
- A failed or unavailable service produces an honest loading, empty, stale, or error state instead of static personalized content.
- Unsupported controls are removed from the release UI rather than shipped as inert promises.
- Existing anonymous-data deletion continues to clear server-owned and browser-owned data together.
- Keep `ziwei-chat-redesign/` untracked.

---

### Task 1: Real Conversation Timeline

**Files:**
- Modify: `src/lib/ui/conversation-records.ts`
- Modify: `src/components/workspace/life-timeline.tsx`
- Modify: `src/app/(workspace)/records/page.tsx`
- Modify: `tests/ui/conversation-records.test.ts`
- Modify: `tests/ui/reference-workspace-pages.test.ts`

**Interfaces:**
- Consumes: `loadConversationList(profileId)`, `loadConversationMessages(profileId, conversationId)`, `currentSessionConversation(conversationId, messages)`, and `useWorkspace()`.
- Produces: `ConversationTimelineItem`, `conversationTimelineItem(conversation, messages)`, and a reference-styled `LifeTimeline` backed by real persisted/current-session messages.

- [ ] **Step 1: Write failing adapter tests**

Add to `tests/ui/conversation-records.test.ts`:

```ts
import {
  conversationTimelineItem,
  currentSessionConversation,
  loadConversationList,
} from "../../src/lib/ui/conversation-records";

test("builds a timeline item only from real conversation messages", () => {
  const item = conversationTimelineItem(
    { id: "conversation-1", title: "事业方向", lastMessageAt: "2026-07-16T12:30:00.000Z" },
    [
      { id: "u1", conversationId: "conversation-1", role: "user", content: "我该换工作吗？", createdAt: "2026-07-16T12:00:00.000Z" },
      { id: "a1", conversationId: "conversation-1", role: "assistant", content: "先看官禄宫。", createdAt: "2026-07-16T12:30:00.000Z" },
    ],
  );

  expect(item).toMatchObject({
    id: "conversation-1",
    title: "事业方向",
    kind: "career",
    preview: "先看官禄宫。",
  });
  expect(item.messages).toHaveLength(2);
});

test("uses a neutral kind when the first prompt has no supported topic", () => {
  const item = conversationTimelineItem(
    { id: "conversation-2", title: "随便聊聊", lastMessageAt: "" },
    [{ id: "u2", conversationId: "conversation-2", role: "user", content: "你好", createdAt: "" }],
  );
  expect(item.kind).toBe("conversation");
});
```

- [ ] **Step 2: Run the adapter tests and verify RED**

Run: `npm run test -- tests/ui/conversation-records.test.ts`

Expected: FAIL because `conversationTimelineItem` is not exported.

- [ ] **Step 3: Implement the pure timeline adapter**

Add the following public contract to `src/lib/ui/conversation-records.ts` and implement it with short helpers:

```ts
export type ConversationTimelineKind =
  | "career"
  | "relationship"
  | "wealth"
  | "personality"
  | "recent_fortune"
  | "conversation";

export type ConversationTimelineItem = {
  id: string;
  title: string;
  kind: ConversationTimelineKind;
  preview: string;
  lastMessageAt: string;
  messages: ConversationMessageItem[];
};

export function conversationTimelineItem(
  conversation: ConversationListItem,
  messages: ConversationMessageItem[],
): ConversationTimelineItem {
  const visible = messages.filter((message) =>
    (message.role === "user" || message.role === "assistant") && message.content.trim(),
  );
  const firstUser = visible.find((message) => message.role === "user")?.content ?? "";
  const latestAssistant = [...visible].reverse().find((message) => message.role === "assistant");
  const latestVisible = visible.at(-1);
  return {
    id: conversation.id,
    title: conversation.title.trim() || firstUser.slice(0, 60) || "未命名对话",
    kind: inferTimelineKind(firstUser),
    preview: (latestAssistant ?? latestVisible)?.content.slice(0, 160) ?? "",
    lastMessageAt: conversation.lastMessageAt,
    messages: visible,
  };
}
```

Use deterministic keyword groups for only the five active V1 topics. Return `conversation` for everything else.

- [ ] **Step 4: Run the adapter tests and verify GREEN**

Run: `npm run test -- tests/ui/conversation-records.test.ts`

Expected: PASS.

- [ ] **Step 5: Write failing active-route source tests**

Update `tests/ui/reference-workspace-pages.test.ts` so the records test asserts:

```ts
const timeline = source("src/components/workspace/life-timeline.tsx");

expect(page).toContain("<LifeTimeline />");
expect(timeline).toContain("useWorkspace()");
expect(timeline).toContain("loadConversationList");
expect(timeline).toContain("loadConversationMessages");
expect(timeline).not.toContain("MONTHLY_REFLECTION");
expect(timeline).not.toContain("RECORDS.map");
```

- [ ] **Step 6: Run the route source test and verify RED**

Run: `npm run test -- tests/ui/reference-workspace-pages.test.ts`

Expected: FAIL because the active timeline still imports static workspace data.

- [ ] **Step 7: Connect the reference timeline to real conversations**

Replace the static data flow in `src/components/workspace/life-timeline.tsx` with a client controller that:

```ts
const { ready, profileId, conversationId, chatSession } = useWorkspace();
const current = currentSessionConversation(conversationId, chatSession.messages);
```

On `ready && profileId`, call `loadConversationList`. Merge the current session by id, select the first available conversation, and lazily call `loadConversationMessages` for persisted selections. Use an incrementing request id or cancellation flag so an older detail response cannot overwrite a newer selection.

Render these explicit states inside the accepted timeline geometry:

```ts
type RecordsLoadState =
  | { phase: "loading" }
  | { phase: "ready"; unavailable: boolean }
  | { phase: "error"; message: string };
```

The current browser conversation remains visible when persistence returns `503` or a recoverable error. Remove the monthly reflection block. Keep full user/assistant message text in the expanded item and label the current session `当前浏览器会话`.

Update records-page copy to say conversations are retained, without claiming AI-derived growth or monthly reflection.

- [ ] **Step 8: Run focused and regression tests**

Run: `npm run test -- tests/ui/conversation-records.test.ts tests/ui/reference-workspace-pages.test.ts tests/app/conversations-route.test.ts`

Expected: PASS.

- [ ] **Step 9: Commit Task 1**

```bash
git add src/lib/ui/conversation-records.ts src/components/workspace/life-timeline.tsx src/app/\(workspace\)/records/page.tsx tests/ui/conversation-records.test.ts tests/ui/reference-workspace-pages.test.ts
git commit -m "feat(records): connect reference timeline to conversations"
```

### Task 2: Real Sidebar Chart Summary

**Files:**
- Create: `src/lib/ui/sidebar-chart.ts`
- Modify: `src/components/sidebar.tsx`
- Create: `tests/ui/sidebar-chart.test.ts`
- Modify: `tests/ui/reference-visual-contract.test.ts`

**Interfaces:**
- Consumes: `ChartDisplayModel | null`, `chartLoading`, and `ready` from `useWorkspace()`.
- Produces: `sidebarChartSummary(input)` returning a discriminated `loading`, `empty`, or `ready` view-model.

- [ ] **Step 1: Write the failing view-model test**

Create `tests/ui/sidebar-chart.test.ts`:

```ts
import { describe, expect, test } from "vitest";
import { sidebarChartSummary } from "../../src/lib/ui/sidebar-chart";

describe("sidebar chart summary", () => {
  test("keeps loading, empty, and ready states explicit", () => {
    expect(sidebarChartSummary({ ready: false, loading: false, chart: null })).toEqual({ phase: "loading" });
    expect(sidebarChartSummary({ ready: true, loading: false, chart: null })).toEqual({ phase: "empty" });
    expect(sidebarChartSummary({
      ready: true,
      loading: false,
      chart: { chartId: "chart-1", displayName: "我的命盘", palaces: [] },
    })).toEqual({ phase: "ready", displayName: "我的命盘", detail: "12 宫确定性命盘" });
  });
});
```

- [ ] **Step 2: Run the test and verify RED**

Run: `npm run test -- tests/ui/sidebar-chart.test.ts`

Expected: FAIL because `sidebar-chart.ts` does not exist.

- [ ] **Step 3: Implement the pure chart-summary adapter**

Create `src/lib/ui/sidebar-chart.ts`:

```ts
import type { ChartDisplayModel } from "@/lib/domain/chart-display";

export type SidebarChartSummary =
  | { phase: "loading" }
  | { phase: "empty" }
  | { phase: "ready"; displayName: string; detail: string };

export function sidebarChartSummary(input: {
  ready: boolean;
  loading: boolean;
  chart: ChartDisplayModel | null;
}): SidebarChartSummary {
  if (!input.ready || input.loading) return { phase: "loading" };
  if (!input.chart) return { phase: "empty" };
  return {
    phase: "ready",
    displayName: input.chart.displayName || "我的命盘",
    detail: `${input.chart.palaces.length || 12} 宫确定性命盘`,
  };
}
```

- [ ] **Step 4: Run the test and verify GREEN**

Run: `npm run test -- tests/ui/sidebar-chart.test.ts`

Expected: PASS.

- [ ] **Step 5: Write a failing active-sidebar source assertion**

Add to `tests/ui/reference-visual-contract.test.ts`:

```ts
const sidebar = source("src/components/sidebar.tsx");
expect(sidebar).toContain("useWorkspace()");
expect(sidebar).toContain("sidebarChartSummary");
expect(sidebar).not.toContain("己巳年");
expect(sidebar).not.toContain("开通 Pro");
```

- [ ] **Step 6: Run the source test and verify RED**

Run: `npm run test -- tests/ui/reference-visual-contract.test.ts`

Expected: FAIL because the reference sidebar still contains fixed chart identity and Pro.

- [ ] **Step 7: Render the real sidebar state**

In `src/components/sidebar.tsx`, call `useWorkspace()` and `sidebarChartSummary`. Preserve the card dimensions and icon treatment while rendering:

- loading: `正在读取命盘…`, disabled visual button
- empty: `尚未创建命盘`, link label `创建命盘`
- ready: real `displayName`, deterministic detail, link label `查看命盘`

Remove the full Pro card and let the existing flex spacer preserve footer placement.

- [ ] **Step 8: Run focused tests**

Run: `npm run test -- tests/ui/sidebar-chart.test.ts tests/ui/reference-visual-contract.test.ts`

Expected: PASS.

- [ ] **Step 9: Commit Task 2**

```bash
git add src/lib/ui/sidebar-chart.ts src/components/sidebar.tsx tests/ui/sidebar-chart.test.ts tests/ui/reference-visual-contract.test.ts
git commit -m "feat(workspace): show real chart identity in sidebar"
```

### Task 3: Deterministic Home Date And Supported Composer Controls

**Files:**
- Create: `src/lib/ui/current-calendar.ts`
- Modify: `src/components/hero-header.tsx`
- Modify: `src/components/chat-composer.tsx`
- Create: `tests/ui/current-calendar.test.ts`
- Modify: `tests/ui/redesigned-chat.test.ts`

**Interfaces:**
- Consumes: an injected JavaScript `Date`.
- Produces: `currentCalendarDisplay(date)` with Gregorian date and weekday formatted for `Asia/Shanghai`; unsupported sexagenary fields are absent.

- [ ] **Step 1: Write the failing fixed-date test**

Create `tests/ui/current-calendar.test.ts`:

```ts
import { describe, expect, test } from "vitest";
import { currentCalendarDisplay } from "../../src/lib/ui/current-calendar";

describe("current calendar display", () => {
  test("formats an injected instant in Asia/Shanghai", () => {
    expect(currentCalendarDisplay(new Date("2026-07-16T16:30:00.000Z"))).toEqual({
      dateLabel: "2026年7月17日 · 周五",
    });
  });
});
```

- [ ] **Step 2: Run the test and verify RED**

Run: `npm run test -- tests/ui/current-calendar.test.ts`

Expected: FAIL because `current-calendar.ts` does not exist.

- [ ] **Step 3: Implement deterministic formatting**

Create `src/lib/ui/current-calendar.ts` using `Intl.DateTimeFormat` with `timeZone: "Asia/Shanghai"`. Use `formatToParts` to return exactly `YYYY年M月D日 · 周X` and no custom lunar or stem-branch calculation.

- [ ] **Step 4: Run the calendar test and verify GREEN**

Run: `npm run test -- tests/ui/current-calendar.test.ts`

Expected: PASS.

- [ ] **Step 5: Write failing active-control source assertions**

Update `tests/ui/redesigned-chat.test.ts`:

```ts
const header = source("src/components/hero-header.tsx");
const composer = source("src/components/chat-composer.tsx");

expect(header).toContain("currentCalendarDisplay");
expect(header).not.toContain("2025年05月14日");
expect(header).not.toContain("背景音乐");
expect(composer).not.toContain("添加附件");
expect(composer).not.toContain("Paperclip");
```

- [ ] **Step 6: Run the source test and verify RED**

Run: `npm run test -- tests/ui/redesigned-chat.test.ts`

Expected: FAIL because the static date, music button, and attachment button remain.

- [ ] **Step 7: Connect the header and simplify the composer**

In `HeroHeader`, derive the display once after mount so SSR and hydration do not disagree:

```ts
const [calendar, setCalendar] = useState<CurrentCalendarDisplay | null>(null);
useEffect(() => setCalendar(currentCalendarDisplay(new Date())), []);
```

Keep the date column width stable while loading. Render only `dateLabel`; remove the fixed sexagenary line and music button. Preserve the inspector toggle.

In `ChatComposer`, remove `Paperclip` and the attachment button. Keep textarea and send button aligned in the existing surface.

- [ ] **Step 8: Run focused tests**

Run: `npm run test -- tests/ui/current-calendar.test.ts tests/ui/redesigned-chat.test.ts`

Expected: PASS.

- [ ] **Step 9: Commit Task 3**

```bash
git add src/lib/ui/current-calendar.ts src/components/hero-header.tsx src/components/chat-composer.tsx tests/ui/current-calendar.test.ts tests/ui/redesigned-chat.test.ts
git commit -m "feat(home): use deterministic current date"
```

### Task 4: Default Inspector Data Deletion

**Files:**
- Modify: `src/components/inspector-panel.tsx`
- Modify: `tests/ui/reference-visual-contract.test.ts`
- Modify: `src/components/AGENTS.md`
- Modify: `src/lib/AGENTS.md`
- Modify: `docs/development/ui-backend-gap-list.md`
- Modify: `docs/development/project-status.md`

**Interfaces:**
- Consumes: `deleteAnonymousData`, `dataDeleting`, and `dataDeletionError` from `useWorkspace()`.
- Produces: one confirmed deletion action with success/failure truthfulness identical to settings.

- [ ] **Step 1: Write the failing inspector source assertions**

Add to `tests/ui/reference-visual-contract.test.ts`:

```ts
const inspector = source("src/components/inspector-panel.tsx");
expect(inspector).toContain("useWorkspace()");
expect(inspector).toContain("deleteAnonymousData");
expect(inspector).toContain("AlertDialog");
expect(inspector).toContain("dataDeletionError");
```

- [ ] **Step 2: Run the source test and verify RED**

Run: `npm run test -- tests/ui/reference-visual-contract.test.ts`

Expected: FAIL because the default inspector button has no handler or confirmation.

- [ ] **Step 3: Connect the shared deletion operation**

In `InspectorPanel`, consume the deletion fields from `useWorkspace()`. Wrap the existing destructive button in the project-owned `AlertDialog` primitives. Use the same consequence language as settings and call:

```ts
onClick={() => void deleteAnonymousData()}
```

Disable confirm while `dataDeleting`, display `正在删除…`, and render `dataDeletionError` below the trigger without clearing local state on failure.

- [ ] **Step 4: Run focused tests and typecheck**

Run: `npm run test -- tests/ui/reference-visual-contract.test.ts tests/ui/reference-settings-page.test.ts`

Expected: PASS.

Run: `npm run typecheck`

Expected: PASS.

- [ ] **Step 5: Update module and status documentation**

Update `src/components/AGENTS.md` and `src/lib/AGENTS.md` to describe the real records controller, sidebar adapter, calendar adapter, and connected inspector deletion. Update `docs/development/ui-backend-gap-list.md` and `docs/development/project-status.md` so records, sidebar, date, deletion, Pro, music, and attachments are no longer listed as open integration gaps.

- [ ] **Step 6: Run the complete automated gate**

Run: `npm run lint`

Expected: zero errors in project source.

Run: `npm run typecheck`

Expected: PASS.

Run: `npm run test`

Expected: all tests PASS.

Run: `npm run eval:agent`

Expected: 10/10 cases PASS.

Run: `npm run build`

Expected: production build PASS.

- [ ] **Step 7: Commit Task 4**

```bash
git add src/components/inspector-panel.tsx tests/ui/reference-visual-contract.test.ts src/components/AGENTS.md src/lib/AGENTS.md docs/development/ui-backend-gap-list.md docs/development/project-status.md
git commit -m "feat(settings): connect inspector data deletion"
```

