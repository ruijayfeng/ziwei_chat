# Ziwei Chat - Vertical Ziwei Dou Shu Agent

Open-source-first Next.js application planned around Vercel AI SDK, iztro, Postgres, pgvector, and a domain-specific agent harness for Ziwei Dou Shu analysis.

<directory>
docs/ - Product, architecture, knowledge, prompt, evaluation, and development planning documents.
docs/product/ - Product positioning, final-state PRD, and roadmap.
docs/architecture/ - Agent architecture, tool contracts, and data model.
docs/knowledge/ - Skills, RAG, source policy, and knowledge quality rules.
docs/prompts/ - Response protocol, persona rules, and safety boundaries.
docs/evaluation/ - Acceptance criteria and agent quality evaluation.
docs/development/ - Implementation plan and dependency decisions.
docs/superpowers/ - Superpowers-compatible specs and implementation plans.
content/ - Runtime skill workflows and curated local Markdown knowledge.
drizzle/ - Generated Drizzle SQL migrations and migration metadata.
public/ - Static assets served by Next.js.
src/app/ - Next.js App Router entry points and application routes.
src/components/ - Client UI components for onboarding, topic entry, chat, evidence, and the app shell.
src/lib/ - Domain services, database contracts, chart engine adapters, and agent internals.
tests/ - Vitest unit and integration tests for domain, persistence, agent, and evaluation behavior.
</directory>

<config>
AGENTS.md - Project constitution and documentation map for future Codex work.
.env.example - Environment variable template for local, Vercel, AI, and retrieval settings.
docker-compose.yml - Local Postgres with pgvector-enabled image for development.
drizzle.config.ts - Drizzle migration configuration.
eslint.config.mjs - Next.js ESLint configuration.
next.config.ts - Next.js runtime configuration.
package.json - Node package manifest and development scripts.
postcss.config.mjs - Tailwind CSS PostCSS configuration.
PRODUCT.md - Product register, audience, brand personality, anti-references, and design principles for UI work.
README.md - Contributor setup, verification, database, and deployment pointers.
tsconfig.json - TypeScript compiler configuration.
</config>

## Product Constitution

Ziwei Chat is a consumer-facing Ziwei Dou Shu vertical agent. Chat is the interface; the product asset is a reliable agent that grounds answers in chart facts, deterministic tools, curated knowledge, analysis workflows, and quality checks.

The product must serve ordinary users who want an interesting, repeatable, companion-like fortune analysis experience without requiring Ziwei Dou Shu vocabulary.

The first release is open-source and Vercel-first for deployment. It must not require product registration, product login, email verification, payment, or a Ziwei Chat hosted account. Formal product accounts are future extensions, not first-version requirements.

## Engineering Principles

- Reuse mature open-source infrastructure before writing custom systems.
- Do not implement chart calculation logic by hand; use iztro as the deterministic chart engine.
- Use Vercel AI SDK for streaming chat, model calls, and tool execution.
- Treat Vercel as the primary deployment path to reduce open-source adoption friction.
- Use Postgres as the system of record. Local Markdown/keyword knowledge search is the open-source baseline; pgvector is an optional enhanced retrieval mode.
- Keep the first version narrow but agentic: intent routing, planning, tool calls, knowledge loading, memory, and response critique must exist.
- Keep user-visible language friendly and plain; keep internal analysis structured and auditable.
- Default identity model is an anonymous profile/workspace, not an authenticated user account.
- Open-source mode must run without a Ziwei Chat hosted account or embedding service.

## Agent Principles

Accuracy comes from this chain:

```text
birth data -> deterministic chart -> chart facts -> analysis workflow -> trusted knowledge -> critic -> plain-language response
```

The LLM must not invent chart facts, calculate Ziwei positions, or make irreversible life decisions for the user.

## Documentation Protocol

- Update docs when changing product scope, module boundaries, tool contracts, data schemas, knowledge format, prompt protocol, or evaluation rules.
- Add module-level `AGENTS.md` files once source directories exist and a module gains multiple responsibilities.
- For important business files, add the L3 header:

```text
/**
 * [INPUT]: Depends on {specific modules or capabilities}
 * [OUTPUT]: Provides {exported functions/components/types/constants}
 * [POS]: {module role and relationship with sibling files}
 * [PROTOCOL]: Update this header when changed, then check AGENTS.md
 */
```

## Development Gate

Before implementation begins, review:

- `docs/product/prd.md`
- `docs/architecture/agent-architecture.md`
- `docs/architecture/tool-contracts.md`
- `docs/architecture/data-model.md`
- `docs/knowledge/knowledge-and-skills-spec.md`
- `docs/prompts/response-protocol.md`
- `docs/evaluation/acceptance-criteria.md`
- `docs/development/implementation-plan.md`
