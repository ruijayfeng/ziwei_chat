# Ziwei Zhidao Reference UI Rebuild Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Rebuild the Ziwei Chat frontend into the 紫微知道 analysis workspace shown in ref.png, preserving chart, streaming chat, evidence, model-setting, and privacy behavior.

**Architecture:** Keep the single Next.js route and the existing API contract. ZiweiChatShell remains the owner of profile, chart, message, evidence, and stream state. It gains a client-side workspace view; a fixed left rail selects views while the central and right workspace areas change together. Pure UI helpers parse the existing response protocol and map only existing evidence/model data into the reference-style panels.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS v4, shadcn/Base UI primitives, Lucide, Vitest, existing Vercel AI SDK route.

## Reference Source

- Canonical desktop design reference: D:\Ziwei\ziwei_chat\ref.png.
- Reopen ref.png during every desktop visual review before judging hierarchy, spacing, color balance, or panel composition.
- The older purple/red-frame screenshots are obsolete and must not be used as design input.

## Global Constraints

- Preserve POST /api/chat and DELETE /api/chat?profileId=...; do not change Agent orchestration, chart computation, retrieval, persistence, or model-provider code.
- Keep one client-side route. Navigation changes the central/right workspace; the desktop left rail remains fixed.
- Match ref.png: warm near-white canvas, quiet blue-black text, blue-gray borders, restrained indigo accent, thin dividers, low shadow, and compact Chinese product typography.
- Do not use red-gold fortune motifs, antique/temple imagery, scrolls, compasses, starfield-game chrome, purple SaaS gradients, or marketing hero composition.
- Render 你好，{name} only when chartInput.name is non-empty and not 我的命盘; otherwise render 你好，欢迎回来.
- Do not fabricate chart facts, Ollama availability, knowledge status, history, favorites, memory, timestamps, or Agent events. Use real data, a clear empty state, or a non-assertive future surface.
- The palace wheel and orbital motif are visual context only. They must not be presented as deterministic chart output.
- Keep model settings browser-local; never render API keys.
- Keep focus behavior, reduced-motion handling, retry behavior, and clear-data confirmation intact.
- Do not add a large UI library or database dependency.
- Final checks: npm run lint, npm run typecheck, npm run test, npm run eval:agent, npm run build, and desktop/mobile browser review.

---

## File Structure

- Create src/lib/ui/workspace-navigation.ts: client-side workspace view union, fixed rail metadata, and greeting logic.
- Create src/lib/ui/chat-report.ts: parser for the current five-section deterministic response format.
- Create src/components/app-sidebar.tsx: fixed brand/nav/current-chart/local-data rail.
- Create src/components/report-message.tsx: reference-style structured assistant answer.
- Create src/components/chart-workspace.tsx: chart editor and honest visual placeholder.
- Create src/components/topics-workspace.tsx: standalone topic-selection view that reuses the existing prompts.
- Create src/components/records-workspace.tsx: current-session-only records surface.
- Create src/components/settings-workspace.tsx: existing model settings and privacy controls in workspace form.
- Create tests/ui/workspace-navigation.test.ts and tests/ui/chat-report.test.ts.
- Modify src/app/globals.css, src/app/layout.tsx, src/components/ziwei-chat-shell.tsx, src/components/chat-panel.tsx, src/components/evidence-drawer.tsx, src/components/topic-entry.tsx, src/components/chart-onboarding.tsx, src/components/model-settings-panel.tsx, and src/components/AGENTS.md.

## Contracts

~~~ts
export type WorkspaceView = "chat" | "chart" | "topics" | "records" | "settings";

export type ChatReport = {
  conclusion: string;
  chartBasis: string[];
  plainExplanation: string;
  suggestion: string;
  followUp: string;
};

export function greetingForChart(chart: CreateChartInput | null): string;
export function parseChatReport(content: string): ChatReport | null;
~~~

Existing chat messages stay { role: "user" | "assistant"; content: string }. No API, evidence-event, tool, or model-setting shape changes.

---

### Task 1: Add Testable Workspace and Report Helpers

**Files:**
- Create: src/lib/ui/workspace-navigation.ts
- Create: src/lib/ui/chat-report.ts
- Create: tests/ui/workspace-navigation.test.ts
- Create: tests/ui/chat-report.test.ts

**Consumes:** CreateChartInput and labels emitted by composeResponse.

