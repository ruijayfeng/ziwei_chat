# Project Status

> Updated: 2026-07-17
> Release target: Final V1+
> Authority: `docs/superpowers/specs/2026-07-16-final-v1-plus-release-design.md`

## Current State

Ziwei Chat is an anonymous, Vercel-first Ziwei Dou Shu workspace on branch
`codex/ui-redesign-prep`. The accepted dark editorial UI is connected to real
chart, Agent, evidence, records, Insights, settings, and deletion services. The
user-supplied `ziwei-chat-redesign/` directory remains untracked, read-only
reference material and is not part of the application build.

Final V1+ implementation Tasks 1-10 are complete. Tasks 11-13 remain mandatory
release gates, so the release is not yet declared complete.

## Implemented Product

- Anonymous browser workspace with one primary chart and no product account.
- Deterministic chart creation, restore, edit, display, timing scopes, and facts
  through iztro; no hand-written chart calculation or demo personalization.
- Six canonical workflows: recent fortune, career, relationship, wealth,
  personality, and chart explanation.
- Real Agent chain: route, plan, deterministic tools, executable skill,
  attributed knowledge retrieval, model composition, critic, and evidence.
- Explicit setup-required and recoverable failure states. The runtime does not
  substitute fabricated analysis when chart or model configuration is absent.
- Real conversation records from Postgres when configured and current browser
  history in stateless mode.
- Sourced Insights with bounded conversation aggregation, strict report shape,
  provenance/safety critic, profile/fingerprint cache, and
  loading/insufficient/ready/stale/error states.
- Remote-first anonymous deletion with Postgres transaction locking and a
  permanent profile tombstone; local chart, chat, evidence, settings, and
  insight cache clear only after server deletion succeeds.
- Browser-local OpenAI-compatible model settings. API keys are request inputs,
  not persisted product data.

## Data And Deployment Modes

Without `DATABASE_URL`, server persistence is intentionally stateless. The
browser retains the current anonymous chart and conversation, local Markdown
keyword retrieval remains available, and Insights honestly reports insufficient
history until eligible sources exist.

With Postgres, Drizzle owns profile, chart, conversation, message, knowledge,
tool-event, evaluation, and deletion-tombstone schemas. pgvector retrieval is an
optional enhanced path and falls back to attributed local knowledge when it is
unavailable or empty.

Vercel is the primary deployment target. Provider generation is buffered until
the final critic accepts it; evidence exposes planner, tool, knowledge,
generation, timing, and critic state without exposing raw chart JSON, source
bodies, or credentials.

## Verified Baseline

The last complete gate before Task 10 passed on 2026-07-17:

- full tests: 70 passed / 2 skipped files; 539 passed / 3 skipped tests
- agent evaluation: 17 cases, 0 failed, 1 explicit setup-required
- typecheck and production build: passed
- migration cleanup focused gate: 7 files / 52 tests passed
- independent Task 8 and Task 9 reviews: Spec PASS / Quality Approved

Task 10 verification on 2026-07-17:

- lint: 0 errors; 135 warnings confined to installed `.agents/skills/impeccable`
- typecheck: passed
- full tests: 70 passed / 2 skipped files; 645 passed / 3 skipped tests
- agent evaluation: 17 cases, 0 failed, 1 explicit setup-required
- production build and `git diff --check`: passed
- strict UTF-8 scan: every tracked non-binary file decoded successfully; all
  active source TS/TSX and runtime knowledge Markdown files are guarded against
  replacement characters and common mojibake; the importer permits only an
  exact allowlist of historical upstream input spellings
- production-browser copy audit at `http://localhost:3107`: `/`, `/chart`,
  `/records`, `/insights`, and `/settings` rendered readable Chinese with the
  correct `紫微知道 · 你的命盘分析助手` title and no replacement or common
  mojibake markers
- focused final gate: 2 files / 228 tests passed; typecheck and
  `git diff --check` passed
- final independent Task 10 re-review: PASS; no Critical or Important findings

These figures are not final release evidence. Task 11 will rerun
lint, typecheck, full tests, evaluation, build, Drizzle, real Postgres lifecycle,
and dependency audit and record fresh totals.

## Open Release Gates

1. Run Task 11 complete automated, database, migration, and security gates.
2. Run Task 12 at 390, 1024, 1440, and 1536 pixels in no-database and Postgres
   modes, plus timed real-provider chat, Insights, and forced-failure scenarios.
3. Close Task 13 only after every G1-G10 item links to current code, test,
   browser, database, and provider evidence.

## Intentional Non-Goals

Accounts, login, payment, subscriptions, quotas, attachments, background music,
push notifications, community, multi-chart comparison, multi-school switching,
advanced annual reports, hosted administration, and dedicated
health/family/children/home workflows are outside Final V1+. They require a new
product specification rather than expansion of this release.

## Residual External Risks

- Real Postgres/pgvector proof requires a configured release database.
- Real-provider timing and failure proof requires valid OpenAI-compatible model
  settings. No such provider credential is currently present in this shell.
- Imported `Renhuai123/ziwei-doushu` chunks are attributed seed material, not
  final doctrine; curated chunks remain the preferred high-confidence layer.
- Dependency advisories must be classified by reachable runtime risk. Breaking
  force fixes are not accepted merely to make an audit count zero.

## Handoff

- Function gaps and closure evidence: `docs/development/final-v1-plus-gap-register.md`
- Completion plan: `docs/superpowers/plans/2026-07-17-final-v1-plus-completion.md`
- Agent/content expansion: `docs/development/agent-content-gaps.md`
- Deployment notes: `docs/development/deployment.md`
- Manual acceptance: `docs/development/public-beta-qa.md`
