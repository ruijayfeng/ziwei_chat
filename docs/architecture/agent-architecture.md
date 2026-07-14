# Agent Architecture

> Version: 2026-07-13

## Goal

Build a narrow but real Ziwei Dou Shu vertical agent. The agent must inspect intent, plan analysis, call deterministic tools, load domain knowledge, let the configured model act as analyst when available, and critique the answer before returning it. Model-backed answers are buffered for a final critic pass before user-visible tokens are emitted. Provider failure or a final critic rejection is exposed as a retryable failure instead of substituting deterministic prose for an LLM answer.

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

The optional model planner has a 3-second total budget. Disabled model settings use the deterministic plan directly; timeout, provider failure, or invalid planner JSON also continues with that plan but records `source: "fallback"` and a diagnostic error code. Tool and skill names remain constrained by server-side allowlists.

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

The deterministic draft is checked before it becomes model context. The final model output is checked again and may be revised once within a separate bounded provider budget. If generation, revision, or the final critic still fails, emit failed evidence plus a retryable error and close the stream; do not present the deterministic draft as a completed model answer.

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

Provider output remains critic-gated: essential tools, skills, RAG, model generation, and the final critic complete before approved answer chunks are emitted to the client. Initial generation is bounded to 45 seconds total and 12 seconds without a stream chunk; a critic-requested revision is bounded to 20 seconds total and 10 seconds idle. Successful OpenAI-compatible streams end with `[DONE]` or `finish_reason: "stop"`; `finish_reason: "length"` is a truncation failure, and EOF after content without either completion marker is an incomplete-stream failure. The client never forwards unchecked provider tokens and reveals the complete approved answer in Unicode-safe, length-adjusted batches over roughly 3 seconds.

For Moonshot `kimi-k2.6`, requests explicitly disable thinking and omit the generic temperature field. The provider exposes thinking as `reasoning_content`, which shares `max_tokens` with final content; disabling it keeps the bounded token budget available for the answer that will pass through the critic and reach the user.

## Error Handling

- Missing chart: ask the user to create or select a chart.
- Invalid birth data: explain which field is invalid and request correction.
- Tool failure: apologize plainly, record event, and avoid making chart claims.
- Low retrieval confidence: answer from chart facts and clearly state that supporting knowledge was limited.
- Provider timeout, request failure, or final critic rejection: emit failed evidence, a retryable error, and `done`; never leave the client pending or replace the failed model answer with deterministic prose.
- Provider truncation or unmarked EOF: classify as `MODEL_RESPONSE_TRUNCATED` or `MODEL_STREAM_INCOMPLETE`, then use the same failed-evidence and retry path.
- Planner timeout, provider failure, or invalid output: continue with the deterministic plan and expose the fallback reason in evidence rather than failing the whole analysis.
- Chat-message persistence timeout or failure: stop waiting after 3 seconds, log a credential-free warning, and continue the request. This bound applies to message saves, not chart persistence.
- Pre-stream route failure: return a safe stage identifier and request ID in response headers/body and structured logs without provider credentials.
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
- planner, skill, RAG, deterministic critic, model first-token/completion, revision, and final-critic latency
- safe failure stage and request ID for pre-stream route errors
- user feedback when available
