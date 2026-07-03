# Ziwei Chat Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first working Ziwei Chat vertical agent with chart creation, tool-grounded analysis, skills, curated knowledge, response critique, chat UI, persistence, and seed evaluation.

**Architecture:** Use Next.js and Vercel AI SDK for the application and streaming agent loop. Keep Ziwei-specific logic behind focused domain services and agent tools. Store anonymous profiles, charts, conversations, knowledge, tool events, and eval runs in Postgres. Local Markdown/keyword knowledge search is the open-source baseline; pgvector is an optional enhancement. The first open-source release is Vercel-first for deployment and must not require product registration or login.

**Tech Stack:** Next.js, TypeScript, Vercel AI SDK, iztro, Postgres, optional pgvector, Drizzle ORM, Vitest or the repo-selected test runner, Vercel-first deployment with Docker/local fallback.

---

## V1 Completion Boundary

Stop after Task 10 when:

- Vercel + Neon deployment boots.
- Anonymous profile/workspace works without product login.
- One primary chart can be created, saved, loaded, and deleted.
- The five topic entries work: recent fortune, career, relationship, wealth, personality.
- Agent execution includes intent router, planner, tool runner, skill loader, local knowledge search, response composer, and critic.
- Serious answers include chart basis and pass the response protocol.
- Conversations persist.
- Seed eval cases pass.

Do not add before V1 acceptance:

- Auth.js or product login.
- Multi-user account management.
- Payment or subscriptions.
- Large pgvector ingestion.
- Multi-school switching.
- Push notifications.
- Advanced reports or community features.

## Planned File Structure

- Create: `src/app/page.tsx` - chat and dashboard entry.
- Create: `src/app/api/chat/route.ts` - AI SDK streaming route.
- Create: `src/lib/db/schema.ts` - Drizzle schema for anonymous profiles and agent data.
- Create: `src/lib/db/client.ts` - database client.
- Create: `src/lib/domain/chart.ts` - chart domain types.
- Create: `src/lib/domain/analysis.ts` - analysis state and critic types.
- Create: `src/lib/chart/create-chart.ts` - iztro chart creation adapter.
- Create: `src/lib/chart/summarize-chart.ts` - chart fact extraction.
- Create: `src/lib/agent/intent-router.ts` - intent classification.
- Create: `src/lib/agent/planner.ts` - analysis plan builder.
- Create: `src/lib/agent/tools.ts` - AI SDK tool definitions.
- Create: `src/lib/agent/response-composer.ts` - answer prompt and composition rules.
- Create: `src/lib/agent/critic.ts` - response validation.
- Create: `src/lib/knowledge/skill-loader.ts` - Markdown skill loader.
- Create: `src/lib/knowledge/search.ts` - local and optional vector knowledge retrieval.
- Create: `content/skills/*.md` - topic workflows.
- Create: `content/knowledge/*.md` - curated seed knowledge.
- Create: `tests/**` - unit and integration tests.

## Task 1: Initialize Project

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `.env.example`
- Create: `src/app/page.tsx`

- [ ] **Step 1: Initialize git**

Run: `git init`
Expected: repository initialized.

- [ ] **Step 2: Scaffold Next.js**

Run: `npx create-next-app@latest . --ts --eslint --app --src-dir --import-alias "@/*"`
Expected: Next.js files created under the repository root.

- [ ] **Step 3: Install core packages**

Run: `npm install ai iztro drizzle-orm postgres zod gray-matter`
Expected: packages installed.

- [ ] **Step 4: Install dev packages**

Run: `npm install -D drizzle-kit vitest tsx`
Expected: dev packages installed.

- [ ] **Step 5: Add local database compose file**

Create `docker-compose.yml` with a Postgres service and documented pgvector support if the selected image supports it.

- [ ] **Step 6: Verify app boots**

Run: `npm run lint`
Expected: lint passes.

## Task 2: Add Database Schema

**Files:**
- Create: `src/lib/db/schema.ts`
- Create: `src/lib/db/client.ts`
- Create: `drizzle.config.ts`

