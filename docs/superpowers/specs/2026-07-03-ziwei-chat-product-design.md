# Ziwei Chat Product Design Spec

> Version: 2026-07-03
> Status: Ready for user review before implementation planning

## Goal

Build a consumer-facing Ziwei Dou Shu vertical agent that provides grounded, understandable, repeatable fortune-analysis conversations.

## Final Product

The final product is not only an MVP chat app. It is a complete vertical agent product with:

- chart onboarding and management
- home dashboard for current fortune and topic continuation
- natural-language chat
- topic analysis for career, relationships, wealth, personality, and recent fortune
- evidence drawer for chart facts, tools, and knowledge sources
- long-term memory with user control
- knowledge management and source policy
- evaluation suite for answer stability and safety
- admin review for failed answers and knowledge quality
- open-source Vercel-first deployment with no mandatory product registration or login
- local Markdown/keyword knowledge search without mandatory embedding services
- optional future SaaS account, privacy, and usage boundaries

## MVP Product

The MVP proves the core agent chain:

```text
user question -> intent -> plan -> chart tools -> skill -> knowledge -> answer -> critic -> persistence
```

MVP includes:

- one primary chart
- anonymous profile/workspace mode without mandatory login
- iztro chart generation
- chart fact extraction
- five topic entry points
- agent tool calling
- skill loading
- small curated knowledge base with local search
- optional pgvector retrieval when embeddings are configured
- response critic
- streaming chat
- conversation persistence
- seed evaluation cases

## V1 Stop Line

V1 stops when the product can run this loop:

```text
Vercel deployment -> anonymous profile -> primary chart -> topic question -> tool-grounded agent answer -> critic -> saved conversation -> passing seed evals
```

V1 must include:

- Vercel-first deployment path.
- Anonymous profile/workspace without product login.
- One primary chart.
- Five topic flows: recent fortune, career/work, relationship, wealth, personality.
- Intent router, planner, tool runner, skills, local knowledge search, response composer, critic.
- Local Markdown/keyword retrieval without embedding services.
- Seed evaluation cases.

V1 must stop before:

- Auth.js or product login.
- Multi-user account management.
- Payment or subscriptions.
- Large pgvector ingestion.
- Multi-school switching.
- Push notifications.
- Advanced reports.

## Architecture

Use:

- Next.js for app framework
- Vercel AI SDK for streaming and tool calls
- iztro for deterministic chart generation
- Postgres for persistence
- local Markdown/keyword search for baseline knowledge retrieval
- optional pgvector for enhanced knowledge retrieval
- Drizzle for schema and migrations
- optional react-iztro for chart visualization

Custom:

- intent router
- planner
- tool contracts
- chart fact extraction
- skill loader
- response composer
- response critic
- evaluation runner

## Key Product Decisions

1. Chat is the interface; the agent is the product asset.
2. RAG is an evidence layer, not the analysis brain.
3. Skills define analysis workflows.
4. The LLM must not calculate chart facts.
5. User-facing language should be warm and plain.
6. Evidence should be expandable, not forced into every answer.
7. MVP must be narrow but agentic.
8. Open-source mode must be useful without SaaS account infrastructure.
9. Open-source mode must be useful without external embedding infrastructure.
10. Vercel should be the primary deployment path; Docker/local remains a fallback.

## Risks

- Knowledge without source metadata creates confident hallucination.
- Silent school mixing creates inconsistent answers.
- Overly expert UI scares ordinary users away.
- Overly playful answers weaken trust.
- A prompt-only implementation fails the product premise.

## Approval Criteria

This spec is approved when the team accepts:

- final product scope
- MVP scope
- architecture boundaries
- tool-first agent design
- evaluation requirements
- safety boundaries
