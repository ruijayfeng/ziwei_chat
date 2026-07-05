# Deployment

> Version: 2026-07-03
> Scope: Vercel-first open-source MVP deployment notes

## Required Environment Variables

Local development:

```text
DATABASE_URL=postgres://ziwei:ziwei@localhost:5432/ziwei_chat
NEXT_PUBLIC_APP_URL=http://localhost:3000
AI_PROVIDER=deterministic-local
AI_MODEL=
OPENAI_API_KEY=
EMBEDDING_PROVIDER_API_KEY=
EMBEDDING_MODEL=
```

Production on Vercel + Neon:

```text
DATABASE_URL=<Neon pooled or direct Postgres URL>
NEXT_PUBLIC_APP_URL=https://<your-vercel-domain>
AI_PROVIDER=deterministic-local
AI_MODEL=
OPENAI_API_KEY=
EMBEDDING_PROVIDER_API_KEY=
EMBEDDING_MODEL=
```

The current MVP can run with `AI_PROVIDER=deterministic-local` because the agent chain is deterministic while provider-backed model streaming is a later switch-in. Local Markdown/keyword retrieval does not require `EMBEDDING_PROVIDER_API_KEY`.

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

The initial migration includes:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

This keeps optional pgvector columns compatible with the documented enhanced retrieval path. Local Markdown retrieval remains the baseline and works without embeddings.

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

## Current Verification Note

In this workspace, Docker Desktop could not start, so the live local Postgres migration apply remains pending. The generated migration, schema metadata tests, unit tests, evals, lint, typecheck, build, and local HTTP UI smoke have been verified.
