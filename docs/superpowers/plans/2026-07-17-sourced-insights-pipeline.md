# Sourced Insights Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the temporary Insights insufficient-history screen with critic-approved weekly letters and pattern observations derived only from bounded, inspectable conversation sources.

**Architecture:** Pure `src/lib/insights/*` modules own contracts, deterministic source aggregation, fingerprints, and critic rules. `POST /api/insights` is the only prose-generation boundary. A client controller assembles profile-scoped sources, owns cache/state, and passes validated reports into reference-styled presentational components.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 5, Vitest 4, Web Crypto/Node crypto, existing OpenAI-compatible provider adapter.

## Global Constraints

- Source limits are exactly 20 conversations, 200 visible user/assistant messages, and 60,000 characters after deterministic newest-first truncation.
- Eligibility requires at least two conversations, three user messages, and two distinct calendar days.
- API keys, raw chart JSON, tool payloads, system/tool messages, and hidden metadata never enter source bundles or cache values.
- Every generated paragraph and pattern has known source ids; a claimed trend requires at least two distinct excerpts.
- Only critic-approved reports render. Provider/validation/critic failures are retryable honest errors.
- Cache keys are scoped by anonymous profile id and source fingerprint. Cached values contain reports only, never source message bodies or API keys.
- The accepted redesign remains the visual source of truth. Pattern rows are non-interactive articles until a sourced detail action exists.

---

### Task 1: Insight Contracts And Deterministic Aggregation

**Files:**
- Create: `src/lib/insights/contracts.ts`
- Create: `src/lib/insights/source.ts`
- Create: `tests/insights/source.test.ts`
- Modify: `src/lib/AGENTS.md`

**Interfaces:**
- Produces `InsightSourceBundle`, `InsightSourceMessage`, `InsightAggregation`, `InsightReport`, `parseInsightSourceBundle`, `aggregateInsightSources`, and `insightEligibility`.
- Source ids use `${conversationId}:${messageId}` and remain stable after truncation.

- [ ] Write failing tests for payload rejection, visible-role filtering, exact limits, eligibility, topic counts, source window, candidate ids, and order-independent stable fingerprints.
- [ ] Run `npm run test -- tests/insights/source.test.ts`; verify RED because modules do not exist.
- [ ] Implement strict unknown-value parsers. Reject the entire envelope or any malformed item; do not silently drop invalid entries.
- [ ] Implement deterministic truncation and aggregation. Fingerprint canonical JSON with sorted conversations/messages and SHA-256; expose an async function usable in browser and Node.
- [ ] Run the focused test and `npm run typecheck`; verify GREEN.
- [ ] Update `src/lib/AGENTS.md` and commit `feat(insights): aggregate sourced conversation history`.

### Task 2: Deterministic Insight Critic

**Files:**
- Create: `src/lib/insights/critic.ts`
- Create: `tests/insights/critic.test.ts`

**Interfaces:**
- Consumes `InsightReportCandidate` plus `InsightAggregation`.
- Produces `critiqueInsightReport(candidate, aggregation): { passed: boolean; issues: string[] }` and `approvedInsightReport(...)`.

- [ ] Write failing table tests for unknown ids, missing provenance, one-source trends, medical/legal/investment/diagnostic certainty, overlong letters, more than three patterns, and a valid report.
- [ ] Run the focused test and verify RED.
- [ ] Implement short allow/deny checks against aggregation candidate ids. Every paragraph/pattern needs provenance; pattern observations need two distinct ids.
- [ ] Sanitize the approved DTO so only the specified `InsightReport` fields remain and `critic` is always `{ passed: true, issues: [] }`.
- [ ] Run focused tests and typecheck; commit `feat(insights): add provenance critic`.

### Task 3: Insights API Generation Boundary

**Files:**
- Create: `src/app/api/insights/route.ts`
- Create: `src/lib/insights/generation.ts`
- Create: `tests/app/insights-route.test.ts`
- Modify: `src/lib/agent/model-provider.ts` only if a small JSON-call helper is required

**Interfaces:**
- `POST /api/insights` accepts `{ sourceBundle, modelSettings }`.
- Returns structured errors `{ code, message, canRetry }` or sanitized `InsightReport`.

