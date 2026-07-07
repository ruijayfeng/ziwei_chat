# Agent Content Gaps

> Version: 2026-07-06
> Purpose: track the minimum domain content needed after the Agent/frontend loop is wired.

## Current State

The Agent loop can already route intent, build a plan, run deterministic chart tools, load a topic skill, search local Markdown knowledge, compose an answer, run the critic, stream the answer, and expose evidence to the UI.

The current `content/skills/` and `content/knowledge/` files now include beta-level curated topic knowledge plus selected high-signal extracts adapted from `Renhuai123/ziwei-doushu`. They are enough to improve common-topic retrieval and plain-language grounding, but not yet enough for deep star-by-palace doctrine or advanced timing work.

`content/knowledge/imported/ziwei-doushu/` contains imported seed chunks from `Renhuai123/ziwei-doushu`. Treat it as attributed RAG source material, not final curated product doctrine. The `content/knowledge/renhuai-*.md` files are the first promoted curated layer: short, source-attributed, product-safe summaries for topics, palace structure, major stars, sihua, and common pattern interpretation.

## Skill Content Needed

Each topic skill should be expanded with:

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

## Knowledge Chunks Needed

Remaining corpus needed before answer quality should be considered strong:

- 12 palace basics: 命宫, 兄弟, 夫妻, 子女, 财帛, 疾厄, 迁移, 交友, 官禄, 田宅, 福德, 父母
- 14 major star basics: 紫微, 天机, 太阳, 武曲, 天同, 廉贞, 天府, 太阴, 贪狼, 巨门, 天相, 天梁, 七杀, 破军
- transform basics: 禄, 权, 科, 忌 with topic-specific caution
- topic rules: career, relationship, wealth, personality, recent fortune; beta-level rules exist, but need more star-by-palace examples
- common pattern notes: only after the chart tool can expose stable pattern ids
- timing notes: current luck-cycle interpretation, with clear limits until full timing tools are implemented

Each chunk should include strong `terms` metadata so local keyword retrieval can hit without embeddings.

## Safety Boundaries Needed

Add explicit content rules for:

- no irreversible instructions: resign, divorce, invest, borrow, diagnose, or make legal/medical decisions
- no certainty language: avoid “一定”, “必然”, “注定”, and single-factor conclusions
- relationship safety: no manipulation advice, coercive claims, or declaring another person's intent as fact
- wealth safety: no trading, investment, debt, or guaranteed income recommendations
- health-adjacent prompts: redirect to professional help and keep Ziwei reading reflective only

## Development Note

Until these gaps are filled, the composer can use open-ended symbolic interpretation, but should keep evidence-grounded language and avoid unsupported certainty. The evidence drawer should honestly show whether a source is curated, imported, high confidence, or low confidence.
