# Development Implementation Plan

> Version: 2026-07-03

## Goal

Build a narrow but real Ziwei Dou Shu vertical agent that can create a chart, analyze five consumer topics, call tools, use curated knowledge, critique answers, and persist conversations.

## V1 Completion Boundary

Stop V1 after Phase 8 when:

- Vercel + Neon deployment boots successfully.
- Anonymous profile/workspace works without registration or login.
- One primary chart can be created, saved, loaded, and deleted.
- Recent fortune, career/work, relationships, wealth, and personality topic flows work.
- Agent flow includes intent routing, planning, tool execution, skill loading, local knowledge search, response composition, and critique.
- Serious answers include chart basis and follow the response protocol.
- Conversations persist.
- Local Markdown/keyword knowledge search works without embeddings.
- Seed evaluation cases pass.

Do not add these before V1 is accepted:

- Auth.js or product login.
- Multi-user account management.
- Payment or subscriptions.
- Large pgvector ingestion.
- Multi-school switching.
- Push notifications.
- Advanced reports or community features.

## Phase 0: Project Foundation

- Initialize git repository if one does not exist.
- Scaffold Next.js app with TypeScript.
- Add linting, formatting, and test runner.
- Add Docker Compose for local Postgres with optional pgvector.
- Add root `AGENTS.md` and preserve documentation map.
- Add environment variable example.
- Add Vercel-first deployment notes.

Verification:

- app boots locally
- lint passes
- test command runs

## Phase 1: Database And Persistence

- Add Drizzle schema for anonymous profiles, charts, conversations, messages, memories, knowledge chunks, tool events, eval cases, and eval runs.
- Configure Neon/Postgres connection.
- Add migrations.
- Add seed fixtures for one anonymous profile and one chart fixture.

Verification:

- migration runs against local or development database
- schema tests verify required fields and indexes

## Phase 2: Chart Engine

- Install iztro.
- Implement chart creation service.
- Implement chart summary extraction.
- Persist raw chart JSON and chart summary.
- Add chart validation errors.

Verification:

- known birth fixture creates stable chart output
- invalid input returns structured error
- summary extraction returns topic-relevant facts

## Phase 3: Tool Layer

- Implement tool result wrapper.
- Implement `createChart`, `getCurrentChart`, `summarizeChartFacts`, `getPalaceAnalysis`, `getStarAnalysis`, `getPatternAnalysis`, `getLuckCycle`.
- Implement tool event logging.

Verification:

- each tool has unit tests
- tool errors are structured
- no tool returns final assistant prose

## Phase 4: Skills And Knowledge

- Add skill Markdown files for recent fortune, career, relationship, wealth, personality, and chart explanation.
- Implement skill loader.
- Add curated knowledge files.
- Implement local Markdown/keyword search.
- Implement ingestion into `knowledge_chunks`.
- Add pgvector search as an optional enhanced retrieval mode after embeddings are configured.

Verification:

- skill loader parses front matter and body
- local knowledge search returns source metadata without an embedding key
- optional RAG search returns source metadata when embeddings are configured
- low-confidence retrieval is handled safely

## Phase 5: Agent Core

- Implement intent router.
- Implement planner.
- Wire Vercel AI SDK tool calling.
- Implement response composer prompt.
- Implement response critic.
- Persist messages and conversation summaries.

Verification:

- serious career prompt calls chart tools
- missing chart prompt asks for chart creation
- out-of-scope prompt refuses or redirects
- critic catches ungrounded answer drafts

## Phase 6: UI

- Build onboarding for chart creation.
- Build chat surface with streaming.
- Build topic entry buttons.
- Build chart summary panel.
- Build evidence drawer.
- Build conversation list.

Verification:

- user can create chart and ask first question within 2 minutes
- evidence drawer shows tools and chart facts
- mobile layout remains usable

## Phase 7: Evaluation

- Add seed eval cases.
- Add evaluation runner.
- Store eval runs.
- Add manual review rubric.

Verification:

- eval command runs all seed cases
- failing cases show expected tools and forbidden claims
- repeated prompts preserve core conclusion direction

## Phase 8: Vercel-First Deployment

- Configure Vercel environment variables as the primary deployment path.
- Configure Neon production database for the recommended Vercel path.
- Add migration procedure.
- Add basic logging and error reporting.
- Document Docker/local fallback for contributors and users avoiding hosted infrastructure.

Verification:

- Vercel production deploy boots
- database connection works
- streaming works
- chart creation works
