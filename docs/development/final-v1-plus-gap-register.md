# Final V1+ Function Gap Register

> Updated: 2026-07-19
> Authority: `docs/product/prd.md`, `docs/prompts/response-protocol.md`, and the current acceptance criteria.
> Purpose: single register for what is complete, what remains, how each gap is designed, and what evidence closes it.

## Final Boundary

The final target is a publishable open-source V1+ with an anonymous browser
workspace, one primary chart, grounded chat, inspectable evidence, real
conversation records, sourced insights, six active analysis workflows, and a
verified Vercel-first deployment path.

The following are intentionally outside this release and are not function
gaps: accounts, login, payment, subscriptions, quotas, attachments, background
music, push notifications, community, multi-chart comparison, multi-school
switching, advanced annual reports, hosted administration, and dedicated
health/family/children/home workflows.

## Status Summary

| Area | Status | Final state |
| --- | --- | --- |
| Anonymous identity and deletion | Complete | Browser-scoped profile, remote-first deletion, Postgres tombstone, no deleted-profile resurrection |
| Primary chart lifecycle | Implementation complete, release validation pending | Create, restore, edit, save, delete, loading, empty, malformed-response, and retry states use iztro and real profile state |
| Chat and evidence | Implementation complete, release validation pending | Provider generation, planner, tools, skills, RAG, critic, streaming protocol, and evidence inspector |
| Records, sidebar, current date | Complete | Real persisted/current-session conversations, real chart summary, Shanghai calendar date, retry/stale-request protection |
| Sourced Insights server | Complete | Bounded aggregation, stable fingerprint, strict API parsing, provider generation, provenance/safety critic |
| Sourced Insights browser/UI | Implementation complete, release validation pending | Source loading, profile cache, controller, provenance disclosure, and loading/insufficient/ready/stale/error states |
| Active topic catalog | Complete | Exactly six supported entries backed by matching intent and skill contracts |
| Skill and knowledge quality | Complete | Six executable skill contracts and tool-aligned local knowledge coverage are enforced; configured release-Postgres pgvector parity passed in Task 11 |
| Real-contract evaluation | Complete | Real deterministic stages, 17 isolated cases, required-fact coverage, six rubric samples, and independent review pass |
| Migration cleanup and documentation | Complete | Dead migration components are removed; maps, L3 contracts, recursive active-source copy scan, UTF-8 audit, and independent re-review are current |
| Release verification | Open | Full automated, browser, Postgres, real-provider, accessibility, responsive, and Chinese-copy evidence |

## Remaining Critical Path

The implementation backlog is now narrow. Final V1+ is not yet releasable
because the remaining work is mostly proof and cleanup, but those gates are
release requirements rather than optional polish.

1. **Close G10 / Task 12:** the four-width no-database/Postgres browser matrix
   and timed real-provider Chat success/final critic are recorded; remaining
   work includes eligible real-provider Insights failure/recovery, full keyboard and
   announcement/dead-action checks, eligible Postgres Insights cache/stale/full
   deletion, and saved screenshot visual review. Task 11 automated, migration,
   dependency, pgvector, and real Postgres lifecycle gates are complete.
2. **Task 13:** audit G1-G10 against current evidence and declare Final V1+
   complete only if every mandatory gate passes.

## Gap Designs And Closure

### G1. Insights Browser Source Loading

**Status:** implementation closed; browser and Postgres release acceptance
remain under G10.

**Original gap:** `/insights` rendered only the temporary
insufficient-history view even though the server aggregation and generation
boundary now exists.

**Design:** add a pure browser adapter that loads at most the latest 20
conversation summaries and their validated details, merges the current browser
session, keeps only visible user/assistant text, propagates `AbortSignal`, and
passes the exact source bundle to the existing aggregator. A malformed list or
detail fails closed; it is not silently converted into an empty history.

**Closure evidence:** loader tests cover limits, merge/deduplication, malformed
payloads, unavailable persistence, profile isolation, and cancellation.

### G2. Insights Profile-Scoped Cache And Deletion

**Status:** implementation closed; cross-route deletion and reload behavior
remain part of G10 acceptance.

**Original gap:** approved reports could not survive reloads or become visibly
stale when conversation history changes.

**Design:** use a versioned localStorage envelope keyed by anonymous profile id
and source fingerprint. Cache only validated `InsightReport` values. Never
cache source bodies, chart payloads, model settings, or API keys. A report under
another fingerprint is stale, not current. Successful anonymous deletion
clears the old profile's insight cache after the remote delete commits; a
failed delete preserves it with all other local data.

**Closure evidence:** cache round-trip, malformed eviction, stale fingerprint,
profile isolation, secret/source absence, and deletion-order tests pass.

### G3. Insights Controller And Provenance UI

**Status:** implementation closed; responsive browser and real-provider
acceptance remain under G10.

**Original gap:** the accepted weekly-letter and pattern composition was not
connected to real reports.

**Design:** a client controller owns five explicit states: `loading`,
`insufficient`, `ready`, `stale`, and `error`. Presenters accept only validated
reports and display source-window metadata plus a compact source disclosure for
every paragraph and pattern. Pattern rows are semantic `<article>` elements,
not inert buttons. Retry, profile replacement, and stale requests use abort and
request ownership so older responses cannot win.

