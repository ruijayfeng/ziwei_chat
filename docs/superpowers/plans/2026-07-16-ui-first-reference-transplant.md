# UI-First Reference Transplant Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current approximate interface with the presentation layer from `ziwei-chat-redesign`, prove visual equivalence first, and produce a concrete backend/function gap list before further integration work.

**Architecture:** The reference repository is the source of truth for JSX, CSS, motion, typography, responsive behavior, and route composition. The first implementation pass copies that presentation layer into `src/` with only path and App Router adjustments required to compile in the main repository; existing backend providers remain available but are not allowed to reshape the UI. Real-data integration is deliberately deferred to a separate plan created from the observed gap inventory after visual acceptance.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 5, Tailwind CSS 4, Motion, Lucide React, Vitest, npm.

## Global Constraints

- `D:\Ziwei\ziwei_chat\ziwei-chat-redesign` is the visual source of truth.
- UI structure, typography, spacing, surfaces, motion, and responsive behavior take priority over current backend completeness.
- Reference static and mock content may remain during this plan.
- Existing API routes, Agent runtime, iztro engine, critic, RAG, persistence, and anonymous profile code must not be deleted.
- Backend incompatibilities are recorded in `docs/development/ui-backend-gap-list.md`; they are not solved by simplifying the transplanted UI.
- Do not commit `ziwei-chat-redesign/` or generated `node_modules` inside it.
- Use npm for the main repository.
- End every task with a focused commit.

---

## File Structure

### Reference-owned presentation files

- `src/components/app-layout.tsx`: exact workspace frame and inspector behavior.
- `src/components/sidebar.tsx`: exact desktop navigation and reference sidebar cards.
- `src/components/mobile-chrome.tsx`: exact mobile top and bottom chrome.
- `src/components/nav-items.ts`: reference route definitions.
- `src/components/gradient-background.tsx`: reference background field.
- `src/components/glass-card.tsx`: reference surface wrapper.
- `src/components/hero-header.tsx`: reference home editorial header.
- `src/components/destiny-ring.tsx`: reference home destiny ring.
- `src/components/chat-composer.tsx`: reference composer presentation.
- `src/components/inspector-context.tsx`: reference inspector toggle contract.
- `src/components/inspector-panel.tsx`: reference default inspector presentation.
- `src/components/motion-provider.tsx`: reference reduced-motion boundary.
- `src/components/brand/logotype.tsx`: reference wordmark.
- `src/components/chat/*`: reference chat state and presentation.
- `src/components/chart/*`: reference chart state, radial renderer, hero, and palace inspector.
- `src/components/workspace/*`: reference records and insights presentation.
- `src/lib/chart-data.ts`: temporary reference chart view model.
- `src/lib/workspace-data.ts`: temporary reference records and insights content.

### Main-project boundaries retained during visual transplant

- `src/app/api/**`: unchanged backend endpoints.
- `src/lib/agent/**`, `src/lib/chart/**`, `src/lib/db/**`, `src/lib/knowledge/**`: unchanged runtime capabilities.
- `src/components/workspace/workspace-provider.tsx`: retained but removed from responsibility for visual composition.
- `src/components/model-settings-panel.tsx`: retained for the later adapter pass.

### Temporary superseded presentation files

The following remain until visual acceptance, then are listed for cleanup rather than deleted opportunistically:

- `src/components/workspace/app-layout.tsx`
- `src/components/workspace/sidebar.tsx`
- `src/components/workspace/mobile-chrome.tsx`
- `src/components/chat/home-chart-ring.tsx`
- Current simplified chart/chat/records/insights files replaced by reference equivalents

---

### Task 1: Install the reference visual foundation

**Files:**
- Modify: `src/app/globals.css`
- Modify: `src/app/layout.tsx`
- Create: `src/components/gradient-background.tsx`
- Create: `src/components/glass-card.tsx`
- Create: `src/components/inspector-context.tsx`
- Create: `src/components/motion-provider.tsx`
- Create: `src/components/brand/logotype.tsx`
- Test: `tests/ui/reference-visual-contract.test.ts`

