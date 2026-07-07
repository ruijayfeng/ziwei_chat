# Agentic RAG Evidence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade Ziwei Chat from deterministic composition plus model wording into an LLM-led Agent flow with hot-swappable storage/RAG and dynamic evidence timeline.

**Architecture:** Keep `iztro` and deterministic tools as the only source of chart facts. Add a planner/analyst model layer that consumes chart facts, skill steps, and retrieved knowledge, while service-side tool allowlists preserve the evidence contract. Use Markdown keyword retrieval without database configuration and Postgres/pgvector hybrid retrieval when database plus embeddings are configured.

**Tech Stack:** Next.js App Router, TypeScript, React 19, local Markdown knowledge, optional Postgres/pgvector via Drizzle, OpenAI-compatible chat and embedding APIs, Vitest.

## Global Constraints

- Do not let the LLM calculate Ziwei chart facts; chart facts must come from deterministic tools.
- Keep the existing evidence header contract compatible for current UI/tests.
- Missing Ziwei content stays a gap; do not fabricate doctrine.
- Database is hot-swappable: no database must still run local Markdown RAG.
- Embedding RAG is optional and falls back to local keyword retrieval.
- Run verification after substantive implementation: `npm run lint`, `npm run typecheck`, `npm run test`, `npm run eval:agent`, `npm run build`.

---

### Task 1: Evidence Timeline Contract And UI

**Files:**
- Modify: `src/lib/ui/chat-evidence.ts`
- Modify: `src/components/evidence-drawer.tsx`
- Modify: `src/components/ziwei-chat-shell.tsx`
- Test: `tests/ui/chat-evidence.test.ts`

**Interfaces:**
- Produces `EvidenceRun`, `EvidenceStep`, and `appendEvidenceRun(base, run)` types/helpers.
- Keeps `EvidenceState.toolsUsed`, `chartFacts`, `knowledgeSources`, and `critic` unchanged for compatibility.

- [ ] Add normalized `runs` to `EvidenceState`, each with `runId`, `title`, `summary`, `status`, `startedAt`, `completedAt`, and short process `steps`.
- [ ] Parse `X-Ziwei-Evidence` into both legacy fields and timeline runs.
- [ ] Update the drawer to render current/latest run expanded and previous runs collapsed.
- [ ] Move `setEvidence(nextEvidence)` immediately after response header parsing so the timeline appears before answer streaming completes.
- [ ] Add UI tests for timeline parsing and legacy evidence fallback.

### Task 2: Streaming Process Events

**Files:**
- Create: `src/lib/agent/evidence-events.ts`
- Modify: `src/app/api/chat/route.ts`
- Modify: `src/components/ziwei-chat-shell.tsx`
- Test: `tests/app/chat-route.test.ts`

**Interfaces:**
- Produces newline-delimited stream frames:
  - `event: evidence`
  - `event: token`
  - `event: done`
- Keeps plain text fallback for older responses where event frames are absent.

- [ ] Add a small encoder/decoder for evidence event frames.
- [ ] Emit short steps such as `理解问题`, `读取命盘`, `生成计划`, `调用工具`, `加载 skill`, `检索知识`, `模型分析`, `critic 检查`, and `完成`.
- [ ] Update the client reader to apply evidence events and append token events into the assistant message.
- [ ] Keep `X-Ziwei-Evidence` final snapshot for compatibility.
- [ ] Test that the route streams evidence events before model tokens.

### Task 3: Model Settings Split For Chat And Embeddings

**Files:**
- Modify: `src/lib/ui/model-settings.ts`
- Modify: `src/components/model-settings-panel.tsx`
- Modify: `src/lib/agent/model-provider.ts`
- Test: `tests/ui/model-settings.test.ts`
- Test: `tests/agent/model-provider.test.ts`

**Interfaces:**
- `ModelSettingsRequest` gains `chat` and `embedding` sections while accepting legacy flat settings.
- `normalizeModelSettings` returns `{ chat, embedding }`, where each section has `enabled`, `baseUrl`, `apiKey`, and `model`.

