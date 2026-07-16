# Reference Chart Backend Adapter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Feed the accepted radial chart UI with the current iztro-backed `ChartDisplayModel`, while preserving an explicitly labelled demo state and restoring chart create/edit access.

**Architecture:** `WorkspaceProvider` remains the owner of chart restore, save, error, and anonymous-profile state. A pure `reference-chart` adapter converts the sanitized backend DTO into the reference `Palace[]` presentation model; reference chart components receive those palaces through their existing context and never fetch or calculate charts themselves. Fields without a backend source render a clear unavailable state instead of keeping mock interpretation.

**Tech Stack:** React 19, Next.js App Router, TypeScript, iztro-backed `/api/chart`, Base UI Sheet, Vitest, Motion.

## Global Constraints

- Keep the supplied radial SVG geometry, rotation, transitions, typography, surfaces, and responsive shell unchanged.
- Do not expose raw iztro chart JSON to the browser.
- Do not derive personality claims, ratings, or AI analysis from star names.
- Use real iztro palace indices for three-way/four-direction relationships.
- Keep `PALACES` only as an explicitly labelled demo fallback when no chart exists.
- Reuse `WorkspaceProvider.chartDisplay`, `chartInput`, `saveChart`, `resetLocalChart`, loading, sync, and error state.
- Add no dependency and change no backend/Agent contract in this phase.
- End each task with focused verification and a small commit.

---

### Task 1: Add the pure reference palace adapter

**Files:**
- Create: `src/lib/ui/reference-chart.ts`
- Create: `tests/ui/reference-chart.test.ts`
- Modify: `src/lib/chart-data.ts`
- Modify: `src/lib/AGENTS.md`

**Interfaces:**
- Consumes: `ChartDisplayModel`, `ChartDisplayPalace`, and `ChartDisplayStar` from `src/lib/domain/chart-display.ts`.
- Produces: `referencePalaces(model: ChartDisplayModel): Palace[]` and `referencePalaceSummary(palace: ChartDisplayPalace): string`.

- [ ] **Step 1: Write failing adapter tests**

Create a twelve-palace fixture whose iztro indices are intentionally not presented with 命宫 first. Assert that the adapter:

```ts
expect(referencePalaces(display)).toHaveLength(12);
expect(referencePalaces(display).map((palace) => palace.sourceIndex)).toEqual(
  Array.from({ length: 12 }, (_, index) => index),
);
expect(referencePalaces(display)[3]).toMatchObject({
  id: "palace-3-卯",
  name: "命宫",
  branch: "卯",
  mainStars: [{ name: "紫微", sihua: "化权", brightness: "庙" }],
  minorStars: ["左辅", "天喜"],
  rating: 5,
  aiTraits: [],
  related: [],
});
expect(referencePalaces(display)[3].summary).toContain("命宫落在卯位");
```

Also assert that an unrecognised brightness yields `rating: null` and an unrecognised mutagen does not become a four-transform badge.

- [ ] **Step 2: Run the test and verify the missing-module failure**

Run:

```powershell
npx vitest run tests/ui/reference-chart.test.ts
```

Expected: fail because `src/lib/ui/reference-chart.ts` does not exist.

- [ ] **Step 3: Extend the presentation contract without inventing analysis**

Change the relevant presentation fields to:

```ts
export type MainStar = {
  name: string
  sihua?: SihuaType
  brightness?: string
}

export type Palace = {
  id: string
  sourceIndex: number
  name: string
  branch: string
  mainStars: MainStar[]
  minorStars: string[]
  keywords: string[]
  rating: number | null
  summary: string
  aiTraits: string[]
  basis: string[]
  related: string[]
}
```

Add `sourceIndex` to the twelve demo palaces using their array index. Keep their existing demo content unchanged because the page labels that fallback explicitly.

- [ ] **Step 4: Implement the pure adapter**

Implement these rules:

```ts
const brightnessScore: Record<string, number> = {
  陷: 1,
  不: 2,
  平: 2,
  利: 2,
  得: 3,
  旺: 4,
  庙: 5,
};

function sihuaFromMutagen(mutagen: string): SihuaType | undefined {
  const value = mutagen.startsWith("化") ? mutagen : `化${mutagen}`;
  return value === "化禄" || value === "化权" || value === "化科" || value === "化忌"
    ? value
    : undefined;
}
```