**Interfaces:**
- Consumes: reference CSS and presentation components from `ziwei-chat-redesign`.
- Produces: the exact font, color, surface, background, motion, and wordmark primitives used by every later task.

- [ ] **Step 1: Write the failing visual foundation contract**

Create `tests/ui/reference-visual-contract.test.ts`:

```ts
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("reference redesign visual contract", () => {
  test("keeps the reference design tokens and surface system", () => {
    const css = source("src/app/globals.css");
    expect(css).toContain("--font-display: var(--font-fraunces)");
    expect(css).toContain("--background: oklch(0.158 0.03 292)");
    expect(css).toContain(".surface {");
    expect(css).toContain(".surface-well {");
    expect(css).toContain(".ziwei-orbit-slow {");
  });

  test("installs the reference ambient and branding primitives", () => {
    expect(source("src/components/gradient-background.tsx")).toContain("<FloatingStars count={70} />");
    expect(source("src/components/brand/logotype.tsx")).toContain("ZiweiLogotype");
    expect(source("src/components/motion-provider.tsx")).toContain("MotionConfig");
  });
});
```

- [ ] **Step 2: Run the contract and verify it fails**

Run:

```powershell
npx vitest run tests/ui/reference-visual-contract.test.ts
```

Expected: FAIL because the current CSS lacks the reference tokens and the reference components do not exist at the target paths.

- [ ] **Step 3: Copy the exact reference foundation files**

Run these mechanical copy operations:

```powershell
Copy-Item -LiteralPath ziwei-chat-redesign/app/globals.css -Destination src/app/globals.css -Force
Copy-Item -LiteralPath ziwei-chat-redesign/components/gradient-background.tsx -Destination src/components/gradient-background.tsx -Force
Copy-Item -LiteralPath ziwei-chat-redesign/components/glass-card.tsx -Destination src/components/glass-card.tsx -Force
Copy-Item -LiteralPath ziwei-chat-redesign/components/inspector-context.tsx -Destination src/components/inspector-context.tsx -Force
Copy-Item -LiteralPath ziwei-chat-redesign/components/motion-provider.tsx -Destination src/components/motion-provider.tsx -Force
Copy-Item -LiteralPath ziwei-chat-redesign/components/brand/logotype.tsx -Destination src/components/brand/logotype.tsx -Force
```

- [ ] **Step 4: Replace the root layout with the reference font setup**

Use the reference `app/layout.tsx` as the base. Remove only the `@vercel/analytics` import and `<Analytics />` because that package is not part of the main project. Keep Geist, Geist Mono, Noto Sans SC, Noto Serif SC, Fraunces, LXGW WenKai links, viewport, and `<MotionProvider>` unchanged.

The resulting body must remain:

```tsx
<body className="antialiased">
  <MotionProvider>{children}</MotionProvider>
</body>
```

- [ ] **Step 5: Run the focused test and compile gate**

Run:

```powershell
npx vitest run tests/ui/reference-visual-contract.test.ts
npm run typecheck
```

Expected: the focused test passes and TypeScript reports no errors.

- [ ] **Step 6: Commit the foundation**

```powershell
git add src/app/globals.css src/app/layout.tsx src/components/gradient-background.tsx src/components/glass-card.tsx src/components/inspector-context.tsx src/components/motion-provider.tsx src/components/brand/logotype.tsx tests/ui/reference-visual-contract.test.ts
git commit -m "feat(ui): transplant reference visual foundation"
```

---

### Task 2: Transplant the exact application shell

**Files:**
- Create: `src/components/app-layout.tsx`
- Create: `src/components/sidebar.tsx`
- Create: `src/components/mobile-chrome.tsx`
- Create: `src/components/nav-items.ts`
- Modify: `src/app/(workspace)/layout.tsx`
- Modify: `tests/ui/redesign-navigation.test.ts`
- Modify: `tests/ui/workspace-scroll.test.ts`

**Interfaces:**
- Consumes: `GradientBackground`, `InspectorToggleContext`, `MotionProvider`, reference navigation.
- Produces: `AppLayout` with `inspector`, `fill`, `center`, and `collapsibleInspector` props matching the reference API.

