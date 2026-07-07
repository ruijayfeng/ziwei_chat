# Agent Architecture

> Version: 2026-07-03

## Goal

Build a narrow but real Ziwei Dou Shu vertical agent. The agent must inspect intent, plan analysis, call deterministic tools, load domain knowledge, let the configured model act as analyst when available, and critique the answer before returning it. Model-backed answers are buffered for a final critic pass before user-visible tokens are emitted; if they fail, the route streams the conservative grounded fallback.

## Request Flow

```text
user message
-> session and chart context
-> intent router
-> planner
-> tool runner
-> knowledge orchestrator
-> analysis state
-> response composer
-> critic
-> final streamed response
-> persistence and telemetry
```

## Core Components

### Intent Router

Classifies the message into one primary intent:

- `recent_fortune`
- `career`
- `relationship`
- `wealth`
- `personality`
- `chart_explanation`
- `chart_management`
- `memory_management`
- `general_chat`
- `out_of_scope`
- `safety_sensitive`

Output includes confidence and rationale for tool selection.

### Planner

Turns intent into an analysis plan. A plan contains:

- topic
- required chart facts
- required tools
- required skills
- optional knowledge queries
- safety level
- expected response shape

The planner should prefer explicit, small plans over broad tool exploration.

### Tool Runner

Executes deterministic and retrieval tools. The LLM can request tools, but tool results are the source of truth for chart facts.

Tool categories:

- Chart tools: create chart, load chart, summarize chart facts.
- Domain tools: palace analysis, star analysis, pattern analysis, luck-cycle analysis.
- Knowledge tools: load skill, search knowledge.
- Memory tools: read memory, write memory, summarize conversation.
- Audit tools: record tool events and critique results.

### Knowledge Orchestrator

Separates two knowledge types:

- Skills: stable analysis workflows and domain reasoning templates.
- RAG chunks: supporting explanations, examples, source references, and terminology.

Skills decide how to analyze. RAG supplies evidence and detail.

### Memory Manager

Stores only useful long-term facts:

- chart references
- user language preference
- recurring topics
- explicit user feedback
- conversation summaries

It must not store sensitive raw user statements as permanent memory unless they support future experience and can be shown or deleted by the user.

### Response Composer

Transforms analysis state into user-facing text:

```text
conclusion -> chart basis -> plain explanation -> practical suggestion -> follow-up
```

The composer must avoid jargon-first answers.

### Critic

Checks the draft response before finalizing:

- Does the answer cite chart facts for serious analysis?
- Did required tools run?
- Is the answer overconfident?
- Does it mix conflicting schools without disclosure?
- Does it violate safety boundaries?
- Is there exactly one useful follow-up question?

If the critic fails a response, the composer revises once. If it still fails, return a cautious answer and record the failure.

## Analysis State

Each answer should be backed by an internal state object:

```ts
type AnalysisState = {
  intent: string;
  chartId: string | null;
  topic: string;
  toolsUsed: string[];
  chartFacts: ChartFact[];
  skillsLoaded: string[];
  knowledgeSources: KnowledgeSource[];
  safetyLevel: "normal" | "caution" | "refusal";
  critique: CritiqueResult;
};
```

## Safety Levels

- `normal`: ordinary Ziwei analysis and reflection.
- `caution`: career, relationship, wealth, health-adjacent, or high-emotion topics that need soft boundaries.
- `refusal`: medical, legal, investment instructions, self-harm, violence, or coercive manipulation.

## Streaming Strategy

Use Vercel AI SDK streaming. The agent can stream after essential tool calls complete. For slower RAG searches, show a lightweight transitional phrase only after the system has enough context to avoid misleading early claims.

## Error Handling

- Missing chart: ask the user to create or select a chart.
- Invalid birth data: explain which field is invalid and request correction.
- Tool failure: apologize plainly, record event, and avoid making chart claims.
- Low retrieval confidence: answer from chart facts and clearly state that supporting knowledge was limited.
- Safety-sensitive request: provide reflective, non-directive guidance and recommend professional support where appropriate.

## Observability

Every serious answer should log:

- conversation id
- message id
- intent
- tools called
- chart id
- knowledge chunk ids
- critic result
- latency
- user feedback when available
