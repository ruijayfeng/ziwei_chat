# Insights Task 5 Report

## Scope

Hardened the existing Insights browser controller and sourced weekly-report presentation on `codex/ui-redesign-prep`.

- Extracted the React effect's I/O path into injectable `runInsightLifecycle`; it owns source loading, aggregation, cache resolution, exact provider request, strict response validation, best-effort cache writing, and stale-request suppression.
- Replaced revision-wide refresh behavior with fingerprint-scoped refresh authorization. A refresh authorizes only the aggregation fingerprint that rendered stale; a later fingerprint is stale again.
- Built the browser-session input from completed visible messages only and paused/aborted report loading while `chatSession.activeRequestId` is active.
- Kept source timestamps honest: browser-only source records show an explicit unpersisted-session label and never emit a fabricated `time` element.
- Restored the accepted 40px pattern icon treatment with topic-mapped Lucide icons while retaining semantic non-actionable `article` rows.
- Kept the user reference directory read-only and did not import from it.

## RED Evidence

Command:

```text
npx vitest run tests/ui/insight-controller.test.ts
```

Result: 11 of 12 tests failed as expected before implementation.

- The newly specified `runInsightLifecycle` and `currentInsightSessionSnapshot` exports were absent, yielding `TypeError: ... is not a function`.
- The failures covered source loading, cache selection, exact POST construction, strict response handling, cache writes, AbortSignal propagation, refresh scoping, and stable current-session snapshots.

This confirmed the new tests exercised the missing asynchronous lifecycle boundary rather than reducer-only transitions.

## GREEN Evidence

Focused verification after implementation:

```text
npx vitest run tests/ui/insight-controller.test.ts tests/ui/insight-cache.test.ts tests/ui/insight-sources.test.ts tests/ui/reference-workspace-pages.test.ts
```

Result: 4 files, 48 tests passed.

Static verification:

```text
npm run typecheck
npx eslint src/components/insights/insights-controller.tsx src/components/insights/weekly-letter.tsx src/components/insights/pattern-list.tsx src/components/insights/insight-sources.tsx src/components/insights/insights-empty-state.tsx 'src/app/(workspace)/insights/page.tsx' src/lib/ui/insight-cache.ts src/lib/ui/insight-sources.ts tests/ui/insight-controller.test.ts tests/ui/insight-cache.test.ts tests/ui/insight-sources.test.ts tests/ui/reference-workspace-pages.test.ts
```

Result: both passed with no scoped lint warnings.

Full suite:

```text
npm test
```

Result: 64 files passed, 1 skipped; 439 tests passed, 2 skipped.

## Self-review

- Controller state union is limited to `loading`, `insufficient`, `ready`, `stale`, and `error`.
- Exact cache matches never invoke generation. Stale generation requires explicit authorization for the exact current aggregation fingerprint, so a new fingerprint re-enters stale state.
- Ineligible current aggregation wins over stale cache.
- Generation POST body contains only aggregation sources and `modelSettingsRequestFromDraft(modelSettings)`.
- API JSON is parsed strictly and the current aggregation fingerprint must match before cache/write/render.
- Errors preserve retry metadata; model-settings failures link to `/settings`; structured insufficient errors render the insufficient state.
- `runInsightLifecycle` receives its dependencies and AbortSignal explicitly. The React adapter aborts on retry, profile change, deletion, unmount, and stream start; `isCurrent` prevents stale cache writes and commits.
- The current browser session is derived from completed user/assistant content only. Streaming tokens and evidence do not change the snapshot key; the effect resumes after the request completes.
- Presenters receive only an approved `InsightReport` and current aggregation. Provenance uses existing title, persisted date when present, and user excerpt metadata; it does not expose source bodies or invent dates.
- Pattern rows are semantic `article` elements with 40px topic-mapped Lucide icon surfaces and no button/link action. Disclosure uses native `details` and `summary`.
- Cache writes are explicitly best-effort: a storage exception does not hide an already validated report; invalid/mismatched responses never reach the cache.
- `git diff --check` reported no whitespace errors. `ziwei-chat-redesign/` remains untracked and has no diff.

## Residual Concern

The project intentionally has no React DOM test harness. The coordinator executes the same source/cache/API pipeline used by the effect and is covered through dependency injection; route source contracts cover its JSX wiring.

## Final Review Closure

- Added `reportMatchesAggregation`: exact/stale cache reports and API reports must reference only current aggregation candidates; paragraphs require one known source and patterns require two distinct known sources.
- Invalid provenance cache entries are cleared before returning a retryable integrity error, so retry can generate a fresh report.
- Added `insightPresentationOwned`: deletion, profile replacement, workspace/model-settings bootstrap, and active chat streaming hide prior report state immediately.
- RED: focused controller tests failed for unknown provenance acceptance and missing workspace ownership gate.
- GREEN: focused controller/cache/source/page gate passed 51/51; typecheck, scoped ESLint, and diff check passed.
- Full suite passed 64 files / 1 skipped and 442 tests / 2 skipped.
