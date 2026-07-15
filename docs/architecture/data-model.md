# Data Model

> Version: 2026-07-03

## Storage Principles

- Postgres is the system of record.
- pgvector can store embeddings for curated knowledge chunks when embedding mode is enabled.
- Markdown/keyword retrieval must work when embeddings are not configured.
- Raw chart JSON is stored, but user-facing analysis uses extracted chart facts.
- Tool calls and critique results are logged for quality review.
- Profile memory must be visible and deletable.
- First-version identity is an anonymous profile/workspace, not an authenticated account.

## Tables

### profiles

Stores an anonymous profile or workspace identity. In open-source mode this is created without registration or login and can be bound to the browser through a generated profile id cookie or local storage token. A later formal product edition can map authenticated accounts to profiles without changing chart and conversation ownership semantics.

| Field | Type | Notes |
| --- | --- | --- |
| id | uuid | Primary key |
| display_name | text | Optional |
| mode | text | `anonymous`, `local`, or `authenticated` |
| created_at | timestamptz | Required |
| updated_at | timestamptz | Required |

### charts

Stores user birth charts and deterministic chart output.

| Field | Type | Notes |
| --- | --- | --- |
| id | uuid | Primary key |
| profile_id | uuid | References profiles |
| display_name | text | User-facing chart name |
| gender | text | `male` or `female` |
| birth_date | date | User-provided date |
| birth_time | text | Preserve input hour branch or time string |
| calendar_type | text | `solar` or `lunar` |
| birth_place | text | Optional |
| chart_json | jsonb | iztro output |
| chart_summary | jsonb | Extracted stable facts |
| is_primary | boolean | One primary chart per user |
| created_at | timestamptz | Required |
| updated_at | timestamptz | Required |

Indexes:

- `charts_profile_id_idx`
- partial unique index on `(profile_id)` where `is_primary = true`

### conversations

Stores chat sessions.

The read API is profile-scoped: `/api/conversations?profileId=...` lists sanitized summaries, while adding `conversationId` returns ordered sanitized messages only when that conversation belongs to the same anonymous profile. Message metadata and tool payloads are not returned by this UI endpoint.

| Field | Type | Notes |
| --- | --- | --- |
| id | uuid | Primary key |
| profile_id | uuid | References profiles |
| chart_id | uuid | Chart bound to this conversation |
| title | text | Generated from first useful user prompt |
| last_message_at | timestamptz | Sort key |
| summary | text | Rolling summary |
| created_at | timestamptz | Required |
| updated_at | timestamptz | Required |

Indexes:

- `conversations_profile_updated_idx`
- `conversations_chart_id_idx`

### messages

Stores chat messages.

| Field | Type | Notes |
| --- | --- | --- |
| id | uuid | Primary key |
| conversation_id | uuid | References conversations |
| role | text | `user`, `assistant`, `system`, or `tool` |
| content | text | Message body |
| metadata | jsonb | Intent, safety level, source references |
| created_at | timestamptz | Required |

Indexes:

- `messages_conversation_created_idx`

### memories

Stores durable user-visible memory.

| Field | Type | Notes |
| --- | --- | --- |
| id | uuid | Primary key |
| profile_id | uuid | References profiles |
| kind | text | `preference`, `recurring_topic`, `feedback` |
| value | text | Short, reviewable memory |
| source_conversation_id | uuid | Source context |
| user_visible | boolean | Always true for durable memory |
| created_at | timestamptz | Required |
| deleted_at | timestamptz | Soft delete |

Indexes:

- `memories_profile_kind_idx`

### knowledge_chunks

Stores curated knowledge text and embeddings.

| Field | Type | Notes |
| --- | --- | --- |
| id | uuid | Primary key |
| title | text | Chunk title |
| content | text | Plain text chunk |
| topic | text | Domain topic |
| terms | text[] | Stars, palaces, patterns, transforms |
| source | text | Source name |
| source_url | text | Optional |
| school | text | Interpretation school label |
| confidence | text | `high`, `medium`, or `low` |
| embedding | vector | Nullable pgvector embedding for enhanced retrieval |
| created_at | timestamptz | Required |
| updated_at | timestamptz | Required |

Indexes:

- vector similarity index on `embedding` when pgvector mode is enabled
- `knowledge_chunks_topic_idx`
- GIN index on `terms`

### skills

Stores version metadata for analysis skills.

| Field | Type | Notes |
| --- | --- | --- |
| id | text | Skill id |
| version | text | Semantic version |
| title | text | Display title |
| content_path | text | Markdown file path |
| checksum | text | Change detection |
| enabled | boolean | Runtime availability |
| updated_at | timestamptz | Required |

### tool_events

Records agent tool execution.

| Field | Type | Notes |
| --- | --- | --- |
| id | uuid | Primary key |
| conversation_id | uuid | References conversations |
| message_id | uuid | References messages when available |
| tool_name | text | Tool id |
| input | jsonb | Redacted input |
| output | jsonb | Redacted output |
| success | boolean | Required |
| latency_ms | integer | Required |
| created_at | timestamptz | Required |

Indexes:

- `tool_events_conversation_idx`
- `tool_events_tool_name_idx`

### eval_cases

Stores regression prompts and expected properties.

| Field | Type | Notes |
| --- | --- | --- |
| id | uuid | Primary key |
| name | text | Case name |
| topic | text | Intent or product area |
| chart_fixture | jsonb | Stable chart fixture |
| user_prompt | text | Prompt under test |
| expected_tools | text[] | Required tool calls |
| expected_facts | text[] | Required fact ids or terms |
| forbidden_claims | text[] | Claims that must not appear |
| created_at | timestamptz | Required |

### eval_runs

Stores evaluation run results.

| Field | Type | Notes |
| --- | --- | --- |
| id | uuid | Primary key |
| case_id | uuid | References eval_cases |
| model | text | Model id |
| response | text | Generated answer |
| tool_events | jsonb | Tools called |
| critic_result | jsonb | Critique output |
| passed | boolean | Required |
| created_at | timestamptz | Required |

## Privacy Requirements

- Profiles can delete charts, conversations, and memories.
- Deleting a chart should prevent future use of its chart facts.
- Evaluation fixtures must not use private production user data without explicit anonymization.
- Tool event logs should redact raw birth data when not required for debugging.
