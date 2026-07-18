# lib/
> L2 | Parent: AGENTS.md

Member List
reference-chart-contract.ts: Data-free reference palace presentation types, four-transform tones, and three-way/four-direction geometry.
utils.ts: Shared Tailwind class composition helper used by owned UI components.
ui/active-topics.ts: Canonical typed six-topic entry catalog for the chat composer, including safe-copy validation, routed intent, and required skill.
agent/tool-result.ts: Structured ToolResult helpers, enforces `{ ok, data }` or `{ ok, error }` tool responses.
agent/tools.ts: Agent tool runner functions, request-scoped caches, functional iztro chart recovery, real horoscope scopes, and tool event recording.
agent/critic.ts: Deterministic response critic for grounding, fabricated chart facts, overclaiming, high-stakes advice, chart-setup prompts, safety, and follow-up count.
agent/chat-runtime.ts: Runtime tool stores, persistence selection, 3-second best-effort chat-message saves, non-blocking tool-event telemetry, and deletion guards that reject late writes for invalidated anonymous profiles.
agent/conversation-context.ts: Bounded, speaker-labelled recent-turn context shared by planner and analyst prompts.
agent/analysis-topic.ts: Shared active-intent mapping to deterministic chart and knowledge topics; chart explanation intentionally uses general doctrine.
agent/chat-persistence.ts: Storage-agnostic chat persistence contract with a stateless production fallback and tombstone-aware in-memory test implementation.
agent/intent-router.ts: Rule-based Final V1+ intent router for Ziwei topics, management intents, and safety-sensitive prompts.
agent/llm-analyst.ts: Optional model-backed analyst that consumes chart facts, skill steps, RAG sources, critic constraints, and streams final analysis.
agent/llm-planner.ts: Optional 3-second model planner that proposes allowlisted tool, skill, and knowledge plans, then explicitly reports model, deterministic, or diagnostic fallback provenance.
agent/model-provider.ts: OpenAI-compatible model adapter with total/idle timeouts, `[DONE]` and `finish_reason` validation, truncation/incomplete-stream errors, first-token/completion telemetry, and `kimi-k2.6` thinking suppression.
agent/evidence-events.ts: Event framing contract for evidence, answer tokens, retryable model-generation errors, and stream completion.
agent/planner.ts: Explicit analysis planner mapping intents to tools, skills, facts, retrieval queries, and response shape.
agent/response-composer.ts: Response protocol composer for conclusion, chart basis, explanation, suggestion, follow-up, skill analysis steps, and knowledge source titles.
chart/create-chart.ts: iztro chart creation adapter, birth validation, and structured chart engine errors.
chart/chart-display.ts: Server-only iztro-to-display adapter that exposes all twelve palaces without leaking raw chart JSON.
chart/summarize-chart.ts: Deterministic chart fact extraction from raw iztro chart JSON.
db/client.ts: Drizzle/Postgres client factory and default database instance.
db/chat-persistence.ts: Postgres-backed ChatPersistence adapter for transaction-guarded messages/tool events and tombstone-first cascade deletion.
db/chart-persistence.ts: Postgres-backed primary-chart save and recovery adapter whose writes share the anonymous-profile lifecycle lock.
db/profile-lifecycle.ts: Shared Postgres transaction lock and permanent deletion-tombstone boundary that prevents late requests from recreating anonymous data.
db/schema.ts: Drizzle schema for profiles, profile deletion tombstones, charts, conversations, messages, memory, knowledge, skills, tool events, and evals.
db/knowledge-retrieval.ts: Optional time-bounded Postgres/pgvector knowledge retriever for database-backed semantic RAG.
domain/analysis.ts: Shared intent, plan, analysis state, safety level, and critique contracts.
domain/chart.ts: Shared chart input, output, summary, fact, and error contracts.
domain/chart-display.ts: Browser-safe full-chart display contracts for palaces, star categories, transformations, and stable geometry.
evaluation/cases.ts: Typed Final V1+ regression cases for six canonical topics, expected stages/sources/facts, missing chart, invalid input, safety, and out-of-scope prompts.
evaluation/run-evals.ts: Real deterministic pipeline evaluator with isolated case failures, chart/tool telemetry, required-fact coverage, stage evidence, response critique, and explicit setup-required outcomes.
http/rate-limit.ts: Fixed-window request limiter for API route abuse protection without external infrastructure.
ui/chat-evidence.ts: Chat evidence parsing and UI-ready contracts for tool, chart, actual retrieval mode, critic, generation state, planner fallback diagnostics, and model timing display.
ui/chat-contract.ts: Shared browser-to-chat API request and evidence wire contracts.
ui/chat-client.ts: Abortable static/event-stream chat transport with evidence and protocol validation.
ui/chat-session.ts: Per-message evidence state machine with single-flight, retry, and empty-answer handling.
ui/reference-chat.ts: Pure real-session-to-reference-presentation adapter for chat phase, thinking, streaming, and failure messages.
ui/reference-chart.ts: Pure sanitized iztro display-to-reference-palace adapter; preserves real indices, stars, four transforms, brightness, and sourced empty interpretation fields.
ui/conversation-records.ts: Validated persisted/current-browser conversation records controller, detail-state reducer, timeline adapter, and unavailable-storage fallback.
ui/streaming-reveal.ts: Unicode-safe helpers that length-adjust approved-answer reveal batches toward roughly three seconds.
ui/chat-request.ts: Keeps the current primary chart in each browser-to-chat request so serverless turns remain self-contained.
ui/chat-errors.ts: Chat error classification helpers for retryable network, rate-limit, stage-aware server, and empty-response failures.
ui/chart-profile.ts: Chart profile label formatting and sync-state copy for current chart management UI.
ui/chart-session.ts: Browser chart-session serialization and profile-owned restore/save helpers.
ui/chart-route-state.ts: Pure chart-route state normalization for loading, empty, restore-error, and real-chart presentation.
ui/chart-restore-payload.ts: Strict profile-owned parser for successful browser chart-restore envelopes; only HTTP 404 represents an empty chart.
ui/sidebar-chart.ts: Pure WorkspaceProvider chart-state adapter for truthful sidebar loading, error, empty, and ready presentation.
ui/current-calendar.ts: Shared Shanghai-time display/date-key formatter and exact next-midnight refresh calculation for the home header and deterministic tools.
ui/data-deletion-dialog.ts: Pure controlled-dialog reducer that blocks pending closes and closes only after successful anonymous-data deletion.
ui/anonymous-data-deletion.ts: Pure remote-first coordinator that runs browser cleanup only after server deletion commits.
ui/insight-sources.ts: Bounded, abortable sanitized conversation loader that merges the current browser session into insight source bundles.
ui/insight-cache.ts: Versioned profile/fingerprint-isolated localStorage cache for validated critic-approved insight reports only.
ui/profile-operation.ts: Profile/revision operation tokens that prevent stale chart restore and save mutations from winning.
ui/chart-display.ts: Pure stable-id lookup and real-index three-way/four-direction geometry for the redesigned chart.
ui/chart-visual.ts: Pure deterministic fact-to-disc model mapping and evidence-backed active palace selection.
ui/model-settings.ts: Browser-local model settings parser, serializer, provider defaults, and chat request payload shaping.
ui/workspace-navigation.ts: Shared active-route navigation contract for desktop and mobile workspace chrome.
ui/workspace-layout.ts: Pure responsive policy that keeps evidence available as a sheet below the desktop rail breakpoint.
knowledge/skill-loader.ts: Markdown skill loader and validator for deterministic topic workflows.
knowledge/search.ts: Local Markdown/keyword retrieval plus exception-safe vector-to-local fallback with truthful source-mode labels.
knowledge/embedding-provider.ts: Time-bounded OpenAI-compatible embedding adapter for query/index vector generation.
knowledge/embedding-index.ts: Local JSON embedding index loader and cosine ranking helpers for no-database semantic retrieval.
knowledge/ziwei-doushu-importer.ts: Offline Renhuai123/ziwei-doushu importer with source metadata, topic inference, and Markdown chunk formatting.
insights/contracts.ts: Strict privacy-safe source bundle, aggregation, provenance, and approved report contracts.
insights/critic.ts: Deterministic generated-report gate for exact shape, provenance, trend support, safety language, and sanitized approval.
insights/generation.ts: Privacy-minimal model prompt, bounded provider generation, strict JSON wrapper parsing, and critic-approved report production.
insights/source.ts: Deterministic newest-first source limits, Shanghai-day eligibility inputs, routed topic counts, user excerpts, and browser-safe SHA-256 fingerprints.

[PROTOCOL]: Update this header when changed, then check AGENTS.md