**Produces:** Testable navigation, greeting, and report parsing behavior.

- [ ] **Step 1: Write failing navigation/greeting tests**

~~~ts
import { describe, expect, it } from "vitest";
import { greetingForChart, workspaceNavigation } from "@/lib/ui/workspace-navigation";

describe("workspace navigation", () => {
  it("keeps the five views in reference order", () => {
    expect(workspaceNavigation.map((item) => item.id)).toEqual([
      "chat", "chart", "topics", "records", "settings",
    ]);
  });

  it("uses a generic greeting until a non-default chart name exists", () => {
    expect(greetingForChart(null)).toBe("你好，欢迎回来");
    expect(greetingForChart({ name: "我的命盘" } as never)).toBe("你好，欢迎回来");
    expect(greetingForChart({ name: "Jay" } as never)).toBe("你好，Jay");
  });
});
~~~

- [ ] **Step 2: Verify RED**

Run: npm run test -- tests/ui/workspace-navigation.test.ts

Expected: FAIL because the helper module does not exist.

- [ ] **Step 3: Implement workspace metadata and greeting**

~~~ts
export type WorkspaceView = "chat" | "chart" | "topics" | "records" | "settings";

export function greetingForChart(chart: CreateChartInput | null) {
  const name = chart?.name.trim();
  return name && name !== "我的命盘" ? "你好，" + name : "你好，欢迎回来";
}

export const workspaceNavigation = [
  { id: "chat", label: "对话", icon: MessageCircle },
  { id: "chart", label: "命盘", icon: CircleDotDashed },
  { id: "topics", label: "主题", icon: PanelsTopLeft },
  { id: "records", label: "记录", icon: History },
  { id: "settings", label: "设置", icon: Settings2 },
] as const satisfies ReadonlyArray<{ id: WorkspaceView; label: string; icon: LucideIcon }>;
~~~

- [ ] **Step 4: Write failing report-parser tests**

~~~ts
import { expect, it } from "vitest";
import { parseChatReport } from "@/lib/ui/chat-report";

it("parses the current five-part response protocol", () => {
  const report = parseChatReport(
    "结论：暂不建议换工作。\n\n命盘依据：\n- 事业宫主星稳定。\n\n现实解释：外部机会仍在变化。\n\n建议：先积累作品。\n\n追问：你更在意收入还是成长？",
  );
  expect(report).toMatchObject({
    conclusion: "暂不建议换工作。",
    chartBasis: ["事业宫主星稳定。"],
    followUp: "你更在意收入还是成长？",
  });
});

it("uses a prose fallback for non-protocol content", () => {
  expect(parseChatReport("普通回复")).toBeNull();
});
~~~

- [ ] **Step 5: Verify RED**

Run: npm run test -- tests/ui/chat-report.test.ts

Expected: FAIL because the parser module does not exist.

- [ ] **Step 6: Implement parser with explicit fallback**

~~~ts
const labels = ["结论：", "命盘依据：", "现实解释：", "建议：", "追问："] as const;

export function parseChatReport(content: string): ChatReport | null {
  const sections = labels.map((label, index) => {
    const start = content.indexOf(label);
    const nextStarts = labels.slice(index + 1)
      .map((item) => content.indexOf(item))
      .filter((value) => value >= 0);
    return start < 0 ? "" : content.slice(start + label.length, nextStarts.length ? Math.min(...nextStarts) : undefined).trim();
  });

  if (sections.some((value) => !value)) return null;

  return {
    conclusion: sections[0],
    chartBasis: sections[1].split("\n").map((line) => line.replace(/^\-\s*/, "").trim()).filter(Boolean),
    plainExplanation: sections[2],
    suggestion: sections[3],
    followUp: sections[4],
  };
}
~~~

- [ ] **Step 7: Verify GREEN and commit**

Run: npm run test -- tests/ui/workspace-navigation.test.ts tests/ui/chat-report.test.ts

Expected: PASS.

~~~bash
git add src/lib/ui/workspace-navigation.ts src/lib/ui/chat-report.ts tests/ui/workspace-navigation.test.ts tests/ui/chat-report.test.ts
git commit -m "feat: add workspace presentation helpers"
~~~

### Task 2: Establish the Reference-Led Visual System

**Files:**
- Modify: src/app/globals.css
- Modify: src/app/layout.tsx