- [ ] **Step 1: Replace navigation and scrolling tests with the reference shell contract**

Update `tests/ui/redesign-navigation.test.ts` to import `NAV_ITEMS` from `src/components/nav-items.ts` and assert the route order:

```ts
expect(NAV_ITEMS.map(({ label, href }) => ({ label, href }))).toEqual([
  { label: "对话", href: "/" },
  { label: "命盘", href: "/chart" },
  { label: "记录", href: "/records" },
  { label: "洞见", href: "/insights" },
  { label: "设置", href: "/settings" },
]);
```

Update `tests/ui/workspace-scroll.test.ts` so it reads `src/components/app-layout.tsx` and asserts:

```ts
expect(layoutSource).toContain("relative h-screen overflow-hidden");
expect(layoutSource).toContain("mx-auto flex h-full max-w-[1600px]");
expect(layoutSource).toContain("overflow-y-auto px-4 py-5");
expect(layoutSource).toContain("<GradientBackground />");
```

- [ ] **Step 2: Run the shell contracts and verify they fail**

```powershell
npx vitest run tests/ui/redesign-navigation.test.ts tests/ui/workspace-scroll.test.ts
```

Expected: FAIL because the target root-level shell files are not installed.

- [ ] **Step 3: Copy the reference shell files exactly**

```powershell
Copy-Item ziwei-chat-redesign/components/app-layout.tsx src/components/app-layout.tsx -Force
Copy-Item ziwei-chat-redesign/components/sidebar.tsx src/components/sidebar.tsx -Force
Copy-Item ziwei-chat-redesign/components/mobile-chrome.tsx src/components/mobile-chrome.tsx -Force
Copy-Item ziwei-chat-redesign/components/nav-items.ts src/components/nav-items.ts -Force
```

- [ ] **Step 4: Apply the one required route-path correction**

The reference settings navigation item is a dead `#` link. Change only that href while keeping the reference item order, label, icon, and navigation presentation:

```ts
{ id: "settings", label: "设置", icon: Settings, href: "/settings" }
```

- [ ] **Step 5: Keep provider ownership out of the visual shell**

Change `src/app/(workspace)/layout.tsx` to only provide shared application state:

```tsx
import { WorkspaceProvider } from "@/components/workspace/workspace-provider";

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  return <WorkspaceProvider>{children}</WorkspaceProvider>;
}
```

Do not wrap routes with the old `WorkspaceAppLayout`; each reference route composes `AppLayout` itself.

- [ ] **Step 6: Run focused tests and typecheck**

```powershell
npx vitest run tests/ui/redesign-navigation.test.ts tests/ui/workspace-scroll.test.ts
npm run typecheck
```

Expected: all focused tests pass and TypeScript succeeds.

- [ ] **Step 7: Commit the shell**

```powershell
git add src/components/app-layout.tsx src/components/sidebar.tsx src/components/mobile-chrome.tsx src/components/nav-items.ts 'src/app/(workspace)/layout.tsx' tests/ui/redesign-navigation.test.ts tests/ui/workspace-scroll.test.ts
git commit -m "feat(ui): transplant reference application shell"
```

---

### Task 3: Transplant the home and chat presentation before transport integration

**Files:**
- Create: `src/components/hero-header.tsx`
- Create: `src/components/destiny-ring.tsx`
- Create: `src/components/chat-composer.tsx`
- Replace: `src/components/chat/chat-experience.tsx`
- Replace: `src/components/chat/chat-inspector.tsx`
- Replace: `src/components/chat/message-bubble.tsx`
- Create: `src/components/chat/chat-session.tsx`
- Create: `src/components/inspector-panel.tsx`
- Create: `src/lib/workspace-data.ts`
- Modify: `src/app/(workspace)/page.tsx`
- Modify: `tests/ui/redesigned-chat.test.ts`

**Interfaces:**
- Consumes: reference static workspace data and `AppLayout`.
- Produces: reference idle home, fake streaming transition, active conversation layout, thinking indicator, and inspector appearance.

- [ ] **Step 1: Rewrite the chat presentation contract around reference components**