Sort by `palace.index`; combine and de-duplicate `minorStars` plus `adjectiveStars`; map only recognised four transforms; derive the single visual brightness gauge from the strongest recognised major-star brightness; generate a factual sentence from palace name, earthly branch, major stars, body-palace marker, and Laiyin-palace marker. Set `aiTraits` and `related` to empty arrays. Set `keywords` only to deterministic markers (`身宫`, `来因宫`) and `basis` only to displayed star/transform facts.

- [ ] **Step 5: Run focused tests**

```powershell
npx vitest run tests/ui/reference-chart.test.ts tests/ui/chart-display-view.test.ts tests/chart/chart-display.test.ts
npm run typecheck
```

- [ ] **Step 6: Commit**

```powershell
git add src/lib/ui/reference-chart.ts src/lib/chart-data.ts tests/ui/reference-chart.test.ts src/lib/AGENTS.md
git commit -m "feat(chart): add reference palace adapter"
```

---

### Task 2: Bind the accepted radial chart to WorkspaceProvider

**Files:**
- Modify: `src/components/chart/chart-context.tsx`
- Modify: `src/components/chart/destiny-chart.tsx`
- Modify: `src/components/chart/palace-inspector.tsx`
- Modify: `src/components/chart/chart-hero.tsx`
- Modify: `src/app/(workspace)/chart/page.tsx`
- Modify: `tests/ui/chart-display-view.test.ts`

**Interfaces:**
- Consumes: `referencePalaces(chartDisplay)`, `PALACES`, and `useWorkspace()`.
- Produces: a reference `ChartProvider` value containing `palaces`, `selected`, `hovered`, and their setters.

- [ ] **Step 1: Add failing source and behavior contracts**

Assert that the chart route consumes `useWorkspace()` and `referencePalaces(chartDisplay)`, and that the three reference chart components read `palaces` from `useChart()` rather than importing `PALACES`. Assert that the context initial selection is found by `palace.name === '命宫'`.

- [ ] **Step 2: Verify the tests fail**

```powershell
npx vitest run tests/ui/chart-display-view.test.ts
```

- [ ] **Step 3: Put palace data into the existing reference context**

Use this public shape:

```ts
type ChartContextValue = {
  palaces: Palace[]
  selected: number
  setSelected: (index: number) => void
  hovered: number | null
  setHovered: (index: number | null) => void
}

export function ChartProvider({ palaces, children }: { palaces: Palace[]; children: React.ReactNode })
```

Initial selection must be the real 命宫 index, falling back to zero.

- [ ] **Step 4: Replace module-level static reads with context reads**

In `DestinyChart`, `PalaceInspector`, and `ChartHero`, replace every `PALACES` read with the context `palaces`. Keep `getRelatedIndices`, `SIHUA_TONE`, geometry constants, SVG markup, motion values, class names, and layout unchanged.

- [ ] **Step 5: Bind the chart route**

Make the route a client component. Derive:

```ts
const palaces = chartDisplay ? referencePalaces(chartDisplay) : PALACES;
const chartKey = chartDisplay?.chartId ?? "demo-chart";
```

Pass `palaces` to `ChartProvider` and use `key={chartKey}` so a restored/saved chart resets selection to its real 命宫. Keep the reference composition. Change only the footer status copy: real chart shows the display name and deterministic-source label; fallback says `演示命盘 · 创建命盘后替换为真实排盘`.

- [ ] **Step 6: Render truthful unavailable states in the inspector**

Keep all existing disclosure sections and dimensions. If `rating` is `null`, render `—` instead of `陷`. If `aiTraits`, `keywords`, or `related` are empty, render concise Chinese empty-state copy explaining that deterministic chart facts are available and interpretation must come from an Agent conversation.

- [ ] **Step 7: Run focused verification**

```powershell
npx vitest run tests/ui/reference-chart.test.ts tests/ui/chart-display-view.test.ts tests/ui/chart-session.test.ts tests/app/chart-route.test.ts
npm run typecheck
npm run build
```

- [ ] **Step 8: Commit**

