# Final V1+ Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close every remaining Final V1+ gap and produce current, reproducible evidence that Ziwei Chat is publishable in anonymous open-source mode.

**Architecture:** Keep `WorkspaceProvider` as the browser ownership boundary, pure adapters as validation/view-model boundaries, iztro as the only chart calculator, and server routes as the only generated-prose boundaries. Execute the release as independently reviewable batches: finish sourced Insights, canonicalize active topics, harden content/evaluation, remove migration residue, then run cross-environment acceptance.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 5, Vitest 4, Vercel AI SDK, iztro 2.5, Drizzle/Postgres/pgvector, Tailwind CSS 4, Playwright-compatible browser acceptance.

## Global Constraints

- `docs/superpowers/specs/2026-07-16-final-v1-plus-release-design.md` is the release authority.
- `docs/development/final-v1-plus-gap-register.md` is the gap and closure-evidence authority.
- Preserve the accepted `ziwei-chat-redesign/` visual composition; keep that directory untracked and untouched.
- No login, account, payment, subscription, quota, attachment, music, push, community, comparison, multi-school, or advanced-report implementation.
- Never fabricate chart, calendar, conversation, source, or insight data.
- Never persist or log browser-owned API keys or insight source bodies.
- Use TDD, one focused commit per task, and an independent spec/quality review before the next task.
- Run verification serially where tests share database, process, or localStorage state.

---

## Batch A: Finish Sourced Insights

Detailed executable plan: `docs/superpowers/plans/2026-07-17-sourced-insights-pipeline.md`.
Tasks 1-3 are complete at commits `f764d0d` through `6833a75`; continue at Task 4.

### Task 1: Browser Source Loader And Report Cache

**Files:**
- Create: `src/lib/ui/insight-sources.ts`
- Create: `src/lib/ui/insight-cache.ts`
- Create: `tests/ui/insight-sources.test.ts`
- Create: `tests/ui/insight-cache.test.ts`
- Modify: `src/lib/ui/anonymous-data-deletion.ts`
- Modify: `src/components/workspace/workspace-provider.tsx`
- Modify: `src/lib/AGENTS.md`

**Produces:** bounded source loading with cancellation; versioned
profile/fingerprint report cache; deletion cleanup for the old profile.

- [ ] Add failing tests for 20-conversation loading, current-session merge,
  message visibility, deduplication, malformed payloads, unavailable storage,
  profile isolation, AbortSignal propagation, stale fingerprints, malformed
  cache eviction, and absence of source bodies/API keys from serialized cache.
- [ ] Run `npm run test -- tests/ui/insight-sources.test.ts tests/ui/insight-cache.test.ts tests/ui/anonymous-data-deletion.test.ts`; verify RED for missing modules/contracts.
- [ ] Implement strict parsers and bounded detail loading against the existing
  `/api/conversations` contracts. Merge by stable conversation/message id and
  let malformed remote data fail explicitly.
- [ ] Implement cache read/write/clear with one versioned storage key namespace.
  Extend remote-first anonymous cleanup so cache deletion occurs only after the
  server deletion succeeds.
- [ ] Run focused tests, `npm run typecheck`, and scoped lint; update L2/L3 docs.
- [ ] Request spec and quality review, fix findings, and commit
  `feat(insights): load and cache sourced reports`.

### Task 2: Insights Controller And Reference Presentation

**Files:**
- Create: `src/components/insights/insights-controller.tsx`
- Create: `src/components/insights/weekly-letter.tsx`
- Create: `src/components/insights/pattern-list.tsx`
- Create: `src/components/insights/insight-sources.tsx`
- Create: `tests/ui/insight-controller.test.ts`
- Modify: `src/components/insights/insights-empty-state.tsx`
- Modify: `src/app/(workspace)/insights/page.tsx`
- Modify: `tests/ui/reference-workspace-pages.test.ts`
- Modify: `src/components/AGENTS.md`

**Produces:** `loading | insufficient | ready | stale | error` controller and
validated, provenance-inspectable presenters.

- [ ] Add failing reducer/controller tests for initial loading, ineligible
  aggregation, eligible generation, exact cache hit, stale cache, provider
  error, retry, profile switch, and aborted stale response.