Replace the current source-string assertions in `tests/ui/redesigned-chat.test.ts` with:

```ts
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("reference chat presentation", () => {
  test("uses the reference hero composition", () => {
    const experience = source("src/components/chat/chat-experience.tsx");
    expect(experience).toContain("<HeroHeader />");
    expect(experience).toContain("<DestinyRing />");
    expect(experience).toContain("<ChatComposer variant=\"hero\"");
  });

  test("keeps the reference conversation transition and thinking state", () => {
    const experience = source("src/components/chat/chat-experience.tsx");
    const bubble = source("src/components/chat/message-bubble.tsx");
    expect(experience).toContain("<DestinyRing hideCenter");
    expect(experience).toContain("<ThinkingIndicator />");
    expect(bubble).toContain("ziwei-shimmer");
  });
});
```

- [ ] **Step 2: Run the chat contract and verify it fails**

```powershell
npx vitest run tests/ui/redesigned-chat.test.ts
```

Expected: FAIL because the current home uses `HomeChartRing` and the simplified message renderer.

- [ ] **Step 3: Copy the exact reference home and chat files**

```powershell
Copy-Item ziwei-chat-redesign/components/hero-header.tsx src/components/hero-header.tsx -Force
Copy-Item ziwei-chat-redesign/components/destiny-ring.tsx src/components/destiny-ring.tsx -Force
Copy-Item ziwei-chat-redesign/components/chat-composer.tsx src/components/chat-composer.tsx -Force
Copy-Item ziwei-chat-redesign/components/inspector-panel.tsx src/components/inspector-panel.tsx -Force
Copy-Item ziwei-chat-redesign/components/chat/chat-experience.tsx src/components/chat/chat-experience.tsx -Force
Copy-Item ziwei-chat-redesign/components/chat/chat-inspector.tsx src/components/chat/chat-inspector.tsx -Force
Copy-Item ziwei-chat-redesign/components/chat/chat-session.tsx src/components/chat/chat-session.tsx -Force
Copy-Item ziwei-chat-redesign/components/chat/message-bubble.tsx src/components/chat/message-bubble.tsx -Force
Copy-Item ziwei-chat-redesign/lib/workspace-data.ts src/lib/workspace-data.ts -Force
Copy-Item ziwei-chat-redesign/app/page.tsx 'src/app/(workspace)/page.tsx' -Force
```

- [ ] **Step 4: Compile without reconnecting real chat**

Resolve only import-path or TypeScript-version errors. Do not replace the reference `ChatProvider`, `DEMO_REPLY`, transitions, hero, ring, composer, bubbles, or inspector with the existing real transport during this task.

- [ ] **Step 5: Run focused tests and build**

```powershell
npx vitest run tests/ui/redesigned-chat.test.ts tests/ui/reference-visual-contract.test.ts
npm run typecheck
npm run build
```

Expected: the reference chat tests pass and `/` builds successfully.

- [ ] **Step 6: Perform desktop and mobile visual comparison**

Run the main app and reference app on separate ports. Compare `/` at 390×844, 1024×768, and 1440×900. Record any mismatch in `docs/development/ui-backend-gap-list.md` only if it comes from missing data; fix CSS/structure mismatches immediately in this task.

- [ ] **Step 7: Commit the home and chat presentation**

```powershell
git add src/components/hero-header.tsx src/components/destiny-ring.tsx src/components/chat-composer.tsx src/components/inspector-panel.tsx src/components/chat src/lib/workspace-data.ts 'src/app/(workspace)/page.tsx' tests/ui/redesigned-chat.test.ts
git commit -m "feat(ui): transplant reference chat presentation"
```

---

### Task 4: Transplant the exact chart presentation

**Files:**
- Replace: `src/components/chart/chart-context.tsx`
- Create: `src/components/chart/chart-hero.tsx`
- Replace: `src/components/chart/destiny-chart.tsx`
- Replace: `src/components/chart/palace-inspector.tsx`
- Create: `src/lib/chart-data.ts`
- Modify: `src/app/(workspace)/chart/page.tsx`
- Modify: `tests/ui/chart-display-view.test.ts`

