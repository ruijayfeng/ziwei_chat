# Ziwei Chat PRD

> Version: 2026-07-03
> Status: Development-ready product baseline

## Positioning

Ziwei Chat is a consumer-facing Ziwei Dou Shu vertical agent. It uses deterministic chart calculation, structured chart facts, curated domain knowledge, topic-specific analysis workflows, memory, and response critique to provide grounded, understandable, repeatable fortune-analysis conversations.

Chat is the interface. The core product is the vertical agent.

## Product Promise

Ziwei Chat does not decide the user's life. It helps the user understand personal tendencies, timing, emotional patterns, and practical options through a Ziwei Dou Shu lens.

## Open-Source First Requirement

The first product version is open-source-first and Vercel-first for deployment. A deployer should be able to deploy quickly through Vercel, create a chart, and chat without product registration, product login, email verification, payment, or a Ziwei Chat hosted account.

Default first-version identity is an anonymous profile or workspace inside the deployed app. On Vercel, the app should create a browser-scoped anonymous profile and store only that profile's charts, conversations, and memories. Formal accounts, subscriptions, team management, and hosted private memory are future product-version extensions.

The open-source baseline must work without an external embedding service. Curated Markdown knowledge and local keyword search are required; pgvector retrieval is an enhancement for stronger deployments. Vercel + Neon should be the primary documented deployment path, with Docker/local as the development and self-host fallback.

## Target Users

- Ordinary users curious about fortune analysis, personality, relationships, career, and timing.
- Users who do not understand Ziwei terminology but want answers that feel grounded and personal.
- Users who may return daily or weekly for short guidance, reflection, and topic follow-up.

## First Principles

The product must optimize for two outcomes:

1. **Better analysis**: answers should be more chart-grounded and stable than a generic chatbot.
2. **Repeat use**: the experience should feel understandable, warm, and easy to continue.

Accuracy comes from:

```text
birth data -> deterministic chart -> chart facts -> analysis workflow -> trusted knowledge -> critic -> plain-language response
```

It does not come from longer prompts alone.

## Final Product State

The complete product has three layers.

### User Experience Layer

- Chart onboarding: user creates a chart from birth date, time, gender, and optional birthplace.
- Home dashboard: current chart, today/near-term focus, recent questions, and topic entry points.
- Companion chat: users ask natural questions without needing Ziwei terminology.
- Topic analysis: career, relationships, wealth, personality, recent fortune, annual report, and decision support.
- Evidence drawer: each serious answer can reveal chart facts, knowledge sources, and tools used.
- Long-term memory: remembers chart, user preferences, recurring concerns, and prior feedback with user control.
- Review and delete: users can inspect and delete charts, conversations, and memory entries.
- Follow-up loops: weekly summaries and previous-question follow-up without fear-based messaging.

### Agent Capability Layer

- Intent routing: classify user intent and determine whether Ziwei analysis is appropriate.
- Planning: select analysis workflow and required tools before answering.
- Tool execution: invoke deterministic chart, palace, star, pattern, luck-cycle, knowledge, and memory tools.
- Knowledge orchestration: load skills for workflows and retrieve RAG chunks for evidence.
- Response composition: turn structured analysis into plain, warm, useful language.
- Critique: check grounding, overclaiming, source conflicts, safety boundaries, and response shape.
- Observability: record tool calls, retrieved knowledge, critique results, and user feedback.

### Operations Layer

- Knowledge management: source metadata, topic labels, school labels, confidence, and revision history.
- Evaluation suite: regression cases for answer stability, tool usage, grounding, and safety.
- Admin review: inspect failed answers, retrain prompt rules, adjust skill workflows, and curate knowledge.
- Model routing: use different models for routing, answer generation, critique, and embeddings as cost allows.
- SaaS extension path: optional hosted accounts, private cloud memory, premium reports, and usage limits after the open-source product is useful on its own.

## MVP Scope

The MVP proves that Ziwei Chat is a real vertical agent rather than a prompt wrapper.

Included:

- Create and save a single primary chart per user session.
- Use an anonymous profile/workspace without mandatory registration or login.
- Deterministic chart generation through iztro.
- Chart fact extraction for palaces, major stars, key patterns, and luck-cycle basics.
- Topic entry points: recent fortune, career/work, relationships, wealth, personality.
- Intent router, planner, tool runner, response composer, and response critic.
- Skills for the five MVP topics.
- Small curated Markdown knowledge set with source metadata and local search.
- Optional pgvector retrieval when embeddings are configured.
- Streaming multi-turn chat.
- Conversation persistence.
- Basic evaluation cases.