**Consumes:** Existing Tailwind variables, Noto Sans SC, Geist, and ref.png.

**Produces:** Shared visual tokens for all workspace views.

- [ ] **Step 1: Replace teal-led tokens with the reference palette**

~~~css
:root {
  --background: #fafaf8;
  --foreground: #1d2942;
  --card: #ffffff;
  --surface-muted: #f4f5f8;
  --border: #e6e7ee;
  --muted-foreground: #6f788c;
  --primary: #5261ad;
  --primary-strong: #435196;
  --accent: #f0f1ff;
  --accent-foreground: #4e5cb0;
  --success: #4d9b7b;
  --warning: #b65b52;
  --radius: 0.75rem;
}
~~~

Preserve semantic names consumed by shadcn components, focus-visible outlines, selection styling, and reduced-motion behavior. Do not add gradient text or a gradient page background.

- [ ] **Step 2: Update metadata without changing fonts**

~~~ts
export const metadata: Metadata = {
  title: "紫微知道",
  description: "可信的命盘分析助手",
};
~~~

- [ ] **Step 3: Verify and commit**

Run: npm run typecheck

Expected: PASS.

~~~bash
git add src/app/globals.css src/app/layout.tsx
git commit -m "style: establish ziwei zhidao visual tokens"
~~~

### Task 3: Build the Fixed Left Rail

**Files:**
- Create: src/components/app-sidebar.tsx
- Modify: src/components/ziwei-chat-shell.tsx

**Consumes:** WorkspaceView, current chart input/sync state, and the existing clear-data confirmation action.

**Produces:** Fixed desktop rail with brand, five navigation controls, compact chart identity, local-data actions, and version copy.

- [ ] **Step 1: Create an explicit sidebar contract**

~~~ts
type AppSidebarProps = {
  activeView: WorkspaceView;
  chartInput: CreateChartInput | null;
  chartSynced: boolean;
  onEditChart: () => void;
  onSelectView: (view: WorkspaceView) => void;
  localDataActions: React.ReactNode;
};

export function AppSidebar(props: AppSidebarProps): React.ReactNode;
~~~

The component renders full-width navigation buttons, a pale indigo active state, and icon-only edit/chevron buttons with title text. It does not render ChartOnboarding or ModelSettingsPanel.

- [ ] **Step 2: Render an honest current-chart card**

Render actual CreateChartInput fields only: name, birth date, birth time, gender, calendar type, birthplace, and sync label. A faint radial wheel may be decorative context but cannot be labelled as computed chart. No chart renders 尚未创建命盘 with an edit action.

- [ ] **Step 3: Move desktop rail composition into the shell**

~~~tsx
const [activeView, setActiveView] = useState<WorkspaceView>("chat");

<AppSidebar
  activeView={activeView}
  chartInput={chartInput}
  chartSynced={chartSynced}
  onEditChart={() => setActiveView("chart")}
  onSelectView={setActiveView}
  localDataActions={<ClearDataDialog onConfirm={deleteLocalData} />}
/>
~~~

Reuse this component in the existing mobile Sheet. Do not duplicate desktop/mobile navigation markup.

- [ ] **Step 4: Verify and commit**

Run: npm run typecheck

Expected: PASS.

~~~bash
git add src/components/app-sidebar.tsx src/components/ziwei-chat-shell.tsx
git commit -m "feat: add fixed workspace navigation rail"
~~~

### Task 4: Rebuild Dialogue as an Analysis Report

**Files:**
- Create: src/components/report-message.tsx
- Modify: src/components/chat-panel.tsx
- Modify: src/components/topic-entry.tsx
- Modify: src/components/ziwei-chat-shell.tsx

**Consumes:** Existing message state, callbacks, stream/error states, greetingForChart, and parseChatReport.

**Produces:** Greeting, six quick topics, thin user prompt row, report answer, and anchored composer.

- [ ] **Step 1: Implement structured and fallback assistant rendering**

