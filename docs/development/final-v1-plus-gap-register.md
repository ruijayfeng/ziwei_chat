# Final V1+ Function Gap Register

> Updated: 2026-07-17
> Authority: `docs/superpowers/specs/2026-07-16-final-v1-plus-release-design.md`
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
| Primary chart lifecycle | Complete with one presentation gap | Create, restore, edit, save, and delete use iztro and real profile state; no-chart route still needs an honest active state |
| Chat and evidence | Complete, release validation pending | Real provider/deterministic fallback, planner, tools, skills, RAG, critic, streaming protocol, evidence inspector |
| Records, sidebar, current date | Complete | Real persisted/current-session conversations, real chart summary, Shanghai calendar date, retry/stale-request protection |
| Sourced Insights server | Complete | Bounded aggregation, stable fingerprint, strict API parsing, provider generation, provenance/safety critic |
| Sourced Insights browser/UI | Open | Source loading, cache, controller, source disclosure, stale/error/insufficient/ready states |
| Active topic catalog | Open | Exactly six supported entries backed by matching intent and skill contracts |
| Skill, knowledge, and evaluation quality | Partial | Six files exist, but final contract coverage and real-pipeline evaluation are not strong enough to close the release |
| Migration cleanup and documentation | Open | Remove only proven dead migration components and align L1/L2/L3 maps |
| Release verification | Open | Full automated, browser, Postgres, real-provider, accessibility, responsive, and Chinese-copy evidence |

## Open Gaps And Designs

### G1. Insights Browser Source Loading

**Visible gap:** `/insights` still renders only the temporary
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

**Visible gap:** approved reports cannot yet survive reloads or become visibly
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

**Visible gap:** the accepted weekly-letter and pattern composition has not
been connected to real reports.

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

**Visible gap:** `src/lib/workspace-data.ts` exposes twelve reference topics and
the composer takes the first six, which currently includes unsupported growth,
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

**Visible gap:** all six Markdown skills exist and are substantially structured,
but release closure currently relies on prose inspection rather than an
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

**Visible gap:** the corpus has useful beta material, but imported chunks are
not final doctrine and active-topic retrieval coverage is not yet a release
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

**Visible gap:** `eval:agent` currently creates synthetic responses and copies
`expectedTools` into the actual event list, so its passing result cannot prove
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

**Visible gap:** `/chart` still uses an explicitly labelled demo chart when no
real chart exists. This is safer than pretending it belongs to the user, but it
does not meet the final rule that active surfaces show real state or an
explicit unavailable state.

**Design:** preserve the accepted chart-page composition while replacing the
active demo data with a stable no-chart presentation and create-chart action.
Reference data may remain in tests or the untracked design source, but it must
not appear as the user's chart. Restore failures remain distinct from empty
state and expose retry.

**Closure evidence:** route tests forbid active demo fallback and browser tests
cover empty, loading, restore error, create, edit, restored, and deleted states.

### G9. Migration Dead Code And Documentation

**Visible gap:** old approximate workspace/chart/records components remain
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

**Visible gap:** focused unit gates have strong evidence, but the final product
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
