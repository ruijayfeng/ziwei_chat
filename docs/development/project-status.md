# Project Status

> Version: 2026-07-07
> Purpose: public beta release-candidate handoff for Ziwei Chat.

## Current Branch State

- Default integration branch: `master`
- Current local state: public beta feature work is implemented and ready to commit after verification.
- Latest merged PR before this beta pass: `#2 MVP hardening and product UI refinement`
- Latest merge commit before this beta pass: `4ae68a7`
- CI status at merge: GitHub Actions `Verify` passed; Vercel preview passed.

## Implemented MVP Surface

- Next.js App Router application with TypeScript, Tailwind CSS v4, React 19, and Next 16.
- Anonymous local profile identity using browser local storage.
- One primary chart input flow with name, gender, birth date, birth time, calendar type, and optional birthplace.
- Ziwei chart creation and chart summary boundary using `iztro`.
- Deterministic-local agent runtime for open-source fallback without a hosted model key.
- Page-configured OpenAI-compatible model runtime: users can enter provider, Base URL, API key, and model in the browser; provider responses are read from streaming OpenAI-compatible chat completion responses and forwarded as tokens through the chat stream.
- Deterministic-local remains the fallback when settings are incomplete or provider generation fails.
- Agent pipeline components: intent router, deterministic planner fallback, optional LLM planner, deterministic tools, skill loader, local/hybrid knowledge search, optional LLM analyst, response composer fallback, and critic.
- Expanded `Renhuai123/ziwei-doushu` RAG seed import exists under `content/knowledge/imported/ziwei-doushu/`, with topic classification and source repo/path/license metadata exposed through evidence.
- Six beta topic entries: recent fortune, career/work, relationships, wealth, personality, and chart explanation.
- Chat API at `/api/chat` with response streaming surface, persistence boundary, and structured error behavior.
- Persistence boundary that uses Postgres when `DATABASE_URL` is configured and falls back to deterministic/local behavior when it is not.
- Anonymous profile data deletion through `DELETE /api/chat?profileId=...`.
- Runtime fixed-window rate limiter for `/api/chat`.
- Product UI shell following the Evidence Companion direction: profile rail, central chat, model settings, evidence rail, and mobile sheets.
- shadcn/Base UI owned primitives in `src/components/ui/` for buttons, cards, inputs, textarea, select, sheet, alert dialog, badge, and separator.
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

Latest verified local results for the public beta pass:

- `npm run lint`: passed
- `npm run typecheck`: passed
- `npm run test`: 21 files / 85 tests passed
- `npm run eval:agent`: 10 total / 0 failed
- `npm run build`: passed
- Browser QA artifacts: beta screenshots are available under `public/screenshots/`.

## Known Gaps

- Database is optional at runtime, but a live Neon/local Postgres migration apply was not completed in this workspace because Docker Desktop was unavailable and the user deprioritized Neon.
- The Agent/frontend evidence loop is now the main active development path. Domain skill and knowledge content remains seed-level; see `docs/development/agent-content-gaps.md`.
- Provider-backed token streaming is implemented and covered by route/model-provider tests, but should still be manually tested against at least one real OpenAI-compatible provider before public announcement.
- Imported RAG content is broader than the MVP seed, but still needs editorial curation before it should be treated as high-confidence domain doctrine.
- RAG is hot-swappable: local Markdown keyword search remains the no-database baseline; optional embedding settings can use a local JSON embedding index for hybrid retrieval, and a Postgres/pgvector retriever adapter is available for database-backed deployments.
- Product authentication, hosted accounts, payments, subscriptions, multi-chart management, reports, and large ingestion are intentionally out of V1 scope.
- `npm audit` still reports moderate advisories in Next/PostCSS and drizzle-kit/esbuild chains. npm suggests force fixes that imply breaking downgrades, so they were not applied.
- UI is a stronger MVP product shell, but not yet a final flagship design pass. Future design work should continue using `impeccable`/product UI review with browser evidence.

## Recommended Next Work

1. Run manual browser QA from `docs/development/public-beta-qa.md`, including one deterministic-local pass and one real OpenAI-compatible provider pass.
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
