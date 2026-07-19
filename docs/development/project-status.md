# Project Status

> Updated: 2026-07-19
> Release target: Final V1+
> Authority: `docs/superpowers/specs/2026-07-16-final-v1-plus-release-design.md`

## Current State

Ziwei Chat is an anonymous, Vercel-first Ziwei Dou Shu workspace on branch
`codex/ui-redesign-prep`. The accepted dark editorial UI is connected to real
chart, Agent, evidence, records, Insights, settings, and deletion services. The
user-supplied `ziwei-chat-redesign/` directory remains untracked, read-only
reference material and is not part of the application build.

Final V1+ implementation and automated release Tasks 1-11 are complete. Tasks
12-13 remain mandatory release gates, so the release is not yet declared
complete.

## Implemented Product

- Anonymous browser workspace with one primary chart and no product account.
- Deterministic chart creation, restore, edit, display, timing scopes, and facts
  through iztro; no hand-written chart calculation or demo personalization.
- Six canonical workflows: recent fortune, career, relationship, wealth,
  personality, and chart explanation.
- Real Agent chain: route, plan, deterministic tools, executable skill,
  attributed knowledge retrieval, model composition, critic, and evidence.
- Response critic separates blocking grounding and safety errors from warning-only
  presentation issues, so ordinary users receive natural chart-grounded answers
  without being blocked by minor format deviations.
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
- Browser-local OpenAI-compatible model settings. API keys persist only in the
  current browser's localStorage so the browser can include them in model
  requests; they are not written to Postgres or another server-side product
  store.

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

Those Task 10 figures are not final release evidence; the fresh Task 11 gate
below supersedes them for automated, migration, database, and dependency proof.

Task 11 verification on 2026-07-18:

- lint: 0 errors; 135 warnings confined to installed `.agents/skills/impeccable`
- typecheck: passed
- default no-database full tests: 70 passed / 3 skipped files; 749 passed / 4
  skipped tests
- agent evaluation: 17 cases, 0 failed, 1 explicit setup-required
- production build: passed
- `drizzle-kit check`: passed
- configured release Postgres, run serially: two-connection profile lifecycle
  2/2 passed; chart/conversation/Insights/deletion lifecycle 1/1 passed;
  pgvector retrieval parity 1/1 passed
- dependency audit: 6 moderate, 0 high, 0 critical. Four findings are confined
  to the development-only drizzle-kit/esbuild chain. The Next-bundled PostCSS
  advisory requires untrusted CSS stringify input, which this product does not
  accept. npm's offered fixes are breaking downgrades, so no force fix was
  applied.

## Task 12 Browser Evidence (2026-07-19)

Production-equivalent build served at `http://localhost:3200` with the
configured release Postgres database. The no-database and Postgres route
matrices covered `/`, `/chart`, `/records`, `/insights`, and `/settings` at
390x844, 1024x768, 1440x900, and 1536x960.

- 40 route/viewport checks completed across both persistence modes.
- Every check had zero horizontal overflow and zero browser console errors.
- `lang="zh-CN"` and the expected Chinese page title were present.
- No-database state proved the honest no-chart, six-topic, records-empty,
  Insights-insufficient, settings, and no-model setup-required states.
- Chart creation through the UI restored real iztro-derived palaces, stars,
  brightness, transformations, and 三方四正 data.
- Postgres mode restored the persisted chart and conversation record; the
  eligible/insufficient Insights branch and anonymous deletion control were
  visible without fabricated content.
- The six topic entries resolved to unique prompts; `事业` populated the
  composer with `我目前的事业方向，适合关注什么？`.
- Accessibility/responsive probe across the same 20 Postgres route/viewport
  combinations found focusable controls on every route, visible focus styling
  on interactive controls, live regions on records/Insights state changes, and
  the global `prefers-reduced-motion` rule. No overflow was observed. A full
  keyboard journey and provider-backed announcement pass remains part of the
  final manual review.

Browser-local DeepSeek settings were supplied and exercised on 2026-07-19.
Only sanitized fields were recorded: provider hostname `api.deepseek.com` and
requested model `deepseek-v4-pro`. The real chat request reached the model
stage, then ended with the fixed retryable UI error before any answer token,
critic result, or completed generation evidence was produced. This is failed
acceptance evidence, not a successful provider run; no mock output is counted.

Later on 2026-07-19, Chat reliability fixes separated browser chart hydration
from durable chart persistence and added built-in DeepSeek model validation.
The unsupported `deepseek-v4-pro` value was blocked locally with zero
`/api/chat` requests. After changing only the browser-owned model name to the
supported `deepseek-chat`, a real chart-explanation request completed through
`hydrateChart`, chart restore/fact extraction, constrained planning, skill,
local RAG, model generation, and final critic. The browser observed one
`/api/chat` request and zero `/api/chart` requests; three chart facts and three
attributed knowledge sources were visible. Model telemetry reported about
450ms to first token and 4.6s to completion. The final critic passed, the
sidebar chart remained available, and the browser console had zero errors.

