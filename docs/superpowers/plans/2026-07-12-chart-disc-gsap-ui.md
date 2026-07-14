# Chart Disc And GSAP UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the placeholder chart visuals with a truthful, reusable chart-disc component and add state-driven GSAP motion without changing chat, evidence, critic, persistence, or safety behavior.

**Architecture:** The server remains the source of truth for deterministic chart facts. The client receives a sanitized chart visual model and evidence facts, then renders compact/full chart-disc variants. GSAP runs only in client components through `useGSAP`, scoped refs, timelines, Flip for layout changes, and reduced-motion media conditions.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS v4, iztro, GSAP, `@gsap/react`, Vitest.

## Global Constraints

- Preserve critic-gated model output; no unreviewed model tokens may become user-visible.
- Chart facts must come from deterministic tools/iztro; RAG terminology cannot become personal chart data.
- Do not expose API keys, database URLs, or raw provider payloads.
- Prefer transforms, opacity, SVG stroke, and GSAP timelines; do not animate layout properties.
- All GSAP code must be client-only, scoped, cleaned up, and reduced-motion aware.
- Keep the current anonymous profile, chat stream, evidence events, deletion flow, and mobile navigation contracts backward compatible.

---

### Task 1: Install runtime dependencies and define the visual model

**Files:**
- Modify: `package.json`, `package-lock.json`
- Create: `src/lib/ui/chart-visual.ts`
- Test: `tests/ui/chart-visual.test.ts`

- [ ] Write tests for the twelve-palace order, compact/full model normalization, and evidence-based active palace selection.
- [ ] Run `npm test -- tests/ui/chart-visual.test.ts` and confirm the new module is missing.
- [ ] Install `gsap` and `@gsap/react` with npm.
- [ ] Implement pure visual-model helpers with no React or browser dependency.
- [ ] Run the focused test and typecheck.

### Task 2: Build the truthful SVG chart disc

**Files:**
- Create: `src/components/chart-disc.tsx`
- Modify: `src/components/app-sidebar.tsx`
- Modify: `src/components/chart-workspace.tsx`
- Test: `tests/ui/chart-disc.test.tsx` if the existing Vitest setup supports component rendering; otherwise test exported model helpers and verify with browser DOM assertions.

- [ ] Define the failing contract for compact and full variants, including accessible labels and no-data states.
- [ ] Implement one SVG-based disc with concentric rings, twelve palace labels, optional stars/transforms, active palace styling, and compact/full sizing.
- [ ] Keep labels upright while the ring moves; never present placeholder stars as facts.
- [ ] Replace both existing CSS-only circles and remove the large “future chart” placeholder copy.
- [ ] Run focused tests and typecheck.

### Task 3: Add GSAP lifecycle and state timelines

**Files:**
- Create: `src/components/chart-disc-motion.ts`
- Modify: `src/components/chart-disc.tsx`
- Modify: `src/app/globals.css`

- [ ] Write a failing test for phase-to-timeline configuration: empty, calculating, ready, analyzing, critic, complete, failed.
- [ ] Implement `useGSAP` with a scoped ref and timeline labels `calculate`, `place`, `analyze`, `critic`, `settle`.
- [ ] Use `gsap.matchMedia()` for desktop/mobile and `prefers-reduced-motion`; revert on updates/unmount.
- [ ] Use only transform, opacity, SVG stroke, and autoAlpha properties; stop continuous motion after the phase settles.
- [ ] Run focused tests and typecheck.

### Task 4: Connect chart and evidence state

**Files:**
- Modify: `src/components/ziwei-chat-shell.tsx`
- Modify: `src/lib/ui/chat-evidence.ts`
- Modify: `src/lib/ui/chat-request.ts` only if the visual model needs request continuity.
- Test: `tests/ui/chat-evidence.test.ts`, `tests/ui/chat-request.test.ts`

- [ ] Add a failing regression for active palace selection from returned chart facts without changing the existing evidence payload contract.
- [ ] Store the sanitized chart summary after chart creation and merge evidence fact IDs into the visual model.
- [ ] Map runtime phases to chart-disc motion phases while preserving existing event ordering and retry behavior.
- [ ] Verify missing chart, provider failure, critic rejection, and deterministic-local mode leave the disc truthful.
- [ ] Run focused tests.

### Task 5: Refine workspace hierarchy and right rail

**Files:**
- Modify: `src/components/evidence-drawer.tsx`
- Modify: `src/components/chat-panel.tsx`
- Modify: `src/components/topic-entry.tsx`
- Modify: `src/app/globals.css`
- Test: existing UI tests plus browser DOM checks at 390px, 1317px, and 1536px.

- [ ] Reduce repeated bordered-card treatment in the evidence rail.
- [ ] Add a controlled evidence accordion using Flip only for open/closed layout changes.
- [ ] Rebalance chat empty-state spacing and topic hierarchy without adding fake data.
- [ ] Preserve keyboard focus, visible labels, and mobile sheet behavior.
- [ ] Run lint, typecheck, tests, evals, build, and browser smoke checks.

### Task 6: Final verification and handoff

- [ ] Run `npm run lint`.
- [ ] Run `npm run typecheck`.
- [ ] Run `npm run test`.
- [ ] Run `npm run eval:agent`.
- [ ] Run `npm run build`.
- [ ] Verify local HTTP 200 and browser flows: create chart, chat question, evidence completion, retryable provider failure, settings, deletion confirmation, and mobile navigation.
- [ ] Check `git diff --check` and report any pre-existing dirty files separately.