- [ ] **Step 1: Define schema**

Implement tables from `docs/architecture/data-model.md`: profiles, charts, conversations, messages, memories, knowledge_chunks, skills, tool_events, eval_cases, eval_runs.

- [ ] **Step 2: Add database client**

Create a Postgres client that reads `DATABASE_URL` and exports a Drizzle instance.

- [ ] **Step 3: Generate migration**

Run: `npx drizzle-kit generate`
Expected: migration generated.

- [ ] **Step 4: Apply migration**

Run: `npx drizzle-kit migrate`
Expected: database schema created.

## Task 3: Implement Chart Engine

**Files:**
- Create: `src/lib/domain/chart.ts`
- Create: `src/lib/chart/create-chart.ts`
- Create: `src/lib/chart/summarize-chart.ts`
- Create: `tests/chart/create-chart.test.ts`
- Create: `tests/chart/summarize-chart.test.ts`

- [ ] **Step 1: Write chart creation test**

Assert that a valid birth input returns a chart result with `chartJson` and `summary`.

- [ ] **Step 2: Implement iztro adapter**

Use iztro for chart generation. Return structured errors for invalid birth data and chart engine failure.

- [ ] **Step 3: Write chart summary test**

Assert that summary extraction returns key palaces, stars, patterns, and topic facts.

- [ ] **Step 4: Implement summary extraction**

Extract stable chart facts into the `ChartSummary` shape defined in `docs/architecture/tool-contracts.md`.

- [ ] **Step 5: Run tests**

Run: `npx vitest tests/chart`
Expected: chart tests pass.

## Task 4: Implement Agent Tools

**Files:**
- Create: `src/lib/agent/tool-result.ts`
- Create: `src/lib/agent/tools.ts`
- Create: `tests/agent/tools.test.ts`

- [ ] **Step 1: Implement `ToolResult<T>`**

Match the contract in `docs/architecture/tool-contracts.md`.

- [ ] **Step 2: Implement chart tools**

Add `createChart`, `getCurrentChart`, and `summarizeChartFacts`.

- [ ] **Step 3: Implement domain tools**

Add `getPalaceAnalysis`, `getStarAnalysis`, `getPatternAnalysis`, and `getLuckCycle`.

- [ ] **Step 4: Implement knowledge and memory tools backed by real storage interfaces**

Add `loadSkill`, `searchKnowledge`, `saveConversationSummary`, and `saveUserMemory`.

- [ ] **Step 5: Test tool behavior**

Run: `npx vitest tests/agent/tools.test.ts`
Expected: tools return structured success and error results.

## Task 5: Add Skills And Knowledge Loader

**Files:**
- Create: `src/lib/knowledge/skill-loader.ts`
- Create: `src/lib/knowledge/search.ts`
- Create: `content/skills/career.md`
- Create: `content/skills/recent-fortune.md`
- Create: `content/skills/relationship.md`
- Create: `content/skills/wealth.md`
- Create: `content/skills/personality.md`
- Create: `content/skills/chart-explanation.md`
- Create: `tests/knowledge/skill-loader.test.ts`

- [ ] **Step 1: Add skill files**

Create one Markdown skill per MVP topic using the schema from `docs/knowledge/knowledge-and-skills-spec.md`.

- [ ] **Step 2: Implement skill loader**

Parse front matter, validate id/version/topic/tools, and return skill content.

- [ ] **Step 3: Implement local knowledge search**

Parse curated Markdown files and rank chunks by topic, terms, title, and keyword matches. Return `KnowledgeSource` items with `retrievalMode: "local"`.

- [ ] **Step 4: Add optional vector search branch**

When embeddings and pgvector are configured, search vectors after local filtering and return `retrievalMode: "vector"` or `"hybrid"`.

- [ ] **Step 5: Add tests**

Run: `npx vitest tests/knowledge/skill-loader.test.ts`
Expected: valid skills load and malformed skills fail.

## Task 6: Implement Agent Core

