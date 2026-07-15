# Project Status

> Version: 2026-07-16
> Purpose: redesigned App Router UI migration handoff with real chart, chat/evidence, settings, and conversation records.

## Current Branch State

- Default integration branch: `master`
- Current local state: the dark editorial multi-route UI is connected to the existing iztro and Agent pipeline on `codex/ui-redesign-prep`; the user-provided redesign repository remains an untracked reference only.
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
- Agent pipeline components: intent router, deterministic planner fallback, optional LLM planner, request-scoped tool stores, deterministic tools, skill loader, local/hybrid knowledge search, optional LLM analyst, response composer, pre-answer critic, and final model-output critic with one bounded revision attempt.
- Provider-backed general chat now goes through the Agent/model path when model settings are enabled, so non-Ziwei messages behave like a normal web chat instead of returning a static Ziwei prompt.
- Chat streams now close defensively on model/API failures: the API emits failed evidence, a retryable error event, and `done` rather than leaving the frontend stuck in a pending evidence run or displaying a fabricated fallback answer.
- Expanded `Renhuai123/ziwei-doushu` RAG seed import exists under `content/knowledge/imported/ziwei-doushu/`, with topic classification and source repo/path/license metadata exposed through evidence.
- Six beta topic entries: recent fortune, career/work, relationships, wealth, personality, and chart explanation.
- Chat API at `/api/chat` with response streaming surface, event-framed evidence/token streams for model-backed answers, persistence boundary, and structured error behavior.
- Persistence boundary that uses Postgres when `DATABASE_URL` is configured and falls back to deterministic/local behavior when it is not. Each chat-message save is bounded to 3 seconds; timeout or persistence failure is logged without holding the answer path open indefinitely.
- Primary charts now persist to Neon and are restored by chart tools after a request or process cache reset.
- The 104 bundled knowledge Markdown chunks are ingested into Neon with 1024-dimensional `BAAI/bge-large-zh-v1.5` vectors; runtime RAG queries pgvector first and labels a keyword fallback as `local`.
- Anonymous profile data deletion through `DELETE /api/chat?profileId=...`.
- Runtime fixed-window rate limiter for `/api/chat`.
- Product UI rebuilt into real App Router routes `/`, `/chart`, `/records`, `/insights`, and `/settings`, with desktop navigation, mobile tabs, report/Markdown answers, and a responsive per-message evidence inspector.
- `/api/chart` now returns a sanitized twelve-palace display DTO backed by iztro; the UI uses real palace indices for 三方四正 and distinguishes 命宫 from iztro's 来因宫 marker.
- Browser chat transport supports static text and newline-framed evidence/token/error/done streams. Each assistant attempt owns its evidence snapshot, retry content, and failure state without carrying facts across turns.
- Profile-scoped `/api/conversations` reads and the records route expose only real conversation/message display fields. Insights stays explicitly unavailable until a sourced aggregation and critic pipeline exists.
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

Latest verified redesigned UI migration results before final browser QA:

- `npm run lint`: passed with no application errors; warnings are limited to installed `.agents/skills/impeccable` scripts.
- `npm run typecheck`: passed.
- `npm run test`: 47 files / 208 tests passed.
- `npm run eval:agent`: 10 cases / 0 failures.
- `npm run build`: passed.
- Browser QA: `390px` had no horizontal overflow, mobile tabs and the evidence bottom sheet were reachable, and a real provider-backed response completed with final critic/evidence state.
- Browser QA: `1024px` rendered the real twelve-palace chart, deterministic fact inspector, and edit form with the desktop rail plus responsive evidence trigger.
- Browser QA: `1280px` and `1536px` rendered the three-column shell and real records/insights/settings routes without horizontal overflow; browser console errors were empty.
- Agent continuity repair: every browser chat request now includes the current primary chart, so serverless cold starts or process changes cannot drop chart context between turns. The runtime also restores chart ownership for same-process requests.
- Agent context repair: the planner and analyst now receive an explicit, speaker-labeled window of the latest 12 non-empty turns. This is bounded conversation context, not implicit durable memory.
- Generation integrity repair: evidence explicitly identifies whether the current answer was LLM-generated, awaiting model configuration, or failed before completion; the right runtime rail and retry UI use that state directly.
- Moonshot compatibility repair: `kimi-k2.6` omits the generic `temperature: 0.4` field and explicitly sends `thinking: { type: "disabled" }`. Moonshot returns reasoning in `reasoning_content`, which shares the request's `max_tokens` budget with final content; disabling thinking preserves the bounded budget for the user-visible answer.
- Evidence continuity regression: a second chart-related request in the same anonymous workspace is verified to return a grounded answer with chart facts and an evidence summary whose fact count matches the evidence payload.

Latest verified answer-presentation results:

- `npm test`: 33 files / 131 tests passed, including Markdown parsing and Unicode-safe progressive reveal coverage.
- `npm run typecheck`: passed.
- `npm run lint`: passed with no application errors; warnings are confined to installed `.agents/skills/impeccable` scripts.
- `npm run build`: passed.
- Browser reload smoke: local `http://localhost:3000` loaded without console errors.

