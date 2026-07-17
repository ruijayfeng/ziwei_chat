# Final V1+ Task 4 Report

## Scope

- Added `src/lib/ui/active-topics.ts` as the typed, ordered six-topic entry catalog.
- Updated `src/components/chat-composer.tsx` to render `ACTIVE_TOPICS` directly.
- Removed the obsolete, competing `src/lib/workspace-data.ts` catalog.
- Added catalog, router, planner, and composer contract coverage; updated the affected workspace-page test and L2 module map.
- Kept `ziwei-chat-redesign/` unmodified and untracked.

## RED Evidence

Command:

```text
npx vitest run tests/ui/active-topics.test.ts tests/agent/intent-router.test.ts tests/agent/planner.test.ts tests/ui/redesigned-chat.test.ts tests/ui/reference-workspace-pages.test.ts
```

Before implementation, the result was expected failure:

- `tests/ui/active-topics.test.ts`, `tests/agent/intent-router.test.ts`, and `tests/agent/planner.test.ts` could not resolve `src/lib/ui/active-topics`.
- `tests/ui/redesigned-chat.test.ts` failed because `chat-composer.tsx` did not contain `ACTIVE_TOPICS.map` and still used `THEMES.slice(0, 6)`.

## GREEN Evidence

Focused tests after implementation:

```text
5 files passed, 24 tests passed
```

Typecheck:

```text
npm run typecheck
Exit 0
```

Scoped lint:

```text
npx eslint src/components/chat-composer.tsx src/lib/ui/active-topics.ts tests/ui/active-topics.test.ts tests/agent/intent-router.test.ts tests/agent/planner.test.ts tests/ui/redesigned-chat.test.ts tests/ui/reference-workspace-pages.test.ts
Exit 0
```

Full suite, run once:

```text
npm test
66 files passed, 1 skipped; 455 tests passed, 2 skipped
```

Self-review:

- `git diff --check` found no whitespace errors.
- Source scan found no `workspace-data`, `THEMES`, or `GUIDED` production references.
- The active catalog has the approved order and each entry routes to its declared intent, requires a chart, and plans exactly its declared skill.

## Concerns

- `git diff --check` reports existing LF-to-CRLF conversion notices for edited tracked files; it reports no whitespace errors.
- The pre-existing untracked `ziwei-chat-redesign/` directory remains untouched and excluded from this change.

## Review Closure

- Independent review found that routing tests did not enforce the starter-copy safety boundary.
- RED: `npx vitest run tests/ui/active-topics.test.ts` failed 2 of 6 tests because `starterQuestionSafetyIssues` did not exist.
- Added a pure catalog-boundary validator and explicit regression cases for guarantees, irreversible decisions, investment, medical, and legal instructions, exact future dates, and annual or multi-year reports.
- GREEN: the five focused files passed with 26 tests; `npm run typecheck` and scoped ESLint both exited 0.
