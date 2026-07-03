# Ziwei Chat

Ziwei Chat is an open-source-first, Vercel-first Ziwei Dou Shu vertical agent. The first version is being built around anonymous profiles, deterministic chart generation with iztro, Vercel AI SDK streaming/tool calls, local Markdown knowledge retrieval, response critique, and Postgres persistence.

## Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Verification

```bash
npm run lint
npm run test
npm run typecheck
```

## Local Database

```bash
docker compose up -d postgres
```

The default local URL is documented in `.env.example`. The compose file uses a pgvector-enabled Postgres image so vector retrieval can be added without making embeddings mandatory for the open-source baseline.

## Deployment Direction

Vercel + Neon is the primary deployment path for V1. Auth, product accounts, payments, and subscriptions are intentionally outside the first-version scope.