Latest chart presentation work:

- Saving birth data calls a deterministic `/api/chart` boundary and returns sanitized summary/display data without exposing raw chart JSON.
- The chart route and home ring consume only the real display DTO; mock ratings, AI traits, and generated palace summaries are absent.
- The right inspector exposes tools, facts, knowledge sources, generation mode, critic result, and Agent steps for the selected/latest assistant message; mobile and tablet use an accessible bottom sheet.

Latest agent latency and failure hardening work:

- Optional LLM planning is bounded to 3 seconds, and planner-proposed tools and skills are filtered through server-side allowlists before execution. Timeout, provider failure, or invalid JSON falls back to the deterministic plan while recording the fallback source and error code in the plan tool event and evidence step.
- Embedding requests and Postgres/pgvector retrieval are each bounded to 8 seconds. After an empty database result the enhanced path may still use the local JSON embedding index; if enhanced retrieval yields nothing or throws, Markdown keyword fallback is reported as `local` rather than claiming hybrid retrieval.
- OpenAI-compatible model generation accepts compact or event-framed SSE `[DONE]` and `finish_reason: "stop"` as successful completion. It rejects `finish_reason: "length"` as token-limit truncation and a connection EOF with content but no completion marker as an incomplete stream. Initial generation uses a 45-second total timeout and 12-second stream-idle timeout; a critic-requested revision uses a separate 20-second total and 10-second idle budget. Evidence records first-token and completion latency for both attempts.
- Planner, skill, RAG, deterministic critic, model completion/revision, and final critic stages record latency in tool events. Tool-event persistence is best-effort so Neon telemetry latency or failure cannot block the answer path.
- User and assistant message persistence each have a 3-second wait ceiling. A timeout or database failure emits a credential-free diagnostic warning and lets the request continue; tool-event telemetry remains fire-and-forget.
- Pre-stream failures return a safe stage identifier and request ID without logging provider credentials. Undefined tool-event JSON values are normalized to `null` before Postgres persistence so telemetry cannot violate `jsonb NOT NULL` columns.

## Known Gaps

- Neon is the configured hosted Postgres path. The live database has pgvector enabled, the knowledge embedding column and HNSW index use 1024 dimensions for `BAAI/bge-large-zh-v1.5`, and the bundled seed knowledge is ingested. Future knowledge sources still require source/license review before ingestion.
- The Agent/frontend evidence loop is now the main active development path. Domain skill and knowledge content remains seed-level; see `docs/development/agent-content-gaps.md`.
- Provider-backed token streaming remains intentionally critic-gated rather than live-forwarded: the model response is buffered, checked, then emitted as event-framed tokens. Total/idle timeouts and first-token/completion telemetry now bound and expose failures, but users still wait for the complete response and critic before approved text appears; a real-provider timed browser pass is still required to calibrate the current code-level defaults.
- Imported RAG content is broader than the MVP seed, but still needs editorial curation before it should be treated as high-confidence domain doctrine.
- RAG is hot-swappable: local Markdown keyword search remains the no-database baseline; optional embedding settings can use a local JSON embedding index for hybrid retrieval; when `DATABASE_URL` and embedding settings are present, runtime retrieval attempts Postgres/pgvector first and falls back locally if needed.
- Product authentication, hosted accounts, payments, subscriptions, multi-chart management, reports, and large ingestion are intentionally out of V1 scope.
- `npm audit` still reports moderate advisories in Next/PostCSS and drizzle-kit/esbuild chains. npm suggests force fixes that imply breaking downgrades, so they were not applied.
- Weekly letters, monthly reflections, and long-term pattern insights remain intentionally unavailable because no sourced aggregation/critic pipeline exists.

## Recommended Next Work

1. Run a timed browser regression against the real OpenAI-compatible provider, inspect stage and model telemetry for both success and forced failure, then calibrate the current initial-generation 45-second total / 12-second idle, revision 20-second total / 10-second idle, 3-second planner, and 8-second embedding/RAG limits before deciding whether they need deployment-level configuration.
2. Review user-facing Chinese copy in the browser before public announcement.
3. Continue curating imported `ziwei-doushu` chunks by topic, then decide which chunks should graduate from imported seed content to curated product knowledge.
4. Fill the remaining skill and knowledge gaps listed in `docs/development/agent-content-gaps.md`.
5. Design and validate a sourced long-term insights aggregation contract before adding weekly/monthly personalized content.
6. If database-backed mode matters later, configure a local or Neon `DATABASE_URL`, run Drizzle migrations, and add one smoke test against real Postgres.

## Handoff Entry Points

- Project protocol: `AGENTS.md`
- Current status: `docs/development/project-status.md`
- MVP implementation plan: `docs/development/implementation-plan.md`
- Deployment and CI notes: `docs/development/deployment.md`
- Product UI direction: `PRODUCT.md`
- Product UI design spec: `docs/superpowers/specs/2026-07-05-product-experience-ui-design.md`
- Product UI implementation plan: `docs/superpowers/plans/2026-07-05-product-experience-ui.md`
