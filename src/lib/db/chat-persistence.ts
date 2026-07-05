/**
 * [INPUT]: Depends on Drizzle insert/delete capability, chat persistence contract, and db schema tables
 * [OUTPUT]: Provides Postgres-backed ChatPersistence adapter for messages, tool events, and profile data deletion
 * [POS]: Database persistence bridge used when DATABASE_URL/Postgres is available
 * [PROTOCOL]: Update this header when changed, then check AGENTS.md
 */

import { eq } from "drizzle-orm";

import type {
  ChatPersistence,
  PersistedChatMessage,
  PersistedToolEvent,
} from "../agent/chat-persistence";
import {
  charts,
  conversations,
  memories,
  messages,
  profiles,
  toolEvents,
} from "./schema";

type InsertValues = Record<string, unknown>;

type ChatPersistenceDatabase = {
  insert(table: unknown): {
    values(value: InsertValues): Promise<unknown> | InsertResult | unknown;
  };
  delete(table: unknown): {
    where(condition: unknown): Promise<unknown> | unknown;
  };
};

type InsertResult = {
  onConflictDoNothing?: () => Promise<unknown> | unknown;
};

export function createPostgresChatPersistence(
  database: ChatPersistenceDatabase,
): ChatPersistence {
  return {
    async saveMessage(message) {
      await ensureProfileConversation(database, message.profileId, message.conversationId);
      await database.insert(messages).values(toMessageRow(message));
    },
    async saveToolEvent(event) {
      if (event.profileId) {
        await ensureProfileConversation(database, event.profileId, event.conversationId);
      }
      await database.insert(toolEvents).values(toToolEventRow(event));
    },
    async deleteProfileData(profileId) {
      await database.delete(memories).where(eq(memories.profileId, profileId));
      await database.delete(charts).where(eq(charts.profileId, profileId));
      await database.delete(conversations).where(eq(conversations.profileId, profileId));
    },
  };
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
  const result = await database.insert(table).values(value);
  if (hasOnConflictDoNothing(result)) {
    await result.onConflictDoNothing();
  }
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
    input: event.input,
    output: event.output,
    success: event.success,
    latencyMs: event.latencyMs,
  };
}
