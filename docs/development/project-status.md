# Project Status

> Version: 2026-07-12
> Purpose: agent/frontend hardening handoff after Neon RAG, chart persistence, and answer-presentation updates.

## Current Branch State

- Default integration branch: `master`
- Current local state: agent, Neon RAG, chart persistence, workspace UI, and answer presentation work are implemented; commits are being organized from the validated local changes.
- Latest merged PR before this beta pass: `#2 MVP hardening and product UI refinement`
- Latest merge commit before this beta pass: `4ae68a7`
- CI status at merge: GitHub Actions `Verify` passed; Vercel preview passed.

## Implemented MVP Surface

- Next.js App Router application with TypeScript, Tailwind CSS v4, React 19, and Next 16.
- Anonymous local profile identity using browser local storage.
- One primary chart input flow with name, gender, birth date, birth time, calendar type, and optional birthplace.
- Ziwei chart creation and chart summary boundary using `iztro`.
- Deterministic chart tools, planning, skill loading, and knowledge retrieval remain available without a hosted model key; chart-analysis prose requires a configured LLM and is never synthesized from a deterministic response template.
- Page-configured OpenAI-compatible model runtime: users can enter provider, Base URL, API key, and model in the browser; provider output is buffered for final critic validation before safe event-framed tokens are emitted to the chat stream.
- When model settings are incomplete, chart analysis stops with an explicit configuration prompt. When provider generation fails or final critic rejects the answer, the event stream reports a recoverable error and the UI exposes retry; neither case substitutes a deterministic analysis template.
- Agent pipeline components: intent router, deterministic planner fallback, optional LLM planner, request-scoped tool stores, deterministic tools, skill loader, local/hybrid knowledge search, optional LLM analyst, response composer fallback, pre-answer critic, and final model-output critic with conservative fallback.
- Provider-backed general chat now goes through the Agent/model path when model settings are enabled, so non-Ziwei messages behave like a normal web chat instead of returning a static Ziwei prompt.
- Chat streams now close defensively on model/API failures: the API emits failed evidence, a retryable error event, and `done` rather than leaving the frontend stuck in a pending evidence run or displaying a fabricated fallback answer.
- Expanded `Renhuai123/ziwei-doushu` RAG seed import exists under `content/knowledge/imported/ziwei-doushu/`, with topic classification and source repo/path/license metadata exposed through evidence.
- Six beta topic entries: recent fortune, career/work, relationships, wealth, personality, and chart explanation.
- Chat API at `/api/chat` with response streaming surface, event-framed evidence/token streams for model-backed answers, persistence boundary, and structured error behavior.
- Persistence boundary that uses Postgres when `DATABASE_URL` is configured and falls back to deterministic/local behavior when it is not.
- Primary charts now persist to Neon and are restored by chart tools after a request or process cache reset.
- The 104 bundled knowledge Markdown chunks are ingested into Neon with 1024-dimensional `BAAI/bge-large-zh-v1.5` vectors; runtime RAG queries pgvector first and labels a keyword fallback as `local`.
- Anonymous profile data deletion through `DELETE /api/chat?profileId=...`.
- Runtime fixed-window rate limiter for `/api/chat`.
- Product UI rebuilt into the reference-led "紫微知道" workspace: fixed desktop identity/navigation rail, client-side chat/chart/topics/records/settings views, report-style chat responses, real-evidence analysis rail, and mobile navigation/evidence sheets.
- Critic-approved answers now reveal progressively in the client, with loading skeletons and reduced-motion support; ordinary model prose is rendered through an HTML-free Markdown renderer, while complete five-part analysis responses retain the structured report layout.
- shadcn/Base UI owned primitives in `src/components/ui/` for buttons, cards, inputs, textarea, select, sheet, alert dialog, badge, and separator.
- Third-party Claude Code skills are installed under `.agents/skills` with `.claude/skills` symlinks and `skills-lock.json` source hashes; use them only after reviewing scope because they run with full agent permissions.
- CI workflow on pull requests and pushes to `master`: `npm ci`, lint, typecheck, tests, agent evals, and build.

## Verification Baseline

Use this command set before claiming a change is complete:

```bash
npm run lint
npm run typecheck
npm run test
npm run eval:agent
npm run build
```

Latest verified local results for the agent/frontend hardening pass:

- `npx tsc --noEmit`: passed
- `npm test`: 26 files / 112 tests passed
- Dev server smoke: `npm run dev` served `http://localhost:3000` with HTTP 200 after restarting the stale process
- Browser QA: provider-backed general chat passed with saved localStorage model settings, no hydration errors, assistant response rendered, and `正在分析` cleared
- Browser QA: provider-backed chart question passed after saving a chart, evidence completed, critic passed, no hydration or uncontrolled field warnings