- [ ] Add failing route-source assertions requiring the controller and
  semantic source/pattern presentation while forbidding personalized fixtures.
- [ ] Implement the controller with request ownership and AbortController.
  Recompute aggregation before cache selection and never render an unvalidated
  route/cache payload.
- [ ] Implement weekly letter, non-interactive pattern articles, source window,
  and source disclosures with `role=status`, `role=alert`, and `aria-live` where
  state changes need announcement.
- [ ] Run focused tests, typecheck, lint, and browser checks at 390 and 1440.
- [ ] Request two-stage review, fix findings, and commit
  `feat(insights): render sourced weekly reports`.

### Task 3: Insights Integration Gate

**Files:**
- Modify: `docs/development/ui-backend-gap-list.md`
- Modify: `docs/development/project-status.md`
- Modify: `tests/ui/reference-visual-contract.test.ts`

- [ ] Prove active runtime has no static insight/record fixtures and no inert
  pattern controls with targeted `rg` assertions.
- [ ] Run all insight, conversation, deletion, model-provider, and route tests.
- [ ] Exercise insufficient, ready, source disclosure, stale, error, and retry
  states in the browser at mobile and desktop widths.
- [ ] Run one real-provider Insights success and one forced recoverable failure;
  record timings without credentials or source text.
- [ ] Update status documents, review the complete Insights feature, and commit
  `docs: close sourced insights release gap`.

## Batch B: Canonical Topics And Honest Chart Empty State

### Task 4: Canonical Six-Topic Entry Contract

**Files:**
- Create: `src/lib/ui/active-topics.ts`
- Create: `tests/ui/active-topics.test.ts`
- Modify: `src/components/chat-composer.tsx`
- Modify: `src/lib/workspace-data.ts`
- Modify: `tests/agent/intent-router.test.ts`
- Modify: `tests/agent/planner.test.ts`
- Modify: `tests/ui/redesigned-chat.test.ts`
- Modify: `src/lib/AGENTS.md`

**Produces:** a typed catalog whose ids are exactly `recent_fortune`, `career`,
`relationship`, `wealth`, `personality`, and `chart_explanation`.

- [ ] Write a failing table test asserting exact ids/order, non-empty safe
  starter prompts, unique labels, and matching `intent`/`skillId` values.
- [ ] Write failing integration cases that feed each starter prompt to
  `routeIntent` and `buildAnalysisPlan`, then assert the declared intent and
  skill are selected.
- [ ] Replace `THEMES.slice(0, 6)` with the explicit catalog and remove
  unsupported entries from active runtime metadata. Do not create alias ids.
- [ ] Run focused UI/router/planner tests, typecheck, and lint.
- [ ] Review all six labels/prompts in the browser at 390 and 1440, update docs,
  and commit `fix(chat): align entries with active analysis topics`.

### Task 5: Honest No-Chart Route

**Files:**
- Modify: `src/app/(workspace)/chart/page.tsx`
- Modify: `src/components/chart/chart-hero.tsx`
- Modify: `src/components/chart/destiny-chart.tsx` only if its public contract needs an explicit empty state
- Modify: `tests/ui/reference-chart.test.ts`
- Modify: `tests/ui/reference-visual-contract.test.ts`

**Produces:** stable loading, empty/create, restore-error/retry, and real-chart
states with no active demo chart presented as user data.

- [ ] Add failing route tests that forbid `demo-chart` in the active page and
  assert explicit loading, empty, and restore-error branches.
- [ ] Implement the no-chart state inside the accepted composition with the
  existing `ChartProfileSheet` create action. Keep empty distinct from restore
  failure and retain deterministic dimensions.
- [ ] Run chart adapter, route, workspace-provider, typecheck, and lint gates.
- [ ] Browser-test empty -> create -> edit -> reload -> delete at 390 and 1440.
- [ ] Request review and commit `fix(chart): replace active demo with empty state`.

## Batch C: Agent Content And Evaluation

### Task 6: Executable Six-Skill Contracts