**Interfaces:**
- Consumes: temporary reference `PALACES` model.
- Produces: the exact radial chart, quick location controls, selected-palace state, 三方四正 paths, chart hero, and palace inspector.

- [ ] **Step 1: Add a source contract for the radial chart**

Append to `tests/ui/chart-display-view.test.ts`:

```ts
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

test("keeps the reference radial chart renderer", () => {
  const source = readFileSync(resolve(process.cwd(), "src/components/chart/destiny-chart.tsx"), "utf8");
  expect(source).toContain("三方四正 connections");
  expect(source).toContain("radial-gradient(circle at 50% 42%");
  expect(source).toContain("<motion.path");
  expect(source).toContain("OUTER_RING");
});
```

- [ ] **Step 2: Run the chart test and verify it fails**

```powershell
npx vitest run tests/ui/chart-display-view.test.ts
```

Expected: FAIL because the current renderer is the simplified card ring/grid.

- [ ] **Step 3: Copy the exact chart presentation**

```powershell
Copy-Item ziwei-chat-redesign/components/chart/chart-context.tsx src/components/chart/chart-context.tsx -Force
Copy-Item ziwei-chat-redesign/components/chart/chart-hero.tsx src/components/chart/chart-hero.tsx -Force
Copy-Item ziwei-chat-redesign/components/chart/destiny-chart.tsx src/components/chart/destiny-chart.tsx -Force
Copy-Item ziwei-chat-redesign/components/chart/palace-inspector.tsx src/components/chart/palace-inspector.tsx -Force
Copy-Item ziwei-chat-redesign/lib/chart-data.ts src/lib/chart-data.ts -Force
Copy-Item ziwei-chat-redesign/app/chart/page.tsx 'src/app/(workspace)/chart/page.tsx' -Force
```

- [ ] **Step 4: Compile without inserting iztro data yet**

Fix only path and module errors. Keep the reference `PALACES`, geometry, chart hero, and inspector content intact for the visual comparison.

- [ ] **Step 5: Run chart tests and build**

```powershell
npx vitest run tests/ui/chart-display-view.test.ts tests/ui/reference-visual-contract.test.ts
npm run typecheck
npm run build
```

Expected: the radial renderer contract passes and `/chart` builds.

- [ ] **Step 6: Compare `/chart` visually**

Compare 390×844, 1024×768, 1440×900, and 1536×960 against the reference. The radial chart, editorial hero, quick-locate controls, inspector widths, and selected-palace transitions must match before moving on.

- [ ] **Step 7: Commit the chart presentation**

```powershell
git add src/components/chart src/lib/chart-data.ts 'src/app/(workspace)/chart/page.tsx' tests/ui/chart-display-view.test.ts
git commit -m "feat(ui): transplant reference chart presentation"
```

---

### Task 5: Transplant records and insights presentation

**Files:**
- Create: `src/components/workspace/page-header.tsx`
- Create: `src/components/workspace/life-timeline.tsx`
- Create: `src/components/workspace/pattern-list.tsx`
- Create: `src/components/workspace/weekly-letter.tsx`
- Modify: `src/app/(workspace)/records/page.tsx`
- Modify: `src/app/(workspace)/insights/page.tsx`
- Create: `tests/ui/reference-workspace-pages.test.ts`

**Interfaces:**
- Consumes: `src/lib/workspace-data.ts` and reference `AppLayout`.
- Produces: exact records timeline, insights letter, pattern list, page headings, and decorative ring composition.

- [ ] **Step 1: Write the failing workspace page contract**

Create `tests/ui/reference-workspace-pages.test.ts`:

```ts
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("reference workspace pages", () => {
  test("keeps the reference records composition", () => {
    const page = source("src/app/(workspace)/records/page.tsx");
    expect(page).toContain("你的人生，");
    expect(page).toContain("<LifeTimeline />");
  });

  test("keeps the reference insights composition", () => {
    const page = source("src/app/(workspace)/insights/page.tsx");
    expect(page).toContain("过去的你，");
    expect(page).toContain("<WeeklyLetter />");
    expect(page).toContain("<PatternList />");
  });
});
```

