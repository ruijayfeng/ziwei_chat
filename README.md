# Ziwei Chat

Ziwei Chat is an open-source-first, Vercel-first Ziwei Dou Shu vertical agent. The first version is being built around anonymous profiles, deterministic chart generation with iztro, Vercel AI SDK streaming/tool calls, local Markdown knowledge retrieval, response critique, and Postgres persistence.

## Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Current Status

The current `master` branch contains the merged open-source MVP foundation and
product UI refinement from PR #2. See
`docs/development/project-status.md` for the handoff snapshot, implemented
surface, known gaps, and recommended next work.

## Verification

```bash
npm run lint
npm run test
npm run typecheck
npm run eval:agent
npm run build
```

## Continuous Integration

GitHub Actions runs the same verification gate on pull requests and pushes to
`master`: install with `npm ci`, then lint, typecheck, test, evaluate the agent,
and build.

## Runtime Hardening

`/api/chat` has a fixed-window request limiter. Defaults are documented in
`.env.example`:

```bash
CHAT_RATE_LIMIT_MAX=30
CHAT_RATE_LIMIT_WINDOW_MS=60000
```

Set `CHAT_RATE_LIMIT_MAX=0` only for trusted local development.

## Local Database

```bash
docker compose up -d postgres
```

The default local URL is documented in `.env.example`. The compose file uses a pgvector-enabled Postgres image so vector retrieval can be added without making embeddings mandatory for the open-source baseline.

## Deployment Direction

Vercel is the primary deployment path for V1. Neon/Postgres is supported through
`DATABASE_URL`, but the current project can still run in deterministic-local /
database-optional mode while hosted database setup is intentionally
deprioritized. Auth, product accounts, payments, and subscriptions are
intentionally outside the first-version scope.

See `docs/development/deployment.md` for environment variables, migration steps, Vercel setup, Neon setup, and smoke checks.
