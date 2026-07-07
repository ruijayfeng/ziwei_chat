import { getTableConfig } from "drizzle-orm/pg-core";
import { describe, expect, test } from "vitest";

import {
  charts,
  conversations,
  evalCases,
  evalRuns,
  knowledgeChunks,
  memories,
  messages,
  profiles,
  skills,
  toolEvents,
} from "../../src/lib/db/schema";

const tableNames = [
  ["profiles", profiles],
  ["charts", charts],
  ["conversations", conversations],
  ["messages", messages],
  ["memories", memories],
  ["knowledge_chunks", knowledgeChunks],
  ["skills", skills],
  ["tool_events", toolEvents],
  ["eval_cases", evalCases],
  ["eval_runs", evalRuns],
] as const;

const columnNames = (table: (typeof tableNames)[number][1]) =>
  getTableConfig(table).columns.map((column) => column.name);

const indexNames = (table: (typeof tableNames)[number][1]) =>
  getTableConfig(table).indexes.map((index) => index.config.name);

describe("database schema", () => {
  test("defines every MVP persistence table from the data model", () => {
    expect(tableNames.map(([name]) => name)).toEqual([
      "profiles",
      "charts",
      "conversations",
      "messages",
      "memories",
      "knowledge_chunks",
      "skills",
      "tool_events",
      "eval_cases",
      "eval_runs",
    ]);
  });

  test("profiles are anonymous-workspace ready", () => {
    expect(columnNames(profiles)).toEqual([
      "id",
      "display_name",
      "mode",
      "created_at",
      "updated_at",
    ]);
  });

  test("charts preserve birth input and deterministic chart outputs", () => {
    expect(columnNames(charts)).toEqual([
      "id",
      "profile_id",
      "display_name",
      "gender",
      "birth_date",
      "birth_time",
      "calendar_type",
      "birth_place",
      "chart_json",
      "chart_summary",
      "is_primary",
      "created_at",
      "updated_at",
    ]);
    expect(indexNames(charts)).toContain("charts_profile_id_idx");
    expect(indexNames(charts)).toContain("charts_profile_primary_idx");
  });

  test("agent observability and eval tables keep required audit fields", () => {
    expect(columnNames(toolEvents)).toEqual([
      "id",
      "conversation_id",
      "message_id",
      "tool_name",
      "input",
      "output",
      "success",
      "latency_ms",
      "created_at",
    ]);
    expect(columnNames(evalCases)).toContain("expected_tools");
    expect(columnNames(evalRuns)).toContain("critic_result");
  });

  test("knowledge chunks keep source attribution and vector retrieval fields", () => {
    expect(columnNames(knowledgeChunks)).toEqual([
      "id",
      "chunk_key",
      "title",
      "content",
      "topic",
      "terms",
      "source",
      "source_path",
      "source_url",
      "license",
      "school",
      "confidence",
      "embedding",
      "created_at",
      "updated_at",
    ]);
    expect(indexNames(knowledgeChunks)).toContain("knowledge_chunks_chunk_key_idx");
    expect(indexNames(knowledgeChunks)).toContain("knowledge_chunks_embedding_idx");
  });
});
