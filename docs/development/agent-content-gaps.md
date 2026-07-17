# Agent Content Gaps

> Version: 2026-07-07
> Purpose: track remaining domain content needed after the Agent/frontend loop and beta curated knowledge layer are wired.

## Current State

The Agent loop can already route intent, build a plan, run deterministic chart tools, load a topic skill, search local Markdown knowledge, compose an answer, run the critic, stream the answer, and expose evidence to the UI.

The current `content/skills/` and `content/knowledge/` files include beta-level curated topic knowledge plus selected high-signal extracts adapted from `Renhuai123/ziwei-doushu`. They cover common-topic retrieval, twelve-palace structure, fourteen-major-star basics, auxiliary/malefic star interpretation, sihua basics, common patterns, star-palace examples, and practical timing boundaries.

Final V1+ active-topic retrieval coverage is closed: representative local queries for career, relationship, wealth, personality, recent fortune, and chart explanation return multiple attributed sources with at least one high-confidence result. Chart explanation intentionally maps to the reviewed `general` chart-structure corpus through the shared `analysisTopicForIntent` contract; it does not duplicate generic doctrine under another topic id.

`content/knowledge/imported/ziwei-doushu/` contains imported seed chunks from `Renhuai123/ziwei-doushu`. Treat it as attributed RAG source material, not final curated product doctrine. The `content/knowledge/renhuai-*.md` files are the promoted curated layer: short, source-attributed, product-safe summaries for topics, palace structure, major stars, auxiliary stars, sihua, star-palace examples, timing, and common pattern interpretation.

## Skill Content Needed

Each topic skill should continue to encode:

- required chart facts: primary palace, supporting palaces, major stars, transforms, patterns, and timing facts
- analysis sequence: what to inspect first, what only supports, and what should never decide alone
- tool priority: which tool output is required, optional, or unsafe without context
- response rules: plain-language phrasing, uncertainty wording, and one-follow-up rule
- critic hints: ungrounded claims, overclaiming, forbidden advice, and missing evidence signals

Minimum skill sections by topic:

- `career`: 官禄, 命宫, 财帛, 迁移, current luck cycle, job-change caution rules
- `relationship`: 夫妻, 命宫, 福德, 迁移/交友 as support, coercion and certainty boundaries
- `wealth`: 财帛, 官禄, 田宅, 福德, risk language, no investment instruction boundary
- `personality`: 命宫, 身宫, 福德, primary stars, avoid fixed-label personality claims
- `recent_fortune`: current luck cycle, 流年/流月 placeholder rules, near-term uncertainty language
- `chart_explanation`: beginner glossary, chart structure, palace/star/transform explanation order

## Knowledge Chunks Still Needed

Remaining corpus for future expansion beyond Final V1+:

- star-by-palace matrix: 14 major stars across the 12 practical palaces. The open-source Renhuai123 repository does not expose the full `14 x 13` doctrine; it only provides selected examples and general star/palace material.
- sihua-by-palace matrix: fuller explanations for 化禄, 化权, 化科, 化忌 across each palace and topic. Current curated content covers the common cases and boundaries.
- pattern-to-tool alignment: curated pattern notes should be linked to stable pattern ids only after the chart tool exposes those ids consistently.
- advanced timing: reliable da-xian / liu-nian / liu-yue interpretation needs richer deterministic timing facts before adding more content.
- health/family/children/home topics: palace basics exist, but these are not active beta topics and do not yet have dedicated skills or answer flows.

Each chunk should include strong `terms` metadata so local keyword retrieval can hit without embeddings.

## Safety Boundaries Needed

Add or preserve explicit content rules for:

- no irreversible instructions: resign, divorce, invest, borrow, diagnose, or make legal/medical decisions
- no unsupported certainty language: avoid single-factor conclusions and claims that a result must happen
- relationship safety: no manipulation advice, coercive claims, or declaring another person's intent as fact
- wealth safety: no trading, investment, debt, or guaranteed income recommendations
- health-adjacent prompts: redirect to professional help and keep Ziwei reading reflective only

## Development Note

The composer can use open-ended symbolic interpretation, but should keep evidence-grounded language and avoid unsupported certainty. The evidence drawer should honestly show whether a source is curated, imported, high confidence, or low confidence.