- [ ] **Step 2: Run the test and verify it fails**

```powershell
npx vitest run tests/ui/reference-workspace-pages.test.ts
```

Expected: FAIL because the current pages use simplified truthful-data headings and lack the reference composition.

- [ ] **Step 3: Copy the reference workspace presentation**

```powershell
Copy-Item ziwei-chat-redesign/components/workspace/page-header.tsx src/components/workspace/page-header.tsx -Force
Copy-Item ziwei-chat-redesign/components/workspace/life-timeline.tsx src/components/workspace/life-timeline.tsx -Force
Copy-Item ziwei-chat-redesign/components/workspace/pattern-list.tsx src/components/workspace/pattern-list.tsx -Force
Copy-Item ziwei-chat-redesign/components/workspace/weekly-letter.tsx src/components/workspace/weekly-letter.tsx -Force
Copy-Item ziwei-chat-redesign/app/records/page.tsx 'src/app/(workspace)/records/page.tsx' -Force
Copy-Item ziwei-chat-redesign/app/insights/page.tsx 'src/app/(workspace)/insights/page.tsx' -Force
```

- [ ] **Step 4: Run workspace tests and build**

```powershell
npx vitest run tests/ui/reference-workspace-pages.test.ts
npm run typecheck
npm run build
```

Expected: both route contracts pass and the routes build.

- [ ] **Step 5: Compare records and insights visually**

Compare `/records` and `/insights` at 390×844, 1024×768, and 1440×900. Static reference content is acceptable in this task; visual mismatches are not.

- [ ] **Step 6: Commit the workspace pages**

```powershell
git add src/components/workspace/page-header.tsx src/components/workspace/life-timeline.tsx src/components/workspace/pattern-list.tsx src/components/workspace/weekly-letter.tsx 'src/app/(workspace)/records/page.tsx' 'src/app/(workspace)/insights/page.tsx' tests/ui/reference-workspace-pages.test.ts
git commit -m "feat(ui): transplant reference workspace pages"
```

---

### Task 6: Bring settings into the same reference visual system

**Files:**
- Modify: `src/app/(workspace)/settings/page.tsx`
- Modify: `src/components/model-settings-panel.tsx`
- Create: `tests/ui/reference-settings-page.test.ts`

**Interfaces:**
- Consumes: existing localStorage settings behavior and reference `AppLayout`, `PageHeader`, `surface`, and `surface-well` styles.
- Produces: a settings route that visually belongs to the transplanted application without changing settings persistence.

- [ ] **Step 1: Write the failing settings visual contract**

Create `tests/ui/reference-settings-page.test.ts`:

```ts
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";

describe("reference settings presentation", () => {
  test("uses the reference shell and surface language", () => {
    const page = readFileSync(resolve(process.cwd(), "src/app/(workspace)/settings/page.tsx"), "utf8");
    const panel = readFileSync(resolve(process.cwd(), "src/components/model-settings-panel.tsx"), "utf8");
    expect(page).toContain("<AppLayout");
    expect(page).toContain("<PageHeader");
    expect(panel).toContain("surface");
    expect(panel).toContain("surface-well");
  });
});
```

- [ ] **Step 2: Run the contract and verify it fails**

```powershell
npx vitest run tests/ui/reference-settings-page.test.ts
```

Expected: FAIL because settings still uses the approximate page composition.

- [ ] **Step 3: Recompose settings with reference primitives**

Wrap settings in:

```tsx
<AppLayout inspector={null}>
  <div className="mx-auto w-full max-w-3xl py-8 lg:py-12">
    <PageHeader eyebrow="settings" title={<>连接你的模型服务</>} subtitle="模型配置只保存在当前浏览器，用于连接 OpenAI 兼容服务。" />
    <div className="mt-10">
      <ModelSettingsPanel />
    </div>
  </div>
</AppLayout>
```

Change only panel class names and layout wrappers to use `surface`, `surface-well`, reference border opacity, spacing, and typography. Do not change localStorage keys, API-key handling, validation, or deletion behavior.

- [ ] **Step 4: Run settings tests and build**