Latest verified UI rebuild results:

- `npm run lint`: passed with no application errors; warnings are limited to installed `.agents/skills/impeccable` scripts.
- `npm run typecheck`: passed.
- `npm run test`: 28 files / 117 tests passed.
- `npm run eval:agent`: 10 cases / 0 failures.
- `npm run build`: passed.
- Browser QA: desktop `1536px` reference review confirmed the fixed three-column workspace, topic view switch, honest runtime labels, and no fake evidence data.
- Browser QA: mobile `390px` review confirmed no horizontal overflow, chat-first layout, reachable navigation/evidence sheets, and readable topic controls.
- Agent continuity repair: every browser chat request now includes the current primary chart, so serverless cold starts or process changes cannot drop chart context between turns. The runtime also restores chart ownership for same-process requests.
- Agent context repair: the planner and analyst now receive an explicit, speaker-labeled window of the latest 12 non-empty turns. This is bounded conversation context, not implicit durable memory.
- Generation integrity repair: evidence explicitly identifies whether the current answer was LLM-generated, awaiting model configuration, or failed before completion; the right runtime rail and retry UI use that state directly.
- Moonshot compatibility repair: `kimi-k2.6` accepts the project OpenAI-compatible streaming contract when the request omits the generic `temperature: 0.4` field; provider-level regression coverage and a live `/api/chat` verification both pass.
- Evidence continuity regression: a second chart-related request in the same anonymous workspace is verified to return a grounded answer with chart facts and an evidence summary whose fact count matches the evidence payload.

Latest verified answer-presentation results:

- `npm test`: 33 files / 131 tests passed, including Markdown parsing and Unicode-safe progressive reveal coverage.
- `npm run typecheck`: passed.
- `npm run lint`: passed with no application errors; warnings are confined to installed `.agents/skills/impeccable` scripts.
- `npm run build`: passed.
- Browser reload smoke: local `http://localhost:3000` loaded without console errors.

## Known Gaps

- Neon is the configured hosted Postgres path. The live database has pgvector enabled, the knowledge embedding column and HNSW index use 1024 dimensions for `BAAI/bge-large-zh-v1.5`, and the bundled seed knowledge is ingested. Future knowledge sources still require source/license review before ingestion.
- The Agent/frontend evidence loop is now the main active development path. Domain skill and knowledge content remains seed-level; see `docs/development/agent-content-gaps.md`.
- Provider-backed token streaming is intentionally critic-gated rather than live-forwarded: the model response is buffered, checked, then emitted as event-framed tokens. The client now reveals approved content progressively, but the real provider can still spend a long time before its first approved output; provider timeout/latency observability remains a separate operational concern.
- Imported RAG content is broader than the MVP seed, but still needs editorial curation before it should be treated as high-confidence domain doctrine.
- RAG is hot-swappable: local Markdown keyword search remains the no-database baseline; optional embedding settings can use a local JSON embedding index for hybrid retrieval; when `DATABASE_URL` and embedding settings are present, runtime retrieval attempts Postgres/pgvector first and falls back locally if needed.
- Product authentication, hosted accounts, payments, subscriptions, multi-chart management, reports, and large ingestion are intentionally out of V1 scope.
- `npm audit` still reports moderate advisories in Next/PostCSS and drizzle-kit/esbuild chains. npm suggests force fixes that imply breaking downgrades, so they were not applied.
- UI is a stronger MVP product shell, but not yet a final flagship design pass. Future design work should continue using `impeccable`/product UI review with browser evidence.

## Recommended Next Work

1. Add provider timeout/latency telemetry and run a timed browser pass against the real OpenAI-compatible provider.
2. Review user-facing Chinese copy in the browser before public announcement.
3. Continue curating imported `ziwei-doushu` chunks by topic, then decide which chunks should graduate from imported seed content to curated product knowledge.
4. Fill the remaining skill and knowledge gaps listed in `docs/development/agent-content-gaps.md`.
5. Add persisted conversation list and reload behavior if the product should feel stateful beyond the current session.
6. If database-backed mode matters later, configure a local or Neon `DATABASE_URL`, run Drizzle migrations, and add one smoke test against real Postgres.

## Handoff Entry Points

- Project protocol: `AGENTS.md`
- Current status: `docs/development/project-status.md`
- MVP implementation plan: `docs/development/implementation-plan.md`
- Deployment and CI notes: `docs/development/deployment.md`
- Product UI direction: `PRODUCT.md`
- Product UI design spec: `docs/superpowers/specs/2026-07-05-product-experience-ui-design.md`
- Product UI implementation plan: `docs/superpowers/plans/2026-07-05-product-experience-ui.md`
