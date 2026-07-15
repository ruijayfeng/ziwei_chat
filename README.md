# Ziwei Chat

Ziwei Chat is an open-source-first Ziwei Dou Shu agent. It lets a user create one anonymous primary chart, ask natural-language questions, and receive answers grounded in deterministic chart facts, topic skills, local knowledge retrieval, and a response critic.

The beta does not require product login, payment, a hosted Ziwei Chat account, Postgres, pgvector, or an embedding service.

## What Works In Beta

- Anonymous local profile and one primary chart.
- Deterministic chart generation through `iztro`.
- Chat flow: user message -> intent -> deterministic chart facts -> optional LLM planner -> tools -> skill -> local/hybrid RAG -> optional LLM analyst -> critic -> response.
- OpenAI-compatible real model streaming from page-supplied provider, Base URL, API key, and model.
- Optional OpenAI-compatible embedding settings for semantic RAG.
- Deterministic chart/tool/RAG preparation remains available without a model; chart-analysis prose explicitly asks for model configuration instead of fabricating a local answer.
- Per-message evidence inspector for tools, chart facts, knowledge sources, critic status, generation state, and Agent run events.
- Model-backed answers stream evidence events and answer tokens; final model output is checked by the critic before user-visible text is emitted.
- Local Markdown/keyword knowledge search, including curated notes and imported `Renhuai123/ziwei-doushu` chunks with source/license metadata.
- Real routes for chat, twelve-palace chart, profile-scoped conversation records, honest insights empty state, and settings.

## Local Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Configure A Real Model

Open `/settings`, use the **模型设置** panel, and choose a provider.

Required fields:

- Provider
- Base URL
- API Key
- Model

The API key is stored only in this browser's `localStorage`; it is sent to `/api/chat` for that request and is not written to the project database by this MVP. Use the **清空 API Key** button to remove it from browser storage.

If settings are incomplete, general chat remains available and deterministic Agent preparation still runs, but personalized chart-analysis prose asks you to finish model configuration.

The Embedding section is optional. When it is not configured, Ziwei Chat uses local Markdown keyword RAG. With `DATABASE_URL`, a configured embedding provider, and ingested knowledge, the app uses Neon/pgvector first and falls back to local retrieval when needed.

## Optional Knowledge Embeddings

Build a local no-database semantic RAG index:

```bash
EMBEDDING_BASE_URL="https://api.siliconflow.cn/v1" \
EMBEDDING_API_KEY="sk-..." \
EMBEDDING_MODEL="BAAI/bge-large-zh-v1.5" \
npm run build:knowledge-embeddings
```

This reads `content/knowledge/**/*.md` and writes `content/knowledge-index/embeddings.json`. Without this file, retrieval automatically falls back to local Markdown keyword search.

For database-backed pgvector RAG, run migrations and ingest the same Markdown
knowledge into Postgres:

```bash
npx drizzle-kit migrate
EMBEDDING_BASE_URL="https://api.siliconflow.cn/v1" \
EMBEDDING_API_KEY="sk-..." \
EMBEDDING_MODEL="BAAI/bge-large-zh-v1.5" \
npm run ingest:knowledge-postgres
```

When `DATABASE_URL` and browser Embedding settings are both present, runtime RAG
tries Postgres/pgvector first, then falls back to the local JSON embedding index,
then to Markdown keyword search.

The checked-in Neon schema uses `vector(1024)`, matching
`BAAI/bge-large-zh-v1.5`. If you choose another embedding model, migrate the
vector dimension and re-embed all knowledge before querying it.

## Verification

Run the full beta gate:

```bash
npm run lint
npm run typecheck
npm run test
npm run eval:agent
npm run build
```

## Deploy To Vercel

1. Push this repository to GitHub.
2. Import it in Vercel as a Next.js project.
3. Set `NEXT_PUBLIC_APP_URL` to your deployed URL.
4. Deploy.

Database variables are optional for the current beta path. The app can run in database-optional deterministic-local mode while hosted Postgres and pgvector provide the production-grade RAG/persistence path. User accounts and payments remain intentionally out of scope.

## Local Database Optional

```bash
docker compose up -d postgres
```

The default local URL is documented in `.env.example`. The compose file uses a pgvector-enabled image. With database and embedding configuration, knowledge chunks can be stored with vectors for database-backed RAG; without database configuration, local Markdown and optional JSON embedding index retrieval still work.

## Demo Script

1. Start the app with `npm run dev`.
2. Fill the chart form with birth date, time, gender, and calendar type.
3. Ask: `我最近想换工作，适合动吗？`
4. Watch the assistant answer.
5. Open the responsive evidence inspector and confirm tools, chart facts, knowledge sources, generation state, and critic status are present.
6. Configure a real OpenAI-compatible model and ask another question to verify token streaming.

## Safety And Scope

- Ziwei Chat does not replace professional medical, legal, financial, psychological, or career advice.
- Answers describe chart tendencies and practical reflection points, not guaranteed predictions.
- The LLM must not invent chart facts or calculate chart positions. Chart facts must come from deterministic tools.
- Missing Ziwei content should stay a gap; do not fill it with unsupported claims.

## Continuous Integration

GitHub Actions runs the same verification gate on pull requests and pushes to `master`: install with `npm ci`, then lint, typecheck, test, evaluate the agent, and build.

## More Docs

- `docs/development/deployment.md`
- `docs/development/project-status.md`
- `docs/development/public-beta-qa.md`