```powershell
npx vitest run tests/ui/reference-settings-page.test.ts tests/ui/model-settings.test.ts
npm run typecheck
npm run build
```

Expected: settings visual and persistence contracts pass.

- [ ] **Step 5: Commit settings presentation**

```powershell
git add 'src/app/(workspace)/settings/page.tsx' src/components/model-settings-panel.tsx tests/ui/reference-settings-page.test.ts
git commit -m "feat(ui): align settings with reference design"
```

---

### Task 7: Perform visual acceptance and publish the backend/function gap list

**Files:**
- Create: `docs/development/ui-backend-gap-list.md`
- Modify: `docs/development/project-status.md`
- Modify: `src/components/AGENTS.md`
- Modify: `src/lib/AGENTS.md` only if temporary view-model files alter its member map.

**Interfaces:**
- Consumes: completed reference presentation at all target routes.
- Produces: approved visual baseline plus a prioritized, evidence-based function integration backlog.

- [ ] **Step 1: Run the complete visual matrix**

Start the main app on port 3000 and the reference app on port 3001. Compare these routes:

```text
/
/chart
/records
/insights
```

At these viewport sizes:

```text
390×844
1024×768
1440×900
1536×960
```

For every route, compare shell widths, typography, vertical rhythm, component sizes, inspector width, responsive navigation, motion presence, and overflow behavior. Fix visual mismatches before proceeding; do not put visual defects into the backend gap list.

- [ ] **Step 2: Audit function differences without fixing them**

Create `docs/development/ui-backend-gap-list.md` with this exact structure:

```markdown
# UI / Backend Function Gap List

## P0 — Blocks core use

| Route | UI capability | Current state | Existing backend source | Required adapter | Risk |
| --- | --- | --- | --- | --- | --- |

## P1 — Important integration

| Route | UI capability | Current state | Existing backend source | Required adapter | Risk |
| --- | --- | --- | --- | --- | --- |

## P2 — Later enhancement

| Route | UI capability | Current state | Existing backend source | Required adapter | Risk |
| --- | --- | --- | --- | --- | --- |

## Preserved backend capabilities

- iztro deterministic chart calculation
- `/api/chat` streaming and deterministic fallback
- Agent planner, tools, skill loading, RAG, analyst, critic, and response composition
- Evidence events
- Anonymous profile and browser-local model settings
- Conversation persistence
```

Populate every row from observed behavior. At minimum inspect chart data, chat send/stream/retry/reset, evidence, records, insights, model settings, profile deletion, mobile inspector, loading states, and error states.

- [ ] **Step 3: Update project documentation maps**

Update `src/components/AGENTS.md` to describe the new reference-owned root presentation files and mark the old approximate workspace components as pending cleanup. Update `docs/development/project-status.md` to state that the visual transplant is complete while backend adaptation remains tracked by the gap list.

- [ ] **Step 4: Run the full verification gate**

```powershell
npm run lint
npm run typecheck
npm run test
npm run eval:agent
npm run build
```

Expected:

- lint exits 0; existing warnings inside `.agents` may remain documented.
- typecheck exits 0.
- all Vitest tests pass.
- Agent eval reports 10/10 or the current accepted case count with zero failures.
- production build succeeds for every route.

- [ ] **Step 5: Verify the working tree**

```powershell
git status --short
git diff --check
```

Expected: only intended documentation and source changes are present; `ziwei-chat-redesign/` remains untracked and unstaged.

- [ ] **Step 6: Commit visual acceptance and the gap inventory**

```powershell
git add docs/development/ui-backend-gap-list.md docs/development/project-status.md src/components/AGENTS.md src/lib/AGENTS.md
git commit -m "docs(ui): record backend gaps after visual transplant"
```

---

## Completion Boundary

This plan is complete when the main project visually matches the supplied redesign across the defined routes and viewports, builds successfully, and has a concrete function gap list. It does not claim that real chart, chat, evidence, records, or insights data has been fully reconnected.

The next plan must consume `docs/development/ui-backend-gap-list.md` and reconnect functions in priority order without redesigning the accepted UI.