Deferred:

- Multiple chart comparison.
- Full multi-school switching.
- Large-scale knowledge ingestion.
- Community features.
- Payment and subscriptions.
- Mandatory registration, login, or email verification.
- Push notifications.
- Advanced report generation.

## V1 Stop Line

Stop the first development version when the app can complete this loop end to end:

```text
Vercel deployment
-> anonymous profile/workspace
-> create one primary chart
-> ask one of five topic questions
-> agent routes intent
-> agent calls chart and knowledge tools
-> agent loads the topic skill
-> agent returns a streamed answer with chart basis
-> critic validates the answer
-> conversation is saved
-> seed evaluation cases pass
```

V1 is complete when all of these are true:

- Vercel + Neon deployment path is documented and verified.
- No product registration or login is required.
- Anonymous profile/workspace can own charts, conversations, and memories.
- One primary chart can be created, saved, loaded, and deleted.
- The five MVP topics work: recent fortune, career/work, relationships, wealth, personality.
- Serious Ziwei questions trigger chart-related tools.
- Local Markdown/keyword knowledge search works without an embedding API key.
- The 知微 response protocol is followed: warm, natural dialogue grounded in deterministic chart facts; a follow-up is used only when essential context is missing.
- The critic runs before final answer for serious analysis.
- Seed eval cases pass according to `docs/evaluation/acceptance-criteria.md`.

Stop at V1 even if these are not implemented:

- Auth.js or any product login.
- Multi-user account management.
- Payment, subscription, quota, or SaaS admin features.
- Large-scale pgvector knowledge ingestion.
- Multi-school switching.
- Push notifications.
- Advanced annual reports.
- Community features.

## Non-Goals

- Do not cover Ba Zi, Feng Shui, name analysis, tarot, astrology, or unrelated divination systems.
- Do not present answers as certainty.
- Do not provide medical, legal, investment, or emergency instructions.
- Do not let the LLM calculate chart positions.
- Do not optimize for professional astrologers in the first release.

## Core User Journeys

### First Use

1. User opens the Vercel deployment or local app.
2. App creates or loads an anonymous profile/workspace for that browser.
3. User creates a birth chart.
4. App shows a friendly chart summary and suggested topics.
5. User asks a natural-language question.
6. Agent calls chart and knowledge tools, returns a grounded answer.
7. User can expand the evidence drawer.

### Repeat Use

1. User returns to the home dashboard.
2. App shows recent focus and a continuation prompt.
3. User continues a previous topic or starts a new one.
4. Agent uses chart, conversation summary, and user preferences.

### Evidence Review

1. User expands the answer evidence drawer.
2. App shows chart facts, tool calls, and knowledge sources in concise form.
3. User can provide feedback: accurate, not accurate, helpful, not helpful.

## Success Metrics

Product:

- User can create a chart and ask the first grounded question within 2 minutes.
- User can complete first use without registration or login.
- User can run basic knowledge search without an embedding API key.
- At least 60% of serious answers include visible chart-grounded rationale.
- Returning users can resume a prior topic without restating chart information.

Agent:

- Serious Ziwei questions trigger chart-related tools.
- Serious answers cite chart facts or knowledge sources.
- Repeated evaluation prompts keep stable core conclusions.
- Safety-sensitive prompts downgrade to reflective guidance.

Experience:

- Streaming starts within 3 seconds under normal service conditions.
- Answers use plain, companion-like language and ask a follow-up only when it meaningfully advances the conversation.
- User-visible terminology is explained when introduced.

## Product Voice

Warm friend with domain competence. Not a mystical authority, not a cold expert system, not a generic chatbot.

## Adversarial Review

- If the system can answer without tool calls, the answer is not a proof of agent capability.
- If RAG chunks lack source metadata, retrieval can amplify hallucination.
- If multiple schools are mixed silently, the product will feel inconsistent.
- If user-facing copy exposes too much terminology, ordinary users will leave.
- If answers are too entertaining but not grounded, the product becomes a novelty toy.
- If answers are grounded but stiff, the product will not earn repeat use.
