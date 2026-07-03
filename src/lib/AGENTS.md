# lib/
> L2 | Parent: AGENTS.md

Member List
agent/tool-result.ts: Structured ToolResult helpers, enforces `{ ok, data }` or `{ ok, error }` tool responses.
agent/tools.ts: Agent tool runner functions, in-memory MVP storage adapters, and tool event recording.
chart/create-chart.ts: iztro chart creation adapter, birth validation, and structured chart engine errors.
chart/summarize-chart.ts: Deterministic chart fact extraction from raw iztro chart JSON.
db/client.ts: Drizzle/Postgres client factory and default database instance.
db/schema.ts: Drizzle schema for profiles, charts, conversations, messages, memory, knowledge, skills, tool events, and evals.
domain/chart.ts: Shared chart input, output, summary, fact, and error contracts.

[PROTOCOL]: Update this header when changed, then check AGENTS.md