**Closure evidence:** controller transition tests and browser scenarios prove
cache hit, eligible generation, stale report, retry, source disclosure,
profile switch, and aborted response handling on mobile and desktop.

### G4. One Canonical Six-Topic Catalog

**Status:** closed at `d273e6e` and `edfdc79`; exact catalog, safe starters,
intent, and skill alignment are covered by focused tests.

**Original gap:** `src/lib/workspace-data.ts` exposed twelve reference topics and
the composer took the first six, which included unsupported growth,
marriage, and family entries while omitting recent fortune, personality, and
chart explanation.

**Design:** replace positional slicing with one typed active-topic catalog:

1. `recent_fortune`
2. `career`
3. `relationship`
4. `wealth`
5. `personality`
6. `chart_explanation`

Each entry owns its label, safe starter question, icon, tone, matching intent,
and skill id. Every active entry must route to the same declared intent and
load the same declared skill. Health, family, children, home, growth, marriage,
startup, study, and future-planning controls are removed from active surfaces.
Natural-language questions in those areas may still receive general-chat,
career, relationship, or safety handling only when the router's explicit
vocabulary supports that interpretation; no UI id silently aliases another
skill.

**Closure evidence:** catalog tests assert exact ids/order and an integration
table proves prompt -> intent -> plan -> skill for all six entries.

### G5. Six Skill Contracts

**Status:** closed at `9a285ab`; planner, prompt, and all critic passes enforce
the executable workflow and prohibition contracts.

**Original gap:** all six Markdown skills existed and were substantially structured,
but release closure relied on prose inspection rather than an
executable topic contract.

**Design:** define table-driven requirements for each skill: deterministic
facts, required/optional tools, analysis order, conservative conditions,
plain-language rules, forbidden claims, and exactly one follow-up. Harden the
content only where a test exposes a missing contract. Keep chart explanation
non-predictive by default and use timing claims only when `getLuckCycle`
returned matching facts.

**Closure evidence:** skill-loader contract tests pass for all six files and
route/evaluation tests prove the plan loads the intended workflow.

### G6. Curated Knowledge Coverage And Source Quality

**Status:** local and contract coverage closed at `6926100`; the fixture-backed
pgvector parity test passed against the configured release database in Task 11
on 2026-07-18.

**Original gap:** the corpus had useful beta material, but imported chunks were
not final doctrine and active-topic retrieval coverage was not yet a release
gate. Full star-by-palace and four-transform matrices are not available from a
reviewed source.

**Design:** close V1+ around reviewed, tool-aligned material rather than claim
encyclopedic coverage. Promote only source-attributed chunks with valid topic,
terms, confidence, and school metadata. Add high-confidence coverage for the
facts current tools can actually return: major-star/palace examples,
four-transform/palace applications, common stable patterns, and timing
boundaries. Imported content remains visibly lower-confidence. Do not add
advanced timing or pattern doctrine until deterministic tool ids support it.

**Closure evidence:** each active topic has local keyword retrieval fixtures,
source metadata tests, no-key fallback tests, and optional pgvector parity
smoke evidence. Conflicting or low-confidence retrieval produces conservative
language.

### G7. Evaluation Must Exercise The Real Contracts

**Status:** closed at `7e670fa`. The evaluator executes real deterministic
route, plan, iztro chart and horoscope tools, skill, local retrieval, composer,
and critic stages. It isolates case failures, verifies every planner-required
fact, records six deterministic rubric samples, and passed independent review.

**Original gap:** `eval:agent` created synthetic responses and copied
`expectedTools` into the actual event list, so its passing result could not prove
that routing, planning, skill loading, tool choice, retrieval, and critique are
wired correctly.

**Design:** keep fast deterministic seed cases, but make them call the real
router, planner, skill loader, local retrieval, response composer, and critic.
Separate fixture-provided chart facts from expected output. Add chart
explanation and the six canonical entry prompts. Preserve the existing missing
chart, invalid time, health-adjacent, investment, and out-of-scope cases. Real
provider acceptance is a separate timed smoke, not a deterministic CI test.

**Closure evidence:** failures identify the actual missing stage, expected tools
are compared with derived plan/runtime events, forbidden claims are checked,
all six topic paths pass, and the human-review rubric has recorded samples.

### G8. Honest No-Chart Presentation

**Status:** closed at `370932e` and `e43a2f9`; active demo data is removed and
loading, empty, restore-error, retry, and real-chart ownership are covered.

**Original gap:** `/chart` used an explicitly labelled demo chart when no
real chart existed. This was safer than pretending it belonged to the user, but it
did not meet the final rule that active surfaces show real state or an
explicit unavailable state.

**Design:** preserve the accepted chart-page composition while replacing the
active demo data with a stable no-chart presentation and create-chart action.
Reference data may remain in tests or the untracked design source, but it must
not appear as the user's chart. Restore failures remain distinct from empty
state and expose retry.

