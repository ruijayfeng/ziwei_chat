# lib/
> L2 | Parent: AGENTS.md

Member List
agent/tool-result.ts: Structured ToolResult helpers, enforces `{ ok, data }` or `{ ok, error }` tool responses.
agent/tools.ts: Agent tool runner functions, request-scoped caches, primary-chart persistence recovery, and tool event recording.
agent/critic.ts: Deterministic response critic for grounding, fabricated chart facts, overclaiming, high-stakes advice, safety, and follow-up count.
agent/chat-runtime.ts: Runtime tool stores, persistence selection, and current anonymous profile data deletion for the MVP API route.
agent/chat-persistence.ts: Storage-agnostic chat message, tool event, and profile data deletion persistence contract with in-memory implementation.
agent/intent-router.ts: Rule-based MVP intent router for Ziwei topics, management intents, and safety-sensitive prompts.
agent/llm-analyst.ts: Optional model-backed analyst that consumes chart facts, skill steps, RAG sources, critic constraints, and streams final analysis.
agent/llm-planner.ts: Optional model-backed planner that proposes constrained tool, skill, and knowledge plans while preserving service-side allowlists.
agent/model-provider.ts: OpenAI-compatible model adapter that uses page-supplied Base URL, API key, and model after deterministic tool grounding; omits incompatible sampling fields for Moonshot models.
agent/evidence-events.ts: Event framing contract for evidence, answer tokens, retryable model-generation errors, and stream completion.
agent/planner.ts: Explicit analysis planner mapping intents to tools, skills, facts, retrieval queries, and response shape.
agent/response-composer.ts: Response protocol composer for conclusion, chart basis, explanation, suggestion, follow-up, skill analysis steps, and knowledge source titles.
chart/create-chart.ts: iztro chart creation adapter, birth validation, and structured chart engine errors.
chart/summarize-chart.ts: Deterministic chart fact extraction from raw iztro chart JSON.
db/client.ts: Drizzle/Postgres client factory and default database instance.
db/chat-persistence.ts: Postgres-backed ChatPersistence adapter for messages, tool events, and profile-owned data deletion.
db/chart-persistence.ts: Postgres-backed primary-chart save and recovery adapter for cold-start-safe chart tools.
db/schema.ts: Drizzle schema for profiles, charts, conversations, messages, memory, knowledge, skills, tool events, and evals.
db/knowledge-retrieval.ts: Optional Postgres/pgvector knowledge retriever for database-backed semantic RAG.
domain/analysis.ts: Shared intent, plan, analysis state, safety level, and critique contracts.
domain/chart.ts: Shared chart input, output, summary, fact, and error contracts.
evaluation/cases.ts: Seed MVP regression cases for topics, missing chart, invalid input, safety, and out-of-scope prompts.
evaluation/run-evals.ts: Deterministic local evaluation runner that records responses, tool events, critic results, and pass/fail evidence.
http/rate-limit.ts: Fixed-window request limiter for API route abuse protection without external infrastructure.
ui/chat-evidence.ts: Chat evidence header parsing and UI-ready evidence state contracts for tool, chart, knowledge, critic, and answer generation-mode display.
ui/chat-request.ts: Keeps the current primary chart in each browser-to-chat request so serverless turns remain self-contained.
ui/chat-errors.ts: Chat error classification helpers for retryable network, rate-limit, server, and empty-response failures.
ui/chart-profile.ts: Chart profile label formatting and sync-state copy for current chart management UI.
ui/model-settings.ts: Browser-local model settings parser, serializer, provider defaults, and chat request payload shaping.
knowledge/skill-loader.ts: Markdown skill loader and validator for deterministic topic workflows.
knowledge/search.ts: Local Markdown/keyword retrieval for curated and imported knowledge chunks, including confidence-aware scoring.
knowledge/embedding-provider.ts: OpenAI-compatible embedding adapter for query/index vector generation.
knowledge/embedding-index.ts: Local JSON embedding index loader and cosine ranking helpers for no-database semantic retrieval.
knowledge/ziwei-doushu-importer.ts: Offline Renhuai123/ziwei-doushu importer with source metadata, topic inference, and Markdown chunk formatting.

[PROTOCOL]: Update this header when changed, then check AGENTS.md