**Files:**
- Modify: `content/skills/career.md`
- Modify: `content/skills/recent-fortune.md`
- Modify: `content/skills/relationship.md`
- Modify: `content/skills/wealth.md`
- Modify: `content/skills/personality.md`
- Modify: `content/skills/chart-explanation.md`
- Modify: `tests/knowledge/skill-loader.test.ts`
- Modify: `content/AGENTS.md`

- [ ] Add a failing table test for every skill's id/topic, required facts,
  required tools, analysis order, conservative conditions, forbidden advice,
  plain-language rule, and exactly-one-follow-up rule.
- [ ] Run `npm run test -- tests/knowledge/skill-loader.test.ts`; verify RED for
  every genuinely missing section/contract.
- [ ] Make the smallest content edits needed to satisfy the contract. Preserve
  uncertainty, reversible advice, and high-stakes boundaries.
- [ ] Run skill, planner, composer, and critic tests plus typecheck.
- [ ] Have domain/safety review inspect all six workflows and commit
  `feat(content): harden active analysis workflows`.

### Task 7: Tool-Aligned Curated Knowledge

**Files:**
- Modify/Create only reviewed files under: `content/knowledge/`
- Modify: `tests/knowledge/skill-loader.test.ts`
- Modify: `tests/knowledge/search-hybrid.test.ts`
- Modify: `tests/db/knowledge-retrieval.test.ts`
- Modify: `content/AGENTS.md`
- Modify: `docs/development/agent-content-gaps.md`

- [ ] Define one or more representative keyword queries per active topic and
  write failing tests requiring attributed, topic-correct results in local mode.
- [ ] Add metadata tests for source, license, confidence, school, topic, and
  strong `terms`; imported chunks must not masquerade as curated doctrine.
- [ ] Curate only reviewed star/palace, four-transform/palace, stable-pattern,
  and timing-boundary chunks aligned with current deterministic tools.
- [ ] Run local, hybrid-fallback, and optional Postgres retrieval tests. Record
  explicit skip evidence when pgvector credentials are unavailable.
- [ ] Review source/license and domain claims, update the gap document, and
  commit `feat(knowledge): close active topic retrieval coverage`.

### Task 8: Real-Contract Deterministic Evaluation

**Files:**
- Modify: `src/lib/evaluation/cases.ts`
- Modify: `src/lib/evaluation/run-evals.ts`
- Modify: `tests/evaluation/eval-cases.test.ts`
- Modify: `docs/evaluation/acceptance-criteria.md`
- Modify: `src/lib/AGENTS.md`

- [ ] Add failing tests proving the evaluator derives route, plan, skill,
  retrieval, response, and critic results instead of copying
  `expectedTools` into actual events.
- [ ] Add chart-explanation and canonical entry-prompt cases while retaining
  all safety, missing-chart, invalid-input, and out-of-scope cases.
- [ ] Refactor the runner to call real deterministic modules with injected chart
  fixtures and local retrieval. Report failures by stage and keep provider calls
  outside deterministic CI.
- [ ] Run evaluation unit tests and `npm run eval:agent`; inspect every failure,
  then fix contract/content defects rather than weakening expectations.
- [ ] Record human rubric samples for all six topics and commit
  `test(agent): evaluate real topic pipeline contracts`.

## Batch D: Migration And Documentation Closure

### Task 9: Remove Proven Dead Migration Components

**Files:**
- Delete only files proven unused by the import/reference inventory
- Modify: `src/components/AGENTS.md`
- Modify: `src/lib/AGENTS.md` if adapters change
- Modify: affected source-contract tests

- [ ] Produce a runtime import graph plus test/string-reference inventory for
  the temporary old workspace shell, records presenter, chart presenter, and
  other zero-import candidates.
- [ ] Add or update active-route contract tests before deleting candidates.
- [ ] Delete one responsibility group at a time; after each group run focused
  tests and typecheck. Preserve shared forms, adapters, primitives, and public
  compatibility contracts still in use.
- [ ] Run `rg` checks for static personalized fixtures, unsupported controls,
  duplicate active shells, and unresolved imports.
- [ ] Update L2/L3 documentation, run lint/typecheck/test/build, request review,
  and commit `refactor(ui): remove superseded migration components`.

### Task 10: Documentation And UTF-8 Copy Audit

