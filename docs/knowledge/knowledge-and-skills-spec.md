# Knowledge And Skills Spec

> Version: 2026-07-03

## Purpose

Knowledge must improve analysis quality without turning the system into an uncontrolled text mixer. Skills define how to analyze. RAG provides supporting details.

## Skill Responsibilities

Skills are deterministic analysis workflows. They are loaded by id and should be small enough to fit into an agent prompt.

MVP skills:

- `recent_fortune`
- `career`
- `relationship`
- `wealth`
- `personality`
- `chart_explanation`

Each skill must define:

- required chart facts
- analysis steps
- useful tools
- response rules
- safety notes
- terms to search in local knowledge and optional RAG

## Skill File Format

Skill files should live under `content/skills/` once implementation begins.

```markdown
---
id: career
version: 1.0.0
topic: career
requiredFacts:
  - career palace
  - life palace
  - wealth palace
  - current luck cycle
tools:
  - getCurrentChart
  - summarizeChartFacts
  - getPalaceAnalysis
  - getLuckCycle
  - searchKnowledge
---

# Career Analysis

## Analysis Steps

1. Identify career-related palace facts.
2. Compare chart tendency with current luck-cycle context.
3. Separate stable personality tendency from near-term timing.
4. Translate findings into practical work choices.
5. Ask one follow-up about the user's real-world situation only when that context is necessary to answer responsibly.

## Response Rules

- Do not tell the user to resign, invest, or make irreversible decisions.
- Use "更像", "倾向", and "可以观察" instead of absolute claims.
- Explain one or two chart bases in plain language.
```

## Knowledge Retrieval Responsibilities

Knowledge chunks provide:

- star meanings
- palace meanings
- pattern explanations
- transform explanations
- examples of interpretation
- source-backed terminology explanations

RAG must not decide the analysis workflow.

## Retrieval Modes

The open-source baseline must support local retrieval without external embedding services:

- `local`: parse curated Markdown and search by topic, terms, title, and keyword matches.
- `vector`: use pgvector embeddings when a database and embedding provider are configured.
- `hybrid`: combine topic/term filtering, vector similarity, and confidence/source-quality ranking. In no-database mode this can use `content/knowledge-index/embeddings.json`; in database mode it can use Postgres/pgvector.

MVP must implement `local`. `vector` and `hybrid` improve quality but must not block first use.

## Knowledge Chunk Format

Knowledge source files should live under `content/knowledge/` before ingestion.

```markdown
---
title: 紫微星在命宫的基础解释
topic: personality
terms:
  - 紫微
  - 命宫
school: default
confidence: high
source: curated-internal
sourceUrl: ""
license: Apache-2.0
---

紫微星在命宫通常用于观察一个人的主观气场、组织欲、稳定感和责任意识。
解释时应结合同宫星曜、三方四正、四化和运限，不应单独下结论。
```

## Source Policy

Allowed sources:

- Public documentation for open-source Ziwei projects when license permits.
- Curated internal notes written for this project.
- Public articles that allow citation or summarized use.
- User-generated feedback only after anonymization and explicit product decision.

Disallowed sources:

- Private paid course material without permission.
- Full copied articles without license clarity.
- Anonymous claims that cannot be traced.
- Conflicting school claims without metadata.

Project-owned curated knowledge is licensed under Apache-2.0. Third-party
knowledge must retain its source URL, original license identifier, and any
required attribution; repository-wide notices are collected in `NOTICE`.

## School Policy

MVP uses one `default` interpretation school. Other schools can be recorded but not silently mixed into user-facing conclusions.

If retrieved knowledge conflicts:

1. Prefer higher-confidence curated source.
2. Prefer the default school.
3. If conflict remains, present a cautious interpretation rather than blending claims.

## Chunking Rules

- One chunk should cover one concept, pattern, or analysis rule.
- Keep chunks between 150 and 500 Chinese characters where possible.
- Include terms for stars, palaces, transforms, patterns, and topics.
- Avoid chunks that contain multiple unrelated topics.
- Make `terms` strong enough for local keyword retrieval.

## Quality Checklist

Each knowledge item must answer:

- What concept does this explain?
- Which topic can use it?
- Which school does it belong to?
- What evidence or source supports it?
- What should the agent avoid overclaiming?

## MVP Corpus

Seed the knowledge base with:

- 14 major stars
- 12 palaces
- core transforms
- 10 common patterns
- topic rules for the five MVP topics
- safety notes for career, relationship, wealth, and health-adjacent prompts