- [ ] Add backwards-compatible parsing for old flat chat settings.
- [ ] Add embedding fields to the panel.
- [ ] Keep API keys in browser localStorage only.
- [ ] Add tests for missing embedding configuration falling back cleanly.

### Task 4: Embedding Provider And Local Index

**Files:**
- Create: `src/lib/knowledge/embedding-provider.ts`
- Create: `src/lib/knowledge/embedding-index.ts`
- Create: `scripts/build-knowledge-embeddings.ts`
- Modify: `.env.example`
- Test: `tests/knowledge/embedding-index.test.ts`

**Interfaces:**
- `generateEmbedding({ settings, input })` calls OpenAI-compatible `/embeddings`.
- `loadKnowledgeEmbeddingIndex()` reads `content/knowledge-index/embeddings.json` when present.
- `build-knowledge-embeddings` writes a local JSON index for no-database semantic retrieval.

- [ ] Implement embedding generation with clear failure results.
- [ ] Implement cosine similarity helper and JSON index loading.
- [ ] Add script that embeds Markdown chunks and preserves metadata/source attribution.
- [ ] Add `.env.example` embedding variables.

### Task 5: Hot-Swappable Hybrid RAG

**Files:**
- Modify: `src/lib/knowledge/search.ts`
- Create: `src/lib/knowledge/retriever.ts`
- Create: `src/lib/db/knowledge-retrieval.ts`
- Test: `tests/knowledge/retriever.test.ts`

**Interfaces:**
- `searchKnowledge` accepts optional embedding settings and returns `retrievalMode: "local" | "vector" | "hybrid"`.
- Runtime chooses `hybrid` when embedding settings and vector data are available; otherwise local keyword.

- [ ] Extract Markdown loader/scorer as reusable local retriever.
- [ ] Add local embedding-index retriever for no-database semantic rerank.
- [ ] Add Postgres/pgvector retriever adapter behind `DATABASE_URL`.
- [ ] Combine topic/terms filters, vector similarity, and confidence rerank.
- [ ] Preserve source/path/license in returned evidence.

### Task 6: LLM Planner And Analyst

**Files:**
- Create: `src/lib/agent/llm-planner.ts`
- Create: `src/lib/agent/llm-analyst.ts`
- Modify: `src/app/api/chat/route.ts`
- Modify: `src/lib/agent/critic.ts`
- Test: `tests/agent/llm-planner.test.ts`
- Test: `tests/app/chat-route.test.ts`

**Interfaces:**
- Planner returns a constrained JSON plan with `topic`, `toolRequests`, `skillIds`, `knowledgeQueries`, and `analysisFocus`.
- Analyst receives only allowed facts/skills/knowledge and streams final answer.

- [ ] Add planner prompt and JSON schema validation with deterministic fallback to current planner.
- [ ] Execute only service-side allowlisted tools.
- [ ] Pass chart facts, skill steps, RAG chunks, and critic constraints to analyst.
- [ ] Run critic after analyst output; on failure, emit conservative fallback or one revision pass.
- [ ] Add tests proving the LLM cannot introduce unreturned palace/star facts.

### Task 7: Documentation And Verification

**Files:**
- Modify: `docs/development/project-status.md`
- Modify: `docs/knowledge/knowledge-and-skills-spec.md`
- Modify: `docs/architecture/agent-architecture.md`
- Modify: `README.md`

- [ ] Document hot-swappable database modes.
- [ ] Document chat and embedding model settings.
- [ ] Document evidence timeline semantics.
- [ ] Run full verification gate.
- [ ] Commit the implementation in coherent commits.

## Self-Review

- The plan covers the approved requirements: LLM as Agent brain, deterministic chart facts, skill/RAG context, embedding model settings, hot-swappable database/RAG, and dynamic evidence timeline.
- No task requires database for first-run local mode.
- Existing evidence fields remain compatible while timeline is added.