**Files:**
- Create: `src/lib/domain/analysis.ts`
- Create: `src/lib/agent/intent-router.ts`
- Create: `src/lib/agent/planner.ts`
- Create: `src/lib/agent/response-composer.ts`
- Create: `src/lib/agent/critic.ts`
- Create: `tests/agent/intent-router.test.ts`
- Create: `tests/agent/planner.test.ts`
- Create: `tests/agent/critic.test.ts`

- [ ] **Step 1: Implement intent router**

Return one of the intents listed in `docs/architecture/agent-architecture.md`.

- [ ] **Step 2: Implement planner**

Map intent to required tools, skills, knowledge queries, and safety level.

- [ ] **Step 3: Implement response critic**

Validate grounding, overclaiming, safety level, and follow-up count.

- [ ] **Step 4: Implement response composer**

Use the protocol from `docs/prompts/response-protocol.md`.

- [ ] **Step 5: Run tests**

Run: `npx vitest tests/agent`
Expected: agent unit tests pass.

## Task 7: Wire Chat API

**Files:**
- Create: `src/app/api/chat/route.ts`
- Modify: `src/lib/agent/tools.ts`

- [ ] **Step 1: Add AI SDK route**

Implement a streaming chat route that loads session context, runs tool-capable generation, and persists messages.

- [ ] **Step 2: Enforce missing-chart behavior**

If no chart exists for a serious chart question, return a chart creation prompt.

- [ ] **Step 3: Persist tool events**

Record tool name, input, output, success, and latency.

- [ ] **Step 4: Run integration test**

Run: `npm run test`
Expected: chat route tests pass.

## Task 8: Build MVP UI

**Files:**
- Create: `src/app/page.tsx`
- Create: `src/components/chart-onboarding.tsx`
- Create: `src/components/chat-panel.tsx`
- Create: `src/components/topic-entry.tsx`
- Create: `src/components/evidence-drawer.tsx`

- [ ] **Step 1: Build chart onboarding**

Fields: name, gender, birth date, birth time, calendar type, optional birthplace.

- [ ] **Step 2: Build topic entries**

Entries: recent fortune, career, relationship, wealth, personality.

- [ ] **Step 3: Build chat panel**

Support streaming assistant messages and conversation continuation.

- [ ] **Step 4: Build evidence drawer**

Show tools used, chart facts, and knowledge sources.

- [ ] **Step 5: Run UI checks**

Run: `npm run lint`
Expected: lint passes.

## Task 9: Add Evaluation Runner

**Files:**
- Create: `src/lib/evaluation/cases.ts`
- Create: `src/lib/evaluation/run-evals.ts`
- Create: `tests/evaluation/eval-cases.test.ts`

- [ ] **Step 1: Add seed eval cases**

Cover the ten cases listed in `docs/evaluation/acceptance-criteria.md`.

- [ ] **Step 2: Implement eval runner**

Run cases, capture tools, response, critic result, and pass/fail.

- [ ] **Step 3: Add npm script**

Add `eval:agent` script that runs the evaluation runner.

- [ ] **Step 4: Run evals**

Run: `npm run eval:agent`
Expected: all seed cases complete with recorded results.

## Task 10: Deployment Readiness

**Files:**
- Modify: `.env.example`
- Modify: `README.md`
- Create: `docs/development/deployment.md`

- [ ] **Step 1: Document env vars**

Include database URL, model provider keys, embedding provider keys, and app URL.

- [ ] **Step 2: Add deployment procedure**

Document migration, Vercel setup, Neon setup, and smoke checks.

- [ ] **Step 3: Run final verification**

Run: `npm run lint && npm run test && npm run eval:agent`
Expected: all checks pass.

## Self-Review Notes

- Spec coverage: PRD, agent architecture, tools, data model, skills, prompts, evaluation, and dependencies are represented.
- Scope: plan builds a narrow but real agent, not the final SaaS product.
- Risk: exact iztro API calls must be verified during implementation because dependency APIs may differ by installed version.
