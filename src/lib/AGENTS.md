# lib/
> L2 | Parent: AGENTS.md

Member List
agent/tool-result.ts: Structured ToolResult helpers, enforces `{ ok, data }` or `{ ok, error }` tool responses.
agent/tools.ts: Agent tool runner functions, in-memory MVP storage adapters, and tool event recording.
agent/critic.ts: Deterministic response critic for grounding, overclaiming, safety, and follow-up count.
agent/chat-runtime.ts: Runtime tool stores, persistence selection, and current anonymous profile data deletion for the MVP API route.
agent/chat-persistence.ts: Storage-agnostic chat message, tool event, and profile data deletion persistence contract with in-memory implementation.
agent/intent-router.ts: Rule-based MVP intent router for Ziwei topics, management intents, and safety-sensitive prompts.
agent/planner.ts: Explicit analysis planner mapping intents to tools, skills, facts, retrieval queries, and response shape.
agent/response-composer.ts: Response protocol composer for conclusion, chart basis, explanation, suggestion, and follow-up.
chart/create-chart.ts: iztro chart creation adapter, birth validation, and structured chart engine errors.
chart/summarize-chart.ts: Deterministic chart fact extraction from raw iztro chart JSON.
db/client.ts: Drizzle/Postgres client factory and default database instance.
db/chat-persistence.ts: Postgres-backed ChatPersistence adapter for messages, tool events, and profile-owned data deletion.
db/schema.ts: Drizzle schema for profiles, charts, conversations, messages, memory, knowledge, skills, tool events, and evals.
domain/analysis.ts: Shared intent, plan, analysis state, safety level, and critique contracts.
domain/chart.ts: Shared chart input, output, summary, fact, and error contracts.
evaluation/cases.ts: Seed MVP regression cases for topics, missing chart, invalid input, safety, and out-of-scope prompts.
evaluation/run-evals.ts: Deterministic local evaluation runner that records responses, tool events, critic results, and pass/fail evidence.
knowledge/skill-loader.ts: Markdown skill loader and validator for deterministic topic workflows.
knowledge/search.ts: Local Markdown/keyword retrieval for curated knowledge chunks.

[PROTOCOL]: Update this header when changed, then check AGENTS.md
