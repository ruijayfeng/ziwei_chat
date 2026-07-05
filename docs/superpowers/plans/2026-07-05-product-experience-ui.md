# Product Experience UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade Ziwei Chat's MVP shell into the Evidence Companion product UI with readable Chinese copy, chart/profile management, chat error states, evidence hierarchy, and responsive product polish.

**Architecture:** Keep the existing Next.js App Router and client shell. Add a tiny UI utility layer for testable labels/error mapping, install only focused primitives for icons and accessible dialogs, and refine existing components rather than introducing a large design system. Preserve anonymous profile behavior and the current `/api/chat` contract.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS v4, Vitest, `lucide-react`, `@radix-ui/react-dialog`, existing Vercel AI SDK route.

## Global Constraints

- Primary direction is Evidence Companion: calm, precise, companion-like, evidence-backed, contemporary Chinese.
- App background `#F7F7F4`, primary ink `#181816`, muted ink `#5F5F58`, border `#D8D8D0`, surface `#FFFFFF`, accent `#0F766E`, warning `#A33A2B`.
- Product UI opens directly into the usable app, not a landing page.
- Do not add GSAP, Motion, or timeline-heavy animation in this MVP shell.
- Do not add authentication, multiple charts, persistent conversation browser, database/Neon changes, or report pages.
- Clearing anonymous profile data must require explicit confirmation.
- Required verification: `npm run lint`, `npm run typecheck`, `npm run test`, `npm run eval:agent`, `npm run build`, plus desktop and mobile browser checks.

---

## File Structure

- Modify `package.json` and `package-lock.json`: add `lucide-react` and `@radix-ui/react-dialog`.
- Modify `src/app/globals.css`: add design tokens, product theme utilities, focus styles, and responsive base styling.
- Modify `src/app/layout.tsx`: load `Noto_Sans_SC` through `next/font/google` alongside existing Geist fonts.
- Create `src/lib/ui/chat-errors.ts`: map fetch/network/rate-limit/empty-response failures to user-facing Chinese messages.
- Create `src/lib/ui/chart-profile.ts`: format chart profile labels, sync labels, and calendar/gender copy.
- Create `tests/ui/chat-errors.test.ts`: TDD coverage for chat error classification.
- Create `tests/ui/chart-profile.test.ts`: TDD coverage for chart profile labels and sync state.
- Modify `src/components/chart-onboarding.tsx`: become the current chart/profile management panel with summary, edit form, reset action, and polished copy.
- Modify `src/components/chat-panel.tsx`: add error, loading, retry, mobile evidence trigger slot, polished empty state, and accessible controls.
- Modify `src/components/evidence-drawer.tsx`: upgrade evidence sections, empty states, status styling, and optional compact/mobile rendering.
- Modify `src/components/topic-entry.tsx`: repair copy, add icons, and tighten quick-action styling.
- Modify `src/components/ziwei-chat-shell.tsx`: coordinate error handling, retry, clear-data confirmation dialog, mobile evidence dialog, chart reset, and responsive layout.
- Modify `src/components/AGENTS.md`: update component responsibilities if they change.
- Modify `AGENTS.md`: include `PRODUCT.md` in the top-level config map.
- Create `PRODUCT.md`: product register and design principles for the design tooling context.

## Task 1: Add Product Context And UI Dependencies

**Files:**
- Create: `PRODUCT.md`
- Modify: `AGENTS.md`
- Modify: `package.json`
- Modify: `package-lock.json`

**Interfaces:**
- Produces: root `PRODUCT.md` with `## Register` set to `product`.
- Produces dependencies importable as `@radix-ui/react-dialog` and `lucide-react`.

- [ ] **Step 1: Verify current git state**

Run: `git status --short --branch`
Expected: current branch is `codex/ci-ops-hardening`; only intentional doc changes may be present.

- [ ] **Step 2: Add product context**

Create `PRODUCT.md` with product register, users, purpose, brand personality, anti-references, design principles, and accessibility. Update `AGENTS.md` config map with `PRODUCT.md`.

