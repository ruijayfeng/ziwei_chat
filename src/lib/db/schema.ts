/**
 * [INPUT]: Depends on drizzle-orm pg-core schema builders
 * [OUTPUT]: Provides Postgres table definitions for anonymous profiles, charts, conversations, memory, knowledge, tools, and evals
 * [POS]: Database contract layer used by persistence services and migrations
 * [PROTOCOL]: Update this header when changed, then check AGENTS.md
 */

import { sql } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  vector,
} from "drizzle-orm/pg-core";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
};

export const profiles = pgTable("profiles", {
  id: uuid("id").defaultRandom().primaryKey(),
  displayName: text("display_name"),
  mode: text("mode").notNull().default("anonymous"),
  ...timestamps,
});

export const profileDeletions = pgTable("profile_deletions", {
  profileId: uuid("profile_id").primaryKey(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }).notNull().defaultNow(),
});

export const charts = pgTable(
  "charts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    displayName: text("display_name").notNull(),
    gender: text("gender").notNull(),
    birthDate: date("birth_date").notNull(),
    birthTime: text("birth_time").notNull(),
    calendarType: text("calendar_type").notNull(),
    birthPlace: text("birth_place"),
    chartJson: jsonb("chart_json").notNull(),
    chartSummary: jsonb("chart_summary").notNull(),
    isPrimary: boolean("is_primary").notNull().default(false),
    ...timestamps,
  },
  (table) => [
    index("charts_profile_id_idx").on(table.profileId),
    uniqueIndex("charts_profile_primary_idx")
      .on(table.profileId)
      .where(sql`${table.isPrimary} = true`),
  ],
);

export const conversations = pgTable(
  "conversations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    chartId: uuid("chart_id").references(() => charts.id, { onDelete: "set null" }),
    title: text("title"),
    lastMessageAt: timestamp("last_message_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    summary: text("summary"),
    ...timestamps,
  },
  (table) => [
    index("conversations_profile_updated_idx").on(table.profileId, table.updatedAt),
    index("conversations_chart_id_idx").on(table.chartId),
  ],
);

export const messages = pgTable(
  "messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    role: text("role").notNull(),
    content: text("content").notNull(),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("messages_conversation_created_idx").on(
      table.conversationId,
      table.createdAt,
    ),
  ],
);

export const memories = pgTable(
  "memories",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    value: text("value").notNull(),
    sourceConversationId: uuid("source_conversation_id").references(
      () => conversations.id,
      { onDelete: "set null" },
    ),
    userVisible: boolean("user_visible").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [index("memories_profile_kind_idx").on(table.profileId, table.kind)],
);

export const knowledgeChunks = pgTable(
  "knowledge_chunks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    chunkKey: text("chunk_key").notNull(),
    title: text("title").notNull(),
    content: text("content").notNull(),
    topic: text("topic").notNull(),
    terms: text("terms").array().notNull(),
    source: text("source").notNull(),
    sourcePath: text("source_path"),
    sourceUrl: text("source_url"),
    license: text("license"),
    school: text("school").notNull().default("default"),
    confidence: text("confidence").notNull(),
    embedding: vector("embedding", { dimensions: 1024 }),
    ...timestamps,
  },
  (table) => [
    index("knowledge_chunks_topic_idx").on(table.topic),
    index("knowledge_chunks_terms_idx").using("gin", table.terms),
    uniqueIndex("knowledge_chunks_chunk_key_idx").on(table.chunkKey),
    index("knowledge_chunks_embedding_idx").using(
      "hnsw",
      table.embedding.op("vector_cosine_ops"),
    ),
  ],
);

export const skills = pgTable("skills", {
  id: text("id").primaryKey(),
  version: text("version").notNull(),
  title: text("title").notNull(),
  contentPath: text("content_path").notNull(),
  checksum: text("checksum").notNull(),
  enabled: boolean("enabled").notNull().default(true),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const toolEvents = pgTable(
  "tool_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    messageId: uuid("message_id").references(() => messages.id, {
      onDelete: "set null",
    }),
    toolName: text("tool_name").notNull(),
    input: jsonb("input").notNull(),
    output: jsonb("output").notNull(),
    success: boolean("success").notNull(),
    latencyMs: integer("latency_ms").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("tool_events_conversation_idx").on(table.conversationId),
    index("tool_events_tool_name_idx").on(table.toolName),
  ],
);

export const evalCases = pgTable("eval_cases", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  topic: text("topic").notNull(),
  chartFixture: jsonb("chart_fixture"),
  userPrompt: text("user_prompt").notNull(),
  expectedTools: text("expected_tools").array().notNull(),
  expectedFacts: text("expected_facts").array().notNull(),
  forbiddenClaims: text("forbidden_claims").array().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const evalRuns = pgTable("eval_runs", {
  id: uuid("id").defaultRandom().primaryKey(),
  caseId: uuid("case_id")
    .notNull()
    .references(() => evalCases.id, { onDelete: "cascade" }),
  model: text("model").notNull(),
  response: text("response").notNull(),
  toolEvents: jsonb("tool_events").notNull(),
  criticResult: jsonb("critic_result").notNull(),
  passed: boolean("passed").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const schema = {
  profiles,
  profileDeletions,
  charts,
  conversations,
  messages,
  memories,
  knowledgeChunks,
  skills,
  toolEvents,
  evalCases,
  evalRuns,
};
