# Project Status

> Version: 2026-07-05
> Purpose: handoff snapshot for continuing Ziwei Chat development in a new thread.

## Current Branch State

- Default integration branch: `master`
- Latest merged PR: `#2 MVP hardening and product UI refinement`
- Latest merge commit: `4ae68a7`
- CI status at merge: GitHub Actions `Verify` passed; Vercel preview passed.
- Local workspace at handoff: clean `master` synced with `origin/master`.

## Implemented MVP Surface

- Next.js App Router application with TypeScript, Tailwind CSS v4, React 19, and Next 16.
- Anonymous local profile identity using browser local storage.
- One primary chart input flow with name, gender, birth date, birth time, calendar type, and optional birthplace.
- Ziwei chart creation and chart summary boundary using `iztro`.
- Deterministic-local agent runtime for open-source fallback without a hosted model key.
- Agent pipeline components: intent router, planner, tools, skill loader, local knowledge search, response composer, and critic.
- Five MVP topic entries: recent fortune, career/work, relationships, wealth, and personality.
- Chat API at `/api/chat` with response streaming surface, persistence boundary, and structured error behavior.
- Persistence boundary that uses Postgres when `DATABASE_URL` is configured and falls back to deterministic/local behavior when it is not.
- Anonymous profile data deletion through `DELETE /api/chat?profileId=...`.
- Runtime fixed-window rate limiter for `/api/chat`.
- Product UI shell following the Evidence Companion direction: profile rail, central chat, evidence rail, and mobile sheets.
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

Latest verified results before PR #2 merge:

- `npm run lint`: passed
- `npm run typecheck`: passed
- `npm run test`: 16 files / 46 tests passed
- `npm run eval:agent`: 10 total / 0 failed
- `npm run build`: passed
- Browser QA: desktop 1440x920, mobile 390x844, profile sheet, evidence sheet, save chart flow, and clear-data confirmation passed.

## Known Gaps

- Database is optional at runtime, but a live Neon/local Postgres migration apply was not completed in this workspace because Docker Desktop was unavailable and the user deprioritized Neon.
- The current agent can run in deterministic-local mode; provider-backed model streaming is still a future switch-in.
- pgvector retrieval is documented and schema-aware but not a required active retrieval path for the open-source baseline.
- Product authentication, hosted accounts, payments, subscriptions, multi-chart management, reports, and large ingestion are intentionally out of V1 scope.
- `npm audit` still reports moderate advisories in Next/PostCSS and drizzle-kit/esbuild chains. npm suggests force fixes that imply breaking downgrades, so they were not applied.
- UI is a stronger MVP product shell, but not yet a final flagship design pass. Future design work should continue using `impeccable`/product UI review with browser evidence.

## Recommended Next Work

1. Decide whether to keep V1 fully database-optional or make Postgres required for the open-source first release.
2. If database-backed mode matters next, configure a local or Neon `DATABASE_URL`, run Drizzle migrations, and add one smoke test against real Postgres.
3. Replace deterministic-local response generation with provider-backed Vercel AI SDK model streaming behind the existing agent contracts.
4. Add persisted conversation list and reload behavior if the product should feel stateful beyond the current session.
5. Run another adversarial UI review after any major component or layout change.

## Handoff Entry Points

- Project protocol: `AGENTS.md`
- Current status: `docs/development/project-status.md`
- MVP implementation plan: `docs/development/implementation-plan.md`
- Deployment and CI notes: `docs/development/deployment.md`
- Product UI direction: `PRODUCT.md`
- Product UI design spec: `docs/superpowers/specs/2026-07-05-product-experience-ui-design.md`
- Product UI implementation plan: `docs/superpowers/plans/2026-07-05-product-experience-ui.md`
