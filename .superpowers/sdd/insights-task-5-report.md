# Insights Task 5 Report

## Scope

Implemented the Insights browser controller and sourced weekly-report presentation on `codex/ui-redesign-prep`.

- Reused `loadInsightSourceBundle`, `aggregateInsightSources`, `insightEligibility`, and the browser cache contract.
- Exported `parseInsightReport` from `src/lib/ui/insight-cache.ts`; API responses now pass the same strict report validation as cache reads.
- Added ready, stale, insufficient, loading, and error presentation with provenance disclosures derived only from the current aggregation.
- Kept the user reference directory read-only and did not import from it.

## RED Evidence

Command:

```text
npx vitest run tests/ui/insight-controller.test.ts tests/ui/insight-cache.test.ts
```

Result: failed as expected before implementation.

- `tests/ui/insight-controller.test.ts` could not import the missing `insights-controller` module.
- `tests/ui/insight-cache.test.ts` failed because `parseInsightReport` was not exported.

This confirmed the tests covered missing controller and strict-parser behavior rather than an unrelated failure.

## GREEN Evidence

Focused verification after implementation:

```text
npx vitest run tests/ui/insight-controller.test.ts tests/ui/insight-cache.test.ts tests/ui/insight-sources.test.ts tests/ui/reference-workspace-pages.test.ts
```

Result: 4 files, 45 tests passed.

Static verification:

```text
npm run typecheck
npx eslint src/components/insights/insights-controller.tsx src/components/insights/weekly-letter.tsx src/components/insights/pattern-list.tsx src/components/insights/insight-sources.tsx src/components/insights/insights-empty-state.tsx 'src/app/(workspace)/insights/page.tsx' src/lib/ui/insight-cache.ts tests/ui/insight-controller.test.ts tests/ui/insight-cache.test.ts tests/ui/reference-workspace-pages.test.ts
```

Result: both passed with no scoped lint warnings.

Full suite:

```text
npm test
```

Result: 64 files passed, 1 skipped; 436 tests passed, 2 skipped.

## Self-review

- Controller state union is limited to `loading`, `insufficient`, `ready`, `stale`, and `error`.
- Exact cache matches never invoke generation; stale matches are visibly marked as stale and only generate after refresh.
- Ineligible current aggregation wins over stale cache.
- Generation POST body contains only aggregation sources and `modelSettingsRequestFromDraft(modelSettings)`.
- API JSON is parsed strictly and the current aggregation fingerprint must match before cache/write/render.
- Errors preserve retry metadata; model-settings failures link to `/settings`; structured insufficient errors render the insufficient state.
- Effects abort source/API requests on dependency changes and unmount. Deletion additionally stops the effect while `dataDeleting` is true; profile replacement prevents stale reducer commits.
- Presenters receive only an approved `InsightReport` and current aggregation. Provenance uses existing title, date, and user excerpt metadata; it does not expose source bodies.
- Pattern rows are semantic `article` elements without button or link actions. Disclosure uses native `details` and `summary`.
- `git diff --check` reported no whitespace errors. `ziwei-chat-redesign/` remains untracked and has no diff.

## Residual Concern

The current UI test environment has no React DOM harness, so controller behavior is covered through exported reducer/cache-resolution transitions plus source-level route contracts. The full TypeScript and Vitest suite passed.
