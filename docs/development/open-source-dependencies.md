# Open Source Dependencies

> Version: 2026-07-03

## Principle

Use mature open-source infrastructure for generic product and agent mechanics. Build custom code only where Ziwei Chat needs domain-specific behavior.

## Recommended Dependencies

### Next.js

Role:

- App framework
- routing
- server actions or route handlers
- deployment compatibility with Vercel

Why:

- Strong React ecosystem
- Good fit for streaming AI apps
- Works well with Vercel AI SDK templates

### Vercel AI SDK

Role:

- model invocation
- streaming responses
- tool calling
- agent loop foundation
- provider abstraction

Why:

- Avoid custom streaming and tool-call orchestration
- TypeScript-first
- Strong fit for Next.js

### Vercel Chatbot Template

Role:

- Reference architecture for chat UI, persistence, and AI SDK integration

Use as:

- Scaffold reference
- Pattern source for chat state and message persistence
- Optional reference for auth only when a future formal product edition is designed

Do not copy blindly. Keep only parts that support Ziwei Chat's agent architecture.

### Vercel

Role:

- primary deployment path for the open-source release
- low-friction public demo and personal deployment
- environment variable management
- Next.js hosting aligned with Vercel AI SDK

Why:

- Reduces open-source adoption friction.
- Makes "fork, configure env, deploy" the default path.
- Keeps deployment simple before a future formal product edition exists.

### iztro

Role:

- deterministic Ziwei chart generation

Why:

- Avoid implementing chart calculation manually
- Lets the system separate deterministic chart facts from LLM interpretation

Use as:

- Chart engine
- Source of chart JSON

Do not use as the entire agent brain. Ziwei Chat needs its own planner, tools, knowledge, memory, and critic.

### react-iztro

Role:

- chart visualization
- palace and luck-cycle display reference

Use as:

- UI component dependency or reference, depending on integration quality

### Postgres

Role:

- anonymous profiles/workspaces
- charts
- conversations
- messages
- memories
- tool events
- eval cases

### pgvector

Role:

- knowledge embeddings
- similarity search

Use only after curated knowledge has source metadata. pgvector is an enhancement, not a first-run requirement. Local Markdown/keyword retrieval must work without embeddings.

### Neon

Role:

- managed Postgres for the recommended Vercel deployment path
- optional managed database for development

Why:

- Serverless-friendly
- Vercel-compatible
- supports pgvector

### Docker Compose

Role:

- local Postgres startup for self-hosted development
- optional pgvector-enabled local database

Why:

- Contributors should be able to develop locally without creating a hosted database first.
- Keeps local development aligned with the no-product-login requirement.
- Serves as fallback for users who do not want Vercel + Neon.

### Drizzle ORM

Role:

- schema definitions
- migrations
- typed database access

Why:

- TypeScript-first
- suitable for Next.js apps

## Future Product Extension

### Auth.js

Role:

- optional authentication for a later formal product edition

Current open-source implementation must not install or require Auth.js, registration, login, email verification, or payment. The schema remains profile-based so a future formal product edition can attach accounts later without rewriting chart, conversation, or memory ownership.

## Custom Code Boundaries

Custom:

- Agent intent router and planner
- Ziwei-specific tool contracts
- chart fact extraction
- skill format and loader
- response critic
- evaluation cases
- knowledge source policy

Reuse:

- chart calculation
- AI streaming
- database
- vector search
- local Markdown/keyword search
- generic chat persistence patterns