```powershell
git add src/components/chart src/app/(workspace)/chart/page.tsx tests/ui/chart-display-view.test.ts
git commit -m "feat(chart): connect reference UI to real chart"
```

---

### Task 3: Restore chart create and edit access in a reference-style sheet

**Files:**
- Create: `src/components/chart/chart-profile-sheet.tsx`
- Modify: `src/components/chart/chart-hero.tsx`
- Modify: `src/app/(workspace)/chart/page.tsx`
- Modify: `src/components/chart-onboarding.tsx`
- Modify: `tests/ui/chart-display-view.test.ts`
- Modify: `src/components/AGENTS.md`

**Interfaces:**
- Consumes: `WorkspaceProvider` profile/chart/save/reset state and the existing `ChartOnboarding` form.
- Produces: `ChartProfileSheet` with `open`, `onOpenChange`, and no separate storage or network ownership.

- [ ] **Step 1: Add failing integration contracts**

Assert that `ChartHero` exposes a create/edit button, the route renders `ChartProfileSheet`, and the sheet reuses `ChartOnboarding`, `saveChart`, and `resetLocalChart` instead of implementing another form or fetch.

- [ ] **Step 2: Verify the tests fail**

```powershell
npx vitest run tests/ui/chart-display-view.test.ts
```

- [ ] **Step 3: Implement the sheet wrapper**

Use the owned `Sheet` primitives with a right-side desktop panel and full-width mobile limit. Preserve the reference dark indigo surface, restrained border, LXGW WenKai body, and editorial title. Call `saveChart`; close only after it resolves `true`. Surface `chartError` above the form and disable no existing backend behavior.

- [ ] **Step 4: Restyle only the existing onboarding shell**

Remove the old nested Card framing when embedded in the sheet, but preserve all field names, enum values, validation, save semantics, reset semantics, and anonymous-profile copy. Do not create a second form component.

- [ ] **Step 5: Run focused verification**

```powershell
npx vitest run tests/ui/chart-profile.test.ts tests/ui/chart-display-view.test.ts tests/ui/chart-session.test.ts tests/app/chart-route.test.ts
npm run typecheck
npm run build
```

- [ ] **Step 6: Commit**

```powershell
git add src/components/chart/chart-profile-sheet.tsx src/components/chart/chart-hero.tsx src/components/chart-onboarding.tsx src/app/(workspace)/chart/page.tsx tests/ui/chart-display-view.test.ts src/components/AGENTS.md
git commit -m "feat(chart): restore chart profile controls"
```

---

### Task 4: Verify live restore/save behavior and close the chart gaps

**Files:**
- Modify: `docs/development/ui-backend-gap-list.md`
- Modify: `docs/development/project-status.md`
- Modify: `src/lib/AGENTS.md`
- Modify: `src/components/AGENTS.md`

**Interfaces:**
- Consumes: completed reference chart adapter and profile sheet.
- Produces: verified `/chart` integration status and the remaining records/sidebar/insights backlog.

- [ ] **Step 1: Run the full gate**

```powershell
npm run lint
npm run typecheck
npm run test
npm run eval:agent
npm run build
```

- [ ] **Step 2: Run browser QA**

- Load `/chart` with no saved chart and confirm the full reference chart remains visible with an explicit demo label.
- Create a chart through the sheet and confirm palace names, branches, stars, four transforms, body/Laiyin markers, and display name come from `/api/chart`.
- Reload and confirm the same chart restores from browser/server state.
- Confirm a palace click rotates the same reference wheel and highlights real-index trines/opposition.
- Check 390px, 1024px, and 1440px for no horizontal overflow and no console errors.
- Do not inspect or print localStorage model API-key values.

- [ ] **Step 3: Update documentation**

Move current-chart display, create/edit, and anonymous restore into `Connected Today`. Keep sidebar chart summary, records, and insights open. Record that unsupported interpretation fields show sourced empty states instead of demo claims.

- [ ] **Step 4: Commit**

```powershell
git add docs/development/ui-backend-gap-list.md docs/development/project-status.md src/lib/AGENTS.md src/components/AGENTS.md
git commit -m "docs(chart): close reference chart integration gaps"
```
