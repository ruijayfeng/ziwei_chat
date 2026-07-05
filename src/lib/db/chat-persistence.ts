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
import { charts, conversations, memories, messages, toolEvents } from "./schema";

type InsertValues = Record<string, unknown>;

type ChatPersistenceDatabase = {
  insert(table: unknown): {
    values(value: InsertValues): Promise<unknown> | unknown;
  };
  delete(table: unknown): {
    where(condition: unknown): Promise<unknown> | unknown;
  };
};

export function createPostgresChatPersistence(
  database: ChatPersistenceDatabase,
): ChatPersistence {
  return {
    async saveMessage(message) {
      await database.insert(messages).values(toMessageRow(message));
    },
    async saveToolEvent(event) {
      await database.insert(toolEvents).values(toToolEventRow(event));
    },
    async deleteProfileData(profileId) {
      await database.delete(memories).where(eq(memories.profileId, profileId));
      await database.delete(charts).where(eq(charts.profileId, profileId));
      await database.delete(conversations).where(eq(conversations.profileId, profileId));
    },
  };
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
