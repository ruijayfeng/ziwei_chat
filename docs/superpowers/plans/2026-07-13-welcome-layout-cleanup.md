# Welcome Layout Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the redundant welcome-chart visual and give all six quick-start topics an equal desktop footprint.

**Architecture:** Keep chart visualization ownership in the left sidebar and chart workspace. Make the topic grid a stable two-column mobile / three-column desktop layout without topic-specific span metadata.

**Tech Stack:** React 19, Next.js App Router, Tailwind CSS 4, Vitest.

## Global Constraints

- Do not change chart persistence, chat requests, or agent evidence behavior.
- Preserve the existing two-column layout below the `lg` breakpoint.
- Use no new dependencies.

---

### Task 1: Stabilize quick-topic grid layout

**Files:**

- Create: `src/lib/ui/topic-entry-layout.ts`
- Modify: `src/components/topic-entry.tsx`
- Create: `tests/ui/topic-entry.test.ts`

**Interfaces:**

- Produces: `topicEntryGridClassName`, the shared grid class contract for the topic entry component.

- [x] **Step 1: Write the failing test**

```ts
import { describe, expect, test } from "vitest";
import { topicEntryGridClassName } from "../../src/lib/ui/topic-entry-layout";

describe("topic entry layout", () => {
  test("uses equal two-column and three-column grids without desktop spans", () => {
    expect(topicEntryGridClassName).toBe("grid grid-cols-2 gap-2 lg:grid-cols-3");
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/ui/topic-entry.test.ts`

Expected: FAIL because `topic-entry-layout` does not exist.

- [x] **Step 3: Write minimal implementation**

```ts
export const topicEntryGridClassName = "grid grid-cols-2 gap-2 lg:grid-cols-3";
```

Import the constant in the topic component, use it on the topic grid, and remove each topic's `layout` property and the interpolated span class.

- [x] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/ui/topic-entry.test.ts`

Expected: PASS.

### Task 2: Remove the duplicate welcome chart

**Files:**

- Modify: `src/components/chat-panel.tsx`

**Interfaces:**

- Consumes: Existing `chartVisualModel` and `chartMotionPhase` props for the active chat experience.
- Produces: An empty-state header with greeting and chart-ready explanation only.

- [x] **Step 1: Remove the compact `ChartDisc` import and empty-header render branch**

```tsx
<div className="max-w-xl">
  <h2>...</h2>
  <p>...</p>
  {empty && chartVisualModel ? <p>...</p> : null}
</div>
```

Keep the existing prop contract untouched so the active chat behavior is not affected.

- [x] **Step 2: Run typecheck**

Run: `npm run typecheck`

Expected: PASS with no unused imports or prop errors.

### Task 3: Verify visual behavior

**Files:**

- Verify: `src/components/chat-panel.tsx`
- Verify: `src/components/topic-entry.tsx`

- [x] **Step 1: Run targeted tests**

Run: `npm test -- tests/ui/topic-entry.test.ts tests/ui/chart-visual.test.ts`

Expected: PASS.

- [x] **Step 2: Inspect the local welcome screen**

At a desktop viewport, verify the welcome header has no right-side chart disc and the six quick topics form a 3 by 2 equal-width grid. At a narrow viewport, verify they remain a two-column grid.

- [x] **Step 3: Run repository checks**

Run: `npm run lint && npm run build && git diff --check`

Expected: all commands PASS.