- [ ] Write route tests for invalid/oversized/ineligible input, missing model settings, provider failure, invalid JSON, unknown provenance, critic rejection, and success.
- [ ] Verify RED because route does not exist.
- [ ] Build a prompt from aggregation candidate ids/excerpts only. Require JSON with greeting, one-to-three paragraphs, signoff, and up to three patterns.
- [ ] Reuse `normalizeModelSettings` and `generateModelResponse` with bounded tokens/timeouts. Parse JSON strictly, run the critic, and never return provider text before approval.
- [ ] Run focused route/provider tests, typecheck, and lint; commit `feat(insights): generate critic-approved reports`.

### Task 4: Browser Source Loading And Report Cache

**Files:**
- Create: `src/lib/ui/insight-sources.ts`
- Create: `src/lib/ui/insight-cache.ts`
- Create: `tests/ui/insight-sources.test.ts`
- Create: `tests/ui/insight-cache.test.ts`
- Modify: `src/lib/ui/anonymous-data-deletion.ts`
- Modify: `src/components/workspace/workspace-provider.tsx`

**Interfaces:**
- `loadInsightSourceBundle(profileId, currentSession, fetchImpl, signal)` loads at most 20 summaries/details.
- `readInsightCache`, `writeInsightCache`, and `clearInsightCache(profileId)` scope reports by profile/fingerprint.

- [ ] Write failing tests for list/detail abort, source bounds, current-session merge, profile isolation, malformed cache eviction, stale fingerprint, no source bodies/API keys in serialized cache, and deletion cleanup ordering.
- [ ] Verify RED.
- [ ] Implement loaders with bounded parallel detail fetches and AbortSignal propagation. Preserve conversation/message timestamps from sanitized API records.
- [ ] Implement versioned localStorage cache containing report DTOs only. Extend successful anonymous cleanup to remove the old profile cache.
- [ ] Run focused tests, typecheck, and lint; commit `feat(insights): load and cache sourced reports`.

### Task 5: Insights Controller And Reference Presentation

**Files:**
- Create: `src/components/insights/insights-controller.tsx`
- Create: `src/components/insights/weekly-letter.tsx`
- Create: `src/components/insights/pattern-list.tsx`
- Create: `src/components/insights/insight-sources.tsx`
- Modify: `src/components/insights/insights-empty-state.tsx`
- Modify: `src/app/(workspace)/insights/page.tsx`
- Modify: `tests/ui/reference-workspace-pages.test.ts`
- Create: `tests/ui/insight-controller.test.ts`

**Interfaces:**
- Controller states: `loading`, `insufficient`, `ready`, `stale`, `error`.
- Presenters consume only validated `InsightReport` and aggregation source labels.

- [ ] Write failing reducer/controller tests for initial load, eligible generation, cache hit, stale cache, retry, profile switch, aborted stale response, and deletion/profile replacement.
- [ ] Update route source tests to require `InsightsController` and forbid static fixtures.
- [ ] Implement controller fetch/cache lifecycle with `role=status`, `role=alert`, `aria-live`, and retry.
- [ ] Implement the accepted weekly-letter/pattern composition. Pattern rows are `<article>`; each paragraph/pattern exposes source references through a compact disclosure.
- [ ] Verify focused tests, typecheck, lint, and responsive route rendering; commit `feat(insights): render sourced weekly reports`.

### Task 6: Final Integration, Documentation, And Gates

**Files:**
- Modify: `src/components/AGENTS.md`
- Modify: `src/lib/AGENTS.md`
- Modify: `docs/development/project-status.md`
- Modify: `docs/development/ui-backend-gap-list.md`
- Modify: `tests/ui/reference-visual-contract.test.ts`

**Interfaces:**
- No new runtime interface; closes documentation and release evidence.

- [ ] Prove with `rg` that active runtime has no static personalized Insights fixtures or inert controls.
- [ ] Add deletion/cache and unsupported-control regression assertions where not already executable.
- [ ] Run `npm run lint`, `npm run typecheck`, `npm run test`, `npm run eval:agent`, and `npm run build` serially.
- [ ] Run browser acceptance for insufficient, provider-error, ready, sourced disclosure, stale, retry, mobile, and desktop states.
- [ ] Run one real-provider timed Insights generation and recoverable-failure pass without logging keys or source bodies.
- [ ] Update docs with current evidence, request whole-feature review, fix all Critical/Important findings, and commit `docs: close sourced insights release gap`.