- [ ] **Step 3: Install focused UI dependencies**

Run: `npm install lucide-react @radix-ui/react-dialog`
Expected: dependencies added to `package.json` and `package-lock.json`.

- [ ] **Step 4: Verify dependency install**

Run: `npm run typecheck`
Expected: TypeScript passes before UI code imports new packages.

## Task 2: Add Testable UI Text Helpers

**Files:**
- Create: `src/lib/ui/chat-errors.ts`
- Create: `src/lib/ui/chart-profile.ts`
- Create: `tests/ui/chat-errors.test.ts`
- Create: `tests/ui/chart-profile.test.ts`

**Interfaces:**
- Produces `classifyChatError(error: unknown): ChatErrorState`.
- Produces `chatErrorFromResponse(response: Response): ChatErrorState | null`.
- Produces `isEmptyAssistantResponse(content: string): boolean`.
- Produces `formatChartProfile(chart: CreateChartInput | null): ChartProfileView`.
- Produces `getChartSyncLabel(isSynced: boolean, hasChart: boolean): string`.

- [ ] **Step 1: Write failing chat error tests**

Add `tests/ui/chat-errors.test.ts` with assertions for network failure, 429, 500, and empty assistant response.

- [ ] **Step 2: Run chat error tests and verify RED**

Run: `npx vitest tests/ui/chat-errors.test.ts`
Expected: FAIL because `src/lib/ui/chat-errors.ts` does not exist.

- [ ] **Step 3: Implement chat error helper**

Create `src/lib/ui/chat-errors.ts` with the exported functions and Chinese messages:
`网络连接失败，请稍后重试。`, `请求太频繁了，请稍等一下再继续。`, `分析没有完成，请重试。`, `这次没有生成可读回复，请重新发送。`

- [ ] **Step 4: Run chat error tests and verify GREEN**

Run: `npx vitest tests/ui/chat-errors.test.ts`
Expected: PASS.

- [ ] **Step 5: Write failing chart profile tests**

Add `tests/ui/chart-profile.test.ts` with assertions for null chart copy, male/female labels, solar/lunar labels, optional birthplace, and synced/unsynced labels.

- [ ] **Step 6: Run chart profile tests and verify RED**

Run: `npx vitest tests/ui/chart-profile.test.ts`
Expected: FAIL because `src/lib/ui/chart-profile.ts` does not exist.

- [ ] **Step 7: Implement chart profile helper**

Create `src/lib/ui/chart-profile.ts` using `CreateChartInput` and returning stable labels for component rendering.

- [ ] **Step 8: Run UI helper tests and verify GREEN**

Run: `npx vitest tests/ui`
Expected: PASS.

## Task 3: Establish Visual System

**Files:**
- Modify: `src/app/globals.css`
- Modify: `src/app/layout.tsx`

**Interfaces:**
- Produces Tailwind theme variables for app background, surface, ink, muted ink, border, accent, and warning.
- Produces `--font-noto-sans-sc` variable on `<html>`.

- [ ] **Step 1: Update global CSS tokens**

Edit `src/app/globals.css` to define the Evidence Companion colors, base body styles, form focus defaults, selection color, and reduced-motion behavior.

- [ ] **Step 2: Load Chinese UI font**

Update `src/app/layout.tsx` to import `Noto_Sans_SC`, instantiate it with variable `--font-noto-sans-sc`, and include it on the `<html>` class list.

- [ ] **Step 3: Verify styling changes compile**

Run: `npm run typecheck`
Expected: PASS.

## Task 4: Rebuild Product Components

**Files:**
- Modify: `src/components/chart-onboarding.tsx`
- Modify: `src/components/chat-panel.tsx`
- Modify: `src/components/evidence-drawer.tsx`
- Modify: `src/components/topic-entry.tsx`
- Modify: `src/components/AGENTS.md`

