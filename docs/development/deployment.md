# Deployment

> Version: 2026-07-05
> Scope: Vercel-first open-source MVP deployment notes

## Current Deployment Status

PR #2 merged into `master` with GitHub Actions `Verify` and Vercel Preview
passing. The app is currently safe to run in deterministic-local mode without a
database for product/UI review. Configure `DATABASE_URL` when Postgres-backed
persistence is required.

## Required Environment Variables

Local development:

```text
DATABASE_URL=postgres://ziwei:ziwei@localhost:5432/ziwei_chat
NEXT_PUBLIC_APP_URL=http://localhost:3000
CHAT_RATE_LIMIT_MAX=30
CHAT_RATE_LIMIT_WINDOW_MS=60000
EMBEDDING_BASE_URL=https://api.openai.com/v1
EMBEDDING_API_KEY=
EMBEDDING_MODEL=text-embedding-3-small
```

Production on Vercel + optional Neon/Postgres:

```text
DATABASE_URL=<Neon pooled or direct Postgres URL>
NEXT_PUBLIC_APP_URL=https://<your-vercel-domain>
CHAT_RATE_LIMIT_MAX=30
CHAT_RATE_LIMIT_WINDOW_MS=60000
EMBEDDING_BASE_URL=https://api.openai.com/v1
EMBEDDING_API_KEY=
EMBEDDING_MODEL=text-embedding-3-small
```

Chat model and browser Embedding settings are configured in the app model settings panel. API keys entered there are stored in browser `localStorage` for beta. Local Markdown/keyword retrieval does not require embedding environment variables.

## CI Gate

GitHub Actions runs on pull requests and pushes to `master`. The gate mirrors
the local verification suite:

```bash
npm ci
npm run lint
npm run typecheck
npm run test
npm run eval:agent
npm run build
```

Do not merge changes that fail this gate unless the failure is confirmed to be
external infrastructure and the same commands pass locally.

## Runtime Hardening

`/api/chat` uses a small in-memory fixed-window limiter before parsing request
bodies. It is intended as MVP abuse protection for single-instance local runs
and low-traffic Vercel deployments.

```text
CHAT_RATE_LIMIT_MAX=30
CHAT_RATE_LIMIT_WINDOW_MS=60000
```

Set `CHAT_RATE_LIMIT_MAX=0` to disable the limiter in a trusted development
environment. For higher traffic or multi-region production, replace this with a
shared store-backed limiter such as Vercel KV, Upstash Redis, or an edge rate
limit provider.

## Neon Setup

1. Create a Neon Postgres project.
2. Enable the `vector` extension if pgvector retrieval will be used.
3. Copy the Postgres connection string into `DATABASE_URL`.
4. Use pooled connections for serverless runtime traffic and direct connections for migrations if Neon recommends splitting them.

## Migration Procedure

Generate migrations after schema changes:

```bash
npx drizzle-kit generate
```

Apply migrations:

```bash
npx drizzle-kit migrate
```

Migration `0003_profile_deletion_tombstones.sql` is required before deploying
this version with `DATABASE_URL`. It preserves deleted anonymous profile UUIDs
outside the profile foreign-key graph so an in-flight serverless request cannot
recreate data after deletion succeeds.

The migration was applied successfully to the configured Postgres/Neon database
on 2026-07-17. The release regression uses two independent connections to verify
lock waiting, tombstone rejection, cascade cleanup, and rollback retry behavior.

The initial migration includes:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

This keeps optional pgvector columns compatible with the documented enhanced retrieval path. Local Markdown retrieval remains the baseline and works without embeddings.

## Knowledge Ingestion

The checked-in pgvector schema uses `vector(1024)`, matching
`BAAI/bge-large-zh-v1.5`. Knowledge ingestion and runtime query embeddings must
use the same model and vector dimension. Changing embedding models requires a
dimension migration and full knowledge re-embedding before runtime retrieval.

No-database semantic RAG:

```bash
EMBEDDING_BASE_URL=https://api.openai.com/v1 \
EMBEDDING_API_KEY=sk-... \
EMBEDDING_MODEL=text-embedding-3-small \
npm run build:knowledge-embeddings
```

Database-backed pgvector RAG:

```bash
npx drizzle-kit migrate
EMBEDDING_BASE_URL=https://api.openai.com/v1 \
EMBEDDING_API_KEY=sk-... \
EMBEDDING_MODEL=text-embedding-3-small \
npm run ingest:knowledge-postgres
```

Runtime retrieval is hot-swappable: with `DATABASE_URL` and browser Embedding
settings it attempts Postgres/pgvector first; without database matches it falls
back to `content/knowledge-index/embeddings.json`; without that file it falls
back to Markdown keyword search.

## Vercel Setup

1. Import the repository into Vercel.
2. Set the environment variables above.
3. Run the migration against the Neon database before production smoke testing.
4. Deploy the Next.js app with the default Vercel build command.

Expected build command:

```bash
npm run build
```

## Docker/Local Fallback

Start local Postgres:

```bash
docker compose up -d postgres
```

Then run:

```bash
npm install
npx drizzle-kit migrate
npm run dev
```

## Smoke Checks

After local or Vercel deployment:

1. Open the app without registration or login.
2. Create a primary chart from birth date, time, gender, and calendar type.
3. Ask a career, relationship, wealth, personality, or recent-fortune question.
4. Confirm the response includes conclusion, chart basis, plain explanation, suggestion, and one follow-up.
5. Confirm the evidence panel shows tool, chart, knowledge, and critic state.
6. Run the local regression suite:

```bash
npm run lint
npm run test
npm run eval:agent
npm run build
```

For production API smoke after deployment, send a UTF-8 JSON request to
`/api/chat` and confirm a `200` response for normal chat traffic. If repeated
requests return `429`, verify `CHAT_RATE_LIMIT_MAX` and
`CHAT_RATE_LIMIT_WINDOW_MS` in the deployment environment.

## Monitoring Baseline

For the MVP, use Vercel deployment status, function logs, and GitHub Actions as
the baseline operational loop. External error tracking and persistent rate-limit
stores are recommended follow-ups once real user traffic starts.

## Current Verification Note

In this workspace, Docker Desktop could not start, and the user deprioritized
Neon because the current product data is not critical. Live local/Neon Postgres
migration apply remains pending. The generated migration, schema metadata tests,
unit tests, evals, lint, typecheck, build, GitHub Actions CI, Vercel preview,
and local browser UI smoke have been verified.
