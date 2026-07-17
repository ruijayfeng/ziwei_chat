/**
 * [INPUT]: Depends on Drizzle insert/delete capability, chat persistence contract, and db schema tables
 * [OUTPUT]: Provides Postgres-backed ChatPersistence adapter for messages, tool events, and profile data deletion
 * [POS]: Database persistence bridge used when DATABASE_URL/Postgres is available
 * [PROTOCOL]: Update this header when changed, then check AGENTS.md
 */

import { and, asc, desc, eq, sql } from "drizzle-orm";

import type {
  ChatPersistence,
  ConversationMessageRecord,
  ConversationRecord,
  PersistedChatMessage,
  PersistedToolEvent,
} from "../agent/chat-persistence";
import {
  conversations,
  messages,
  profiles,
  toolEvents,
} from "./schema";
import {
  runActiveProfileTransaction,
  runProfileDeletionTransaction,
  type ProfileLifecycleDatabase,
} from "./profile-lifecycle";

type InsertValues = Record<string, unknown>;

type ChatPersistenceDatabase = {
  insert(table: unknown): {
    values(value: InsertValues): Promise<unknown> | InsertResult | unknown;
  };
  delete(table: unknown): {
    where(condition: unknown): Promise<unknown> | unknown;
  };
  update?(table: unknown): {
    set(value: InsertValues): { where(condition: unknown): Promise<unknown> | unknown };
  };
};

type ReadQuery = {
  from(table: unknown): ReadQuery;
  innerJoin(table: unknown, condition: unknown): ReadQuery;
  where(condition: unknown): ReadQuery;
  orderBy(order: unknown): Promise<Array<Record<string, unknown>>>;
};

type ReadDatabase = {
  select(fields: Record<string, unknown>): ReadQuery;
};

type InsertResult = {
  onConflictDoNothing?: () => Promise<unknown> | unknown;
};

export function createPostgresChatPersistence(
  database: ChatPersistenceDatabase,
): ChatPersistence {
  return {
    async saveMessage(message) {
      await runActiveProfileTransaction(
        database as unknown as ProfileLifecycleDatabase,
        message.profileId,
        async (transaction) => {
          const writable = transaction as unknown as ChatPersistenceDatabase;
          await ensureProfileConversation(writable, message.profileId, message.conversationId);
          await writable.insert(messages).values(toMessageRow(message));
          await touchConversation(writable, message);
        },
      );
    },
    async saveToolEvent(event) {
      if (!event.profileId) {
        await database.insert(toolEvents).values(toToolEventRow(event));
        return;
      }
      await runActiveProfileTransaction(
        database as unknown as ProfileLifecycleDatabase,
        event.profileId,
        async (transaction) => {
          const writable = transaction as unknown as ChatPersistenceDatabase;
          await ensureProfileConversation(writable, event.profileId!, event.conversationId);
          await writable.insert(toolEvents).values(toToolEventRow(event));
        },
      );
    },
    async listConversations(profileId) {
      const readable = database as unknown as ReadDatabase;
      const rows = await readable
        .select({ id: conversations.id, title: conversations.title, lastMessageAt: conversations.lastMessageAt })
        .from(conversations)
        .where(eq(conversations.profileId, profileId))
        .orderBy(desc(conversations.lastMessageAt));
      return rows.map(toConversationRecord).filter(isConversationRecord);
    },
    async listMessages(profileId, conversationId) {
      const readable = database as unknown as ReadDatabase;
      const rows = await readable
        .select({
          id: messages.id,
          conversationId: messages.conversationId,
          role: messages.role,
          content: messages.content,
          createdAt: messages.createdAt,
        })
        .from(messages)
        .innerJoin(conversations, eq(messages.conversationId, conversations.id))
        .where(and(eq(conversations.profileId, profileId), eq(conversations.id, conversationId)))
        .orderBy(asc(messages.createdAt));
      return rows.map(toConversationMessageRecord).filter(isConversationMessageRecord);
    },
    async deleteProfileData(profileId) {
      await runProfileDeletionTransaction(
        database as unknown as ProfileLifecycleDatabase,
        profileId,
        async (transaction) => {
          const writable = transaction as unknown as ChatPersistenceDatabase;
          await writable.delete(profiles).where(eq(profiles.id, profileId));
        },
      );
    },
  };
}

async function touchConversation(database: ChatPersistenceDatabase, message: PersistedChatMessage) {
  if (!database.update) return;
  const values: InsertValues = { lastMessageAt: new Date(), updatedAt: new Date() };
  if (message.role === "user") {
    values.title = sql`coalesce(${conversations.title}, ${message.content.slice(0, 60)})`;
  }
  await database.update(conversations).set(values).where(eq(conversations.id, message.conversationId));
}

async function ensureProfileConversation(
  database: ChatPersistenceDatabase,
  profileId: string,
  conversationId: string,
) {
  await insertIgnoringConflict(database, profiles, { id: profileId });
  await insertIgnoringConflict(database, conversations, {
    id: conversationId,
    profileId,
  });
}

async function insertIgnoringConflict(
  database: ChatPersistenceDatabase,
  table: unknown,
  value: InsertValues,
) {
  const result = database.insert(table).values(value);
  if (hasOnConflictDoNothing(result)) {
    await result.onConflictDoNothing();
    return;
  }

  await result;
}

function hasOnConflictDoNothing(value: unknown): value is Required<InsertResult> {
  return (
    typeof value === "object" &&
    value !== null &&
    "onConflictDoNothing" in value &&
    typeof value.onConflictDoNothing === "function"
  );
}

function toMessageRow(message: PersistedChatMessage) {
  return {
    conversationId: message.conversationId,
    role: message.role,
    content: message.content,
    metadata: message.metadata,
  };
}

function toToolEventRow(event: PersistedToolEvent) {
  return {
    conversationId: event.conversationId,
    messageId: event.messageId,
    toolName: event.toolName,
    input: event.input ?? null,
    output: event.output ?? null,
    success: event.success,
    latencyMs: event.latencyMs,
  };
}

function toConversationRecord(row: Record<string, unknown>): ConversationRecord | null {
  if (typeof row.id !== "string") return null;
  return {
    id: row.id,
    title: typeof row.title === "string" && row.title.trim() ? row.title : "未命名对话",
    lastMessageAt: toIsoString(row.lastMessageAt),
  };
}

function toConversationMessageRecord(row: Record<string, unknown>): ConversationMessageRecord | null {
  if (
    typeof row.id !== "string" ||
    typeof row.conversationId !== "string" ||
    !isMessageRole(row.role) ||
    typeof row.content !== "string"
  ) return null;
  return {
    id: row.id,
    conversationId: row.conversationId,
    role: row.role,
    content: row.content,
    createdAt: toIsoString(row.createdAt),
  };
}

function toIsoString(value: unknown) {
  return value instanceof Date ? value.toISOString() : typeof value === "string" ? value : "";
}

function isMessageRole(value: unknown): value is PersistedChatMessage["role"] {
  return value === "user" || value === "assistant" || value === "system" || value === "tool";
}

function isConversationRecord(value: ConversationRecord | null): value is ConversationRecord { return value !== null; }
function isConversationMessageRecord(value: ConversationMessageRecord | null): value is ConversationMessageRecord { return value !== null; }