**Interfaces:**
- `ChartOnboarding` accepts `chartInput`, `profileId`, `chartSynced`, `onChartReady`, and `onResetChart`.
- `ChatPanel` accepts `messages`, `draft`, `isStreaming`, `error`, `onRetry`, `onOpenEvidence`, `onDraftChange`, and `onSubmit`.
- `EvidenceDrawer` accepts `evidence` and optional `compact`.
- `TopicEntry` keeps `onSelect(prompt: string)`.

- [ ] **Step 1: Upgrade chart/profile panel**

Repair Chinese copy, show current chart summary, sync status, edit form, save action, and reset draft action. Use helper labels from `src/lib/ui/chart-profile.ts`.

- [ ] **Step 2: Upgrade chat panel**

Repair Chinese copy, add warm empty state, visible "正在分析" state, error banner, retry action, mobile evidence trigger, and polished input controls.

- [ ] **Step 3: Upgrade evidence panel**

Repair Chinese copy, add section icons, empty states, critic status styling, and compact rendering for mobile dialog use.

- [ ] **Step 4: Upgrade topic entry**

Repair Chinese topic labels and prompts, add lucide icons, and keep quick actions compact.

- [ ] **Step 5: Update component map**

Update `src/components/AGENTS.md` responsibilities to match the expanded profile, chat, evidence, and topic components.

- [ ] **Step 6: Verify component compilation**

Run: `npm run typecheck`
Expected: PASS.

## Task 5: Wire Shell Behavior And Responsive Layout

**Files:**
- Modify: `src/components/ziwei-chat-shell.tsx`

**Interfaces:**
- Consumes `chatErrorFromResponse`, `classifyChatError`, and `isEmptyAssistantResponse`.
- Consumes Radix Dialog for clear-data confirmation and mobile evidence.
- Preserves `POST /api/chat` and `DELETE /api/chat?profileId=...` contracts.

- [ ] **Step 1: Add chat error state and retry flow**

Track the last sent message, classify fetch failures, 429 responses, server failures, and empty assistant responses. Allow retry from the chat panel.

- [ ] **Step 2: Add clear-data confirmation**

Wrap destructive clear action in Radix Dialog. The confirm copy must state that it clears anonymous browser profile data, current chart state, messages, and displayed evidence.

- [ ] **Step 3: Add mobile evidence dialog**

Use Radix Dialog with `EvidenceDrawer compact` for mobile access. Keep desktop evidence as a right rail.

- [ ] **Step 4: Apply responsive layout**

Make mobile chat-first, then profile/topics, with desktop returning to left chat right evidence grid. Ensure no horizontal overflow.

- [ ] **Step 5: Verify shell compilation**

Run: `npm run typecheck`
Expected: PASS.

## Task 6: Full Verification, Browser QA, And Review

**Files:**
- No required source edits unless verification finds defects.

**Interfaces:**
- Produces local browser QA evidence for desktop and mobile.

- [ ] **Step 1: Run full automated verification**

Run: `npm run lint`
Expected: PASS.

Run: `npm run typecheck`
Expected: PASS.

Run: `npm run test`
Expected: all tests PASS, including new UI helper tests.

Run: `npm run eval:agent`
Expected: all seed evals PASS.

Run: `npm run build`
Expected: PASS.

- [ ] **Step 2: Run local dev server**

Run: `npm run dev`
Expected: local Next server starts.

- [ ] **Step 3: Browser QA desktop**

Open the local app around `1440px` width. Verify readable Chinese copy, chat dominance, chart summary, evidence rail, clear-data dialog, loading/error states where practical, and no obvious overflow.

- [ ] **Step 4: Browser QA mobile**

Open the local app around `390px` width. Verify chat-first layout, mobile evidence dialog, usable chart controls, and no horizontal scrolling.

- [ ] **Step 5: Adversarial review**

Review changed files for scope creep, broken anonymous profile behavior, missing error paths, inaccessible destructive actions, unnecessary dependencies, and design mismatch with Evidence Companion. Fix any blocking issues.