**Closure evidence:** route tests forbid active demo fallback and browser tests
cover empty, loading, restore error, create, edit, restored, and deleted states.

### G9. Migration Dead Code And Documentation

**Status:** closed at `e91c85a` plus the Task 10 zero-import composer follow-up.
Documentation maps, strict UTF-8 and recursive active-source copy checks,
five-route visible-copy audit, accurate L3 headers, focused verification, and
final independent re-review are complete.

**Current gap:** old approximate workspace/chart/records components remain
beside the accepted reference implementation, and L2 documents intentionally
mark several as temporary.

**Design:** generate an import/reference inventory, then remove only components
with no runtime imports and no compatibility contract. Expected candidates
include the old `src/components/workspace` shell, old records presenter, and old
chart presenter/provider; exact deletion is decided from the final import graph.
Do not remove shared adapters, forms, primitives, or test-supported public
contracts. Update the nearest `AGENTS.md` and important L3 headers in the same
commit as structural changes.

**Closure evidence:** no duplicate active shell remains, `rg` finds no static
personalized fixtures or unsupported controls, imports resolve, docs match the
tree, and full tests/build pass.

### G10. Full Release Acceptance

**Status:** partially evidenced; release remains open. The current browser
matrix now covers both no-database and configured Postgres modes, but real
provider acceptance and the final G1-G10 audit are still missing.

**Current gap:** focused unit gates have strong evidence, but the final product
has not completed one current cross-environment acceptance pass.

**Design:** verify serially in three environments:

- deterministic/no-database: anonymous chart, all six entries, evidence,
  current-session records, insufficient Insights, deletion
- Postgres: restore/save/delete chart, conversation reload/details, eligible
  Insights source loading, tombstone and cache cleanup
- real provider: timed chat generation, final critic, Insights generation, and
  recoverable forced provider failure without logging secrets or source bodies

At 390, 1024, 1440, and 1536 pixels, inspect every active route for overlap,
scroll ownership, focus, loading/error announcements, and usable controls.
Review all visible Chinese copy and repository text for UTF-8 corruption.

**Closure evidence:** lint, typecheck, full tests, agent eval, build, database
smokes, browser checklist, screenshots, real-provider timings, and copy review
are recorded in `docs/development/project-status.md` with date and environment.

**Current evidence (2026-07-19):** the production-equivalent build at
`http://localhost:3200` passed `/`, `/chart`, `/records`, `/insights`, and
`/settings` at 390x844, 1024x768, 1440x900, and 1536x960 in both no-database and
configured Postgres modes. All 40 route/viewport checks had no horizontal
overflow and zero browser console errors. The browser verified honest empty
states, six topic prompts, real iztro chart restore/create, persisted Postgres
conversation restore, insufficient Insights, and settings deletion controls.
Browser-local DeepSeek settings were exercised against hostname
`api.deepseek.com` with requested model `deepseek-v4-pro`. The real request
ended with a retryable error before answer generation or critic, so it is not
success evidence. A controlled local Base URL failure proved Chat exits pending,
offers retry, preserves state, and does not expose credential/chart/source
markers in the UI or browser console. The current profile remains Insights-
ineligible at 3 conversations across 1 day. A later supported-model run blocked
`deepseek-v4-pro` locally without a network request, then used `deepseek-chat`
to complete request-local chart hydration, deterministic chart tools, skill,
local RAG, model generation, and final critic. It exposed three chart facts and
three attributed sources, reported about 450ms to first token and 4.6s to
completion, made one `/api/chat` request and zero `/api/chart` requests, and
kept the console error-free. Eligible Insights success/failure/recovery remains
mandatory; mock or failed output is not accepted as closure evidence.

The route/viewport probe does not yet prove the full Task 12 interaction and
visual scope. Full keyboard focus order, provider-backed announcements, dead
actions, eligible Postgres Insights generation/source disclosure/cache/stale/
full deletion, and saved mobile/desktop screenshot review for nonblank
rendering, overlap, scroll ownership, text fit, contrast, and reduced motion
remain open.

## Completion Rule

Final V1+ is complete only when G1-G10 are closed with current evidence. A
passing focused test, a static source assertion, or an honest placeholder alone
does not close a user-visible feature. Deferred product ideas remain deferred
unless the authoritative release design is explicitly revised.

## Gap-To-Plan Traceability

| Gap | Implementation tasks |
| --- | --- |
| G1-G3 Insights browser/cache/UI | Tasks 1-3 |
| G4 canonical topic catalog | Task 4 |
| G8 honest no-chart state | Task 5 |
| G5 skill contracts | Task 6 |
| G6 curated knowledge quality | Task 7 |
| G7 real-contract evaluation | Task 8 |
| G9 migration/docs cleanup | Tasks 9-10 |
| G10 release acceptance | Tasks 11-13 |

## Final-Version Decision

Final V1+ is the final target for this development cycle. Accounts, login,
payment, subscriptions, attachments, music, community, multi-chart,
multi-school, and advanced annual reports are deliberate non-goals, not
deferred blockers. Any proposal to add them requires a new product spec after
Final V1+ closes; it must not expand this release plan.
