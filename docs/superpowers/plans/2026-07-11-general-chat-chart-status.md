# General Chat Chart Status Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent ordinary chat from claiming birth data is missing after the current anonymous profile has already supplied a chart.

**Architecture:** Keep chart ownership in the route and pass only an explicit `hasChart` boolean into conversation-mode analyst prompts. Make the deterministic general-chat fallback neutral so it cannot contradict saved state. Do not change chart-required intent handling.

**Tech Stack:** Next.js 16 App Router, TypeScript, Vitest, OpenAI-compatible model adapter

## Global Constraints

- Preserve the current chart-analysis, safety, and missing-chart contracts.
- Do not infer chart state from model output or conversation text.
- Do not add persistence, dependencies, UI changes, or output string filtering.
- Preserve existing user changes in the dirty worktree.

---

### Task 1: Propagate Explicit Chart Status Through General Chat

**Files:**
- Modify: `tests/app/chat-route.test.ts`
- Modify: `src/app/api/chat/route.ts`
- Modify: `src/lib/agent/llm-analyst.ts`
- Modify: `src/lib/AGENTS.md` only if the analyst responsibility description becomes inaccurate

**Interfaces:**
- Consumes: request-scoped chart state created from `ChatRequestBody.chartInput`
- Produces: `LlmAnalystInput.hasChart?: boolean`, consumed only by conversation-mode prompt construction

- [ ] **Step 1: Write the failing route regression tests**

Extend the existing general conversation test so it supplies a valid `chartInput`, then inspect the model request:

```ts
expect(payload.messages[1]?.content).toContain("当前命盘状态：已设置。");
expect(payload.messages[1]?.content).toContain("请自然、直接地回应用户当前消息");
expect(payload.messages[1]?.content).not.toContain("请提供出生");
```

Add the corresponding no-chart case:

```ts
expect(payload.messages[1]?.content).toContain("当前命盘状态：未设置。");
expect(payload.messages[1]?.content).toContain("请自然、直接地回应用户当前消息");
```

- [ ] **Step 2: Run the tests and verify the new assertion fails for the right reason**

Run:

```powershell
npm test -- tests/app/chat-route.test.ts -t "general conversation"
```

Expected: FAIL because the current conversation prompt contains neither `当前命盘状态：已设置。` nor `当前命盘状态：未设置。`.

- [ ] **Step 3: Implement the minimal state contract**

Add an optional analyst input field whose default preserves existing direct callers:

```ts
export type LlmAnalystInput = {
  // existing fields
  hasChart?: boolean;
};
```

Pass it into both initial and revision conversation prompts and render the status explicitly:

```ts
const chartStatus = hasChart ? "已设置" : "未设置";

return [
  `当前命盘状态：${chartStatus}。`,
  "当前不是命盘分析。请自然、直接地回应用户当前消息，并延续已有对话。",
  // existing behavioral constraints
].join("\n");
```

In the route, derive `hasChart` from successful request chart creation or restoration and include it in the conversation `analysisContext`. Replace the birth-data general-chat fallback with:

```ts
const generalChatFallback = "我在。你想聊什么？";
```

Do not change the existing `route.requiresChart` missing-chart response.

- [ ] **Step 4: Run targeted tests and verify green**

Run:

```powershell
npm test -- tests/app/chat-route.test.ts
```

Expected: all chat route tests pass with no birth-data request in the configured-model general-chat path.

- [ ] **Step 5: Run project verification**

Run:

```powershell
npm run typecheck
npm run lint
npm test
```

Expected: all commands exit with code 0. If unrelated pre-existing failures occur, record their exact command and output without changing unrelated files.

- [ ] **Step 6: Review the final diff**

Run:

```powershell
git diff --check -- src/app/api/chat/route.ts src/lib/agent/llm-analyst.ts tests/app/chat-route.test.ts docs/superpowers/specs/2026-07-11-general-chat-chart-status-design.md docs/superpowers/plans/2026-07-11-general-chat-chart-status.md
```

Then run:

```powershell
git diff -- src/app/api/chat/route.ts src/lib/agent/llm-analyst.ts tests/app/chat-route.test.ts
```

Expected: no whitespace errors, no unrelated refactor, and the chart-required missing-chart response remains intact.