A controlled failure check changed only the browser-owned Base URL to the local
non-listening address `http://127.0.0.1:9/v1`. Chat left its pending state in
about 15 seconds, exposed the retry action, and preserved the chart and
conversation. Restoring `api.deepseek.com` preserved the provider settings.
The browser console contained zero entries and exposed no credential-shaped
value, raw chart marker, or insight source-body marker. The Insights failure
scenario could not run because the current profile had only 3 conversations
and 3 user messages across 1 day, so the honest insufficient state correctly
prevented provider generation. Chat recovery-to-success, timing, and final
critic are now evidenced by the supported-model run above; eligible
provider-backed Insights remains open. Teardown used the Settings
UI to clear the answer API key; the key field then had length zero and the
clear-key control was absent, without directly inspecting browser storage.

The provider contract gate itself remains green: focused provider/chat/Insights
tests passed 77/77 on 2026-07-19, covering stream telemetry, first-token and
completion timing, final critic gating, retryable provider errors, and absence
of API keys or raw source bodies from responses. These are contract tests, not
real-network acceptance evidence.

Local regression refresh on 2026-07-19 also passed lint (0 errors; existing
third-party skill warnings only), typecheck, the full 70 passed / 3 skipped test
files (749 passed / 4 skipped tests), agent evaluation (17 cases, 0 failed),
production build, and `drizzle-kit check`. A fresh configured-Postgres rerun
also passed all 3 integration files and 4 tests covering two-connection profile
lifecycle, chart/conversation/Insights/deletion lifecycle, and pgvector
retrieval. `npm audit` remained 6 moderate, 0 high, and 0 critical with the
same Task 11 risk classification. Release assertions and `git diff --check`
passed; `ziwei-chat-redesign/` remains untracked. This refresh does not close
the real-provider or final G10/Task 13 gates.

## Open Release Gates

1. Complete eligible real-provider Insights success and failure/recovery. Timed
   real-provider Chat success, final critic, supported-model recovery, the
   controlled Chat failure, and browser secrecy checks are recorded above.
2. Finish the unproven Task 12 browser scope: full keyboard focus order,
   provider-backed announcements and dead-action checks; eligible Postgres
   Insights generation, source disclosure, cache/stale behavior, and full
   deletion; plus saved mobile/desktop screenshots reviewed for nonblank
   rendering, overlap, scroll ownership, text fit, contrast, and reduced motion.
3. Close Task 13 only after every G1-G10 item links to current code, test,
   browser, database, and provider evidence.

## Task 13 Evidence Matrix (Current)

| Gap | Current evidence | Release status |
| --- | --- | --- |
| G1 | `src/lib/ui/insight-sources.ts`; loader tests; no-database/Postgres route probe | implementation and focused behavior evidenced; G10 browser/provider scenarios open |
| G2 | `src/lib/ui/insight-cache.ts`; cache/deletion tests; Postgres deletion lifecycle | implementation and persistence contract evidenced; cross-route release proof open |
| G3 | Insights controller/presenters; controller DOM tests; responsive route probe | implementation and UI states evidenced; real report/provider proof open |
| G4 | `src/lib/ui/active-topics.ts`; catalog and router/planner tests; six browser prompts | closed with current code/test/browser evidence |
| G5 | Six skill files; skill contract tests; deterministic evaluation | closed with current code/test/evaluation evidence |
| G6 | curated knowledge tests; local fallback; Task 11 pgvector parity | closed with current local/Postgres evidence |
| G7 | real deterministic evaluator; 17 cases; agent eval 0 failures | closed for deterministic contract scope; real provider remains G10 |
| G8 | honest chart empty/create/restore paths; chart tests; browser chart lifecycle | closed with current code/test/browser evidence |
| G9 | migration cleanup commit; source/doc/UTF-8 audits; independent review | closed with current code/doc/review evidence |
| G10 | 40 route/viewport checks, Postgres lifecycle, accessibility probe, 77/77 provider contract tests, unsupported-model local block, real `deepseek-chat` success with timing/final critic, controlled local Chat failure, and browser secrecy probe | open: eligible real-network Insights success/failure/recovery, full keyboard/announcement/dead-action pass, eligible Insights cache/stale/deletion browser pass, screenshot visual review, and final Task 13 review |

This matrix is an audit index, not a release declaration. A row marked
implementation or contract-evidenced is not closed if its user-visible release
scenario is still owned by G10.

## Intentional Non-Goals

Accounts, login, payment, subscriptions, quotas, attachments, background music,
push notifications, community, multi-chart comparison, multi-school switching,
advanced annual reports, hosted administration, and dedicated
health/family/children/home workflows are outside Final V1+. They require a new
product specification rather than expansion of this release.

## Residual External Risks

- Existing Postgres/pgvector evidence depends on the configured release
  database used by Task 11 and the 2026-07-19 refresh; reproducing that evidence
  requires an equivalent configured database.
- Real-provider timing and failure proof requires valid OpenAI-compatible model
  settings. The requested model did not produce a successful response from the
  configured endpoint; the browser-local API key was cleared after the failed
  acceptance run and must be configured again for a later retry.
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
- Real Provider acceptance runbook: `docs/development/real-provider-acceptance.md`