**Files:**
- Modify: `AGENTS.md`
- Modify: `src/components/AGENTS.md`
- Modify: `src/lib/AGENTS.md`
- Modify: `content/AGENTS.md`
- Modify: `docs/development/project-status.md`
- Modify: `docs/development/ui-backend-gap-list.md`
- Modify: `docs/development/agent-content-gaps.md`
- Modify: active source/content files only where copy or encoding defects exist

- [ ] Compare the final file tree and public contracts with every L1/L2 member
  list and important L3 header; add, remove, or rename entries exactly.
- [ ] Scan tracked text for replacement characters and common mojibake byte
  sequences, then inspect all visible Chinese routes in the browser.
- [ ] Fix user-visible terminology, stale unavailable-state claims, and UTF-8
  defects without rewriting unrelated product voice.
- [ ] Run copy/source tests, lint, typecheck, and `git diff --check`.
- [ ] Review documentation as a fresh handoff and commit
  `docs: align final release map and copy`.

## Batch E: Final Release Gate

### Task 11: Automated And Postgres Gate

**Files:**
- Modify tests or runtime only when the gate exposes a reproducible defect
- Modify: `docs/development/project-status.md`

- [ ] Run serially: `npm run lint`, `npm run typecheck`, `npm run test`,
  `npm run eval:agent`, and `npm run build`; record exact totals and skips.
- [ ] Run Drizzle migration/schema checks and the real two-connection profile
  lifecycle test against the release Postgres database.
- [ ] Run an end-to-end Postgres smoke for chart save/restore/delete,
  conversation persistence/list/detail, eligible Insights source loading, and
  anonymous cascade deletion/tombstone behavior.
- [ ] Classify `npm audit` findings by reachable runtime risk. Do not apply a
  breaking force fix merely to make the count zero.
- [ ] Fix defects with focused RED/GREEN tests, rerun the complete gate, and
  record dated evidence.

### Task 12: Browser And Real-Provider Acceptance

**Files:**
- Modify runtime/tests only for verified defects
- Modify: `docs/development/project-status.md`
- Modify: `docs/development/public-beta-qa.md`

- [ ] Start the production-equivalent app on a free local port and verify all
  active routes at 390, 1024, 1440, and 1536 pixels.
- [ ] In no-database mode verify anonymous profile, chart lifecycle, all six
  topic prompts, evidence, current-session records, insufficient Insights,
  settings/inspector deletion, focus order, announcements, and no dead actions.
- [ ] In Postgres mode verify persisted conversation reload/detail, eligible
  Insights generation/source disclosure/cache/stale state, and full deletion.
- [ ] With real model settings, time chat first token/completion, final critic,
  Insights completion, and a forced recoverable failure. Confirm logs and
  responses contain no API key, raw chart JSON, or insight source body.
- [ ] Capture desktop/mobile screenshots, inspect nonblank rendering, overlap,
  scroll ownership, text fit, contrast, and reduced-motion behavior.
- [ ] Fix defects through focused tests, repeat affected scenarios, request a
  whole-product review, and commit `test(release): record final v1 plus acceptance`.

### Task 13: Final Completion Audit

**Files:**
- Modify: `docs/development/final-v1-plus-gap-register.md`
- Modify: `docs/development/project-status.md`

- [ ] For G1-G10, link current code/tests/browser/database/provider evidence and
  mark closed only when the user-visible behavior is proven.
- [ ] Re-run `git status --short`, `git diff --check`, the complete automated
  gate, and targeted `rg` release assertions. Confirm `ziwei-chat-redesign/`
  remains untracked and unchanged.
- [ ] Request final spec-compliance and code-quality reviews; fix all Critical
  and Important findings and rerun affected gates.
- [ ] Update project status with release date, environment assumptions,
  remaining intentional non-goals, exact verification totals, and residual
  external risks.
- [ ] Commit `docs: close final v1 plus release` only after every required gate
  has current passing evidence.

## Execution Order

Execute Tasks 1-13 in order. Tasks within content Batch C may use separate
workers for independent topic files or knowledge review, but merge and review
them before Task 8 so evaluation sees one coherent contract. Do not begin the
final release gate while any earlier user-visible gap remains open.