~~~tsx
export function ReportMessage({ content }: { content: string }) {
  const report = parseChatReport(content);
  if (!report) return <div className="whitespace-pre-wrap text-sm leading-7 text-foreground">{content}</div>;

  return (
    <article aria-label="命盘分析回答">
      <ReportSection title="结论">{report.conclusion}</ReportSection>
      <div className="grid border-y border-border py-5 md:grid-cols-2">
        <ReportSection title="命盘依据">
          <ul>{report.chartBasis.map((fact) => <li key={fact}>{fact}</li>)}</ul>
        </ReportSection>
        <ReportSection title="现实解释">{report.plainExplanation}</ReportSection>
      </div>
      <div className="grid pt-5 md:grid-cols-2">
        <ReportSection title="建议">{report.suggestion}</ReportSection>
        <ReportSection title="你可能还想问">{report.followUp}</ReportSection>
      </div>
    </article>
  );
}

function ReportSection({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="min-w-0 p-5"><h3>{title}</h3><div>{children}</div></section>;
}
~~~

Do not render thumbs, timestamps, citation counts, or feedback controls because existing API data does not provide them.

- [ ] **Step 2: Expand shortcuts to six real routed prompts**

Add 命盘解释 with prompt 请解释一下我的命盘重点。. Preserve the existing five prompts. Add short reference-style descriptions; no shortcut component calls the API.

- [ ] **Step 3: Recompose ChatPanel**

For an empty transcript: show greeting, 今天想从哪里开始了解自己？, and six topic controls. For a non-empty transcript: retain compact greeting, render user content as a thin pale row, and render assistant content through ReportMessage in a wide report surface. Preserve controlled input, submit, loading, error, and retry callbacks.

- [ ] **Step 4: Send selected topic to the existing composer, not the API**

~~~ts
function selectTopic(prompt: string) {
  setActiveView("chat");
  setDraft(prompt);
}
~~~

Use this callback for every topic entry and Topics view action.

- [ ] **Step 5: Verify and commit**

Run: npm run test -- tests/ui/chat-report.test.ts

Expected: PASS.

Run: npm run typecheck

Expected: PASS.

~~~bash
git add src/components/report-message.tsx src/components/chat-panel.tsx src/components/topic-entry.tsx src/components/ziwei-chat-shell.tsx
git commit -m "feat: render chat as a ziwei analysis report"
~~~

### Task 5: Rebuild the Right Analysis Panel from Real State

**Files:**
- Modify: src/components/evidence-drawer.tsx
- Modify: src/components/ziwei-chat-shell.tsx
- Modify: src/lib/ui/model-settings.ts if a display helper is required
- Modify: tests/ui/chat-evidence.test.ts

**Consumes:** EvidenceState, EvidenceRun, ModelSettingsDraft, and modelSettingsStatus.

**Produces:** Reference-style process, fact, runtime, and privacy panels without fabricated status.

- [ ] **Step 1: Add failing display tests**

~~~ts
expect(runtimeLabel(defaultModelSettingsDraft)).toBe("本地规则");
expect(stepLabel({ status: "failed" } as EvidenceStep)).toBe("失败");
~~~

- [ ] **Step 2: Verify RED**

Run: npm run test -- tests/ui/chat-evidence.test.ts

Expected: FAIL until display helpers are exported.

- [ ] **Step 3: Make analysis process evidence-driven**

The latest EvidenceRun.steps is the timeline. No run shows 发送命盘相关问题后，这里会显示本次分析过程。. Running shows actual pending/running states; failed shows failed; top-level 已完成 appears only when run.status equals completed.

- [ ] **Step 4: Make facts and sources evidence-driven**

Use evidence.chartFacts and supplied confidence only. Use evidence.knowledgeSources only. Empty panels explain that an analysis has not produced corresponding evidence; they do not populate example data.

- [ ] **Step 5: Map runtime without secret exposure or fake Ollama**

~~~ts
export function runtimeLabel(settings: ModelSettingsDraft) {
  if (settings.provider === "deterministic-local") return "本地规则";
  return settings.model.trim() || "模型待补全";
}

export function retrievalLabel(settings: ModelSettingsDraft) {
  return settings.embedding.provider === "disabled" ? "本地关键词检索" : "Embedding 已配置";
}
~~~

Render 管理本地资料 with the existing confirmation action. Never render apiKey.

- [ ] **Step 6: Keep one desktop/mobile evidence implementation**

Desktop renders the panel in the right rail. The existing mobile Sheet renders EvidenceDrawer compact using the same props and helpers.

- [ ] **Step 7: Verify GREEN and commit**

Run: npm run test -- tests/ui/chat-evidence.test.ts

Expected: PASS.

Run: npm run typecheck

Expected: PASS.

~~~bash
git add src/components/evidence-drawer.tsx src/components/ziwei-chat-shell.tsx src/lib/ui/model-settings.ts tests/ui/chat-evidence.test.ts
git commit -m "feat: align analysis panel with live evidence"
~~~

### Task 6: Add Honest Chart, Topics, Records, and Settings Views

**Files:**
- Create: src/components/chart-workspace.tsx
- Create: src/components/topics-workspace.tsx
- Create: src/components/records-workspace.tsx
- Create: src/components/settings-workspace.tsx
- Modify: src/components/chart-onboarding.tsx
- Modify: src/components/model-settings-panel.tsx
- Modify: src/components/ziwei-chat-shell.tsx

**Consumes:** Existing chart editor callbacks, in-memory messages, model settings, and clear-data action.

**Produces:** Navigation views in the central/right workspace without claiming persistent data that has no read API.

- [ ] **Step 1: Build chart workspace from existing chart input**

~~~tsx
type ChartWorkspaceProps = {
  profileId: string;
  chartInput: CreateChartInput | null;
  chartSynced: boolean;
  onChartReady: (chart: CreateChartInput) => void;
  onResetChart: () => void;
};

export function ChartWorkspace(props: ChartWorkspaceProps) {
  return (
    <section aria-labelledby="chart-workspace-title">
      <h2 id="chart-workspace-title">命盘</h2>
      <p>查看当前用于分析的出生资料与命盘摘要。</p>
      <ChartOnboarding {...props} />
      <ChartVisualPlaceholder hasChart={Boolean(props.chartInput)} />
    </section>
  );
}

function ChartVisualPlaceholder({ hasChart }: { hasChart: boolean }) {
  return <p>{hasChart ? "完整命盘图将在可用结构化盘面数据后展示" : "保存命盘资料后可查看命盘摘要。"}</p>;
}
~~~

ChartVisualPlaceholder text is exactly 完整命盘图将在可用结构化盘面数据后展示. It is not a generated chart.

- [ ] **Step 2: Build topic workspace from existing quick actions**

Reuse TopicEntry and selectTopic. Supporting text is 选择主题后将在对话中预填问题。. Selection never auto-sends.

~~~tsx
export function TopicsWorkspace({ onSelect }: { onSelect: (prompt: string) => void }) {
  return <section><h2>主题</h2><p>选择主题后将在对话中预填问题。</p><TopicEntry onSelect={onSelect} /></section>;
}
~~~

- [ ] **Step 3: Build records from current session only**

~~~tsx
export function RecordsWorkspace({ messages }: { messages: ChatMessage[] }) {
  if (messages.length === 0) {
    return <EmptyWorkspace title="暂无分析记录" description="完成一次对话后，本次浏览会话会显示在这里。历史记录同步尚未开放。" />;
  }
  return <CurrentSessionList messages={messages} />;
}

function EmptyWorkspace({ title, description }: { title: string; description: string }) {
  return <section><h2>{title}</h2><p>{description}</p></section>;
}

function CurrentSessionList({ messages }: { messages: ChatMessage[] }) {
  return <ol>{messages.map((message, index) => <li key={message.role + index}>{message.content}</li>)}</ol>;
}
~~~

No category filter, search result, favorite state, or historic date may appear because the frontend has no read API for those values.

- [ ] **Step 4: Build settings from real controls**

Place ModelSettingsPanel, runtimeLabel, retrievalLabel, and the existing local-data confirmation action in SettingsWorkspace. Do not add a save button: the shell writes settings to localStorage on change.

~~~tsx
export function SettingsWorkspace({ value, loaded, onChange, localDataActions }: {
  value: ModelSettingsDraft;
  loaded: boolean;
  onChange: (next: ModelSettingsDraft) => void;
  localDataActions: React.ReactNode;
}) {
  return <section><h2>设置</h2><ModelSettingsPanel value={value} loaded={loaded} onChange={onChange} />{localDataActions}</section>;
}
~~~

- [ ] **Step 5: Switch central/right workspace from one state source**

~~~tsx
function renderWorkspace() {
  const chartProps = {
    profileId,
    chartInput,
    chartSynced,
    onChartReady: (chart: CreateChartInput) => { setChartInput(chart); setChartSynced(false); setError(null); },
    onResetChart: resetChartDraft,
  };
  const settingsProps = { value: modelSettings, loaded: modelSettingsLoaded, onChange: setModelSettings, localDataActions: <ClearDataDialog onConfirm={deleteLocalData} /> };
  const chatProps = { messages, draft, isStreaming, error, onRetry: retryLastMessage, onDraftChange: setDraft, onSubmit: () => void sendMessage() };
  switch (activeView) {
    case "chart": return <ChartWorkspace {...chartProps} />;
    case "topics": return <TopicsWorkspace onSelect={selectTopic} />;
    case "records": return <RecordsWorkspace messages={messages} />;
    case "settings": return <SettingsWorkspace {...settingsProps} />;
    default: return <ChatPanel {...chatProps} />;
  }
}
~~~

The matching right context remains inside the same desktop grid. The left rail must not remount.

- [ ] **Step 6: Verify and commit**

Run: npm run typecheck

Expected: PASS.

~~~bash
git add src/components/chart-workspace.tsx src/components/topics-workspace.tsx src/components/records-workspace.tsx src/components/settings-workspace.tsx src/components/chart-onboarding.tsx src/components/model-settings-panel.tsx src/components/ziwei-chat-shell.tsx
git commit -m "feat: add client-side workspace views"
~~~

### Task 7: Responsive Polish, Documentation, and Visual Verification

**Files:**
- Modify: src/app/globals.css
- Modify: src/components/AGENTS.md
- Modify: docs/development/project-status.md after checks pass

**Consumes:** Completed workspace components and ref.png.

**Produces:** Reference-aligned desktop UI, usable mobile UI, and an accurate component map.

- [ ] **Step 1: Add structural breakpoints**

~~~css
@media (max-width: 1279px) {
  .workspace-right-rail { display: none; }
}

@media (max-width: 1023px) {
  .workspace-left-rail { display: none; }
  .workspace-main { min-width: 0; }
}
~~~

At mobile widths, use existing Sheets for navigation/evidence. Do not scale type with viewport width and do not allow horizontal overflow.

- [ ] **Step 2: Update component documentation**

Document responsibilities of app-sidebar.tsx, chart-workspace.tsx, records-workspace.tsx, settings-workspace.tsx, and report-message.tsx in src/components/AGENTS.md. Update the ZiweiChatShell entry to state it coordinates client-side views and stream state.

- [ ] **Step 3: Run complete automated checks**

~~~bash
npm run lint
npm run typecheck
npm run test
npm run eval:agent
npm run build
~~~

Expected: every command exits with code 0.

- [ ] **Step 4: Perform desktop reference review**

Start npm run dev, open the app at a 1536px-wide viewport, then reopen ref.png beside it. Check:

- fixed rail: brand, five navigation entries, compact current chart, local-data actions;
- generic greeting before a saved name and personalized greeting after a valid name;
- pale topic buttons, thin user row, report-form assistant response, anchored composer;
- right rail order: process, analysis facts, runtime, privacy;
- no fake Ollama, history, chart facts, or timestamps;
- no gradient text, oversized shadows, decorative starfield, text overlap, or overflow.

- [ ] **Step 5: Perform mobile review**

At a 390px-wide viewport, verify dialogue-first behavior, navigation/evidence Sheets, wrapped readable Chinese text, no horizontal scroll, and normal submit/retry behavior.

- [ ] **Step 6: Record only verified results**

After all commands and browser checks pass, update docs/development/project-status.md with exact commands run and delivered UI capability. Do not state a check passed unless it was run.

- [ ] **Step 7: Commit the verification slice**

~~~bash
git add src/app/globals.css src/components/AGENTS.md docs/development/project-status.md
git commit -m "docs: record ziwei zhidao UI verification"
~~~

## Acceptance Checklist

- [ ] ref.png was reopened during final desktop review.
- [ ] Desktop left rail is fixed; navigation changes the central/right workspace without changing URLs.
- [ ] No user name is hard-coded; saved/default/absent chart names follow the greeting rule.
- [ ] Chat preserves existing stream/error/retry behavior and presents protocol responses as reports.
- [ ] The analysis panel maps only real evidence, model configuration, and privacy state.
- [ ] Chart, records, and settings do not claim missing API data.
- [ ] /api/chat and Agent code remain unchanged.
- [ ] Automated checks and desktop/mobile review pass.
