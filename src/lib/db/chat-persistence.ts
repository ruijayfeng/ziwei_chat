/**
 * [INPUT]: Depends on Drizzle insert capability, chat persistence contract, and db schema tables
 * [OUTPUT]: Provides Postgres-backed ChatPersistence adapter for messages and tool events
 * [POS]: Database persistence bridge used when DATABASE_URL/Postgres is available
 * [PROTOCOL]: Update this header when changed, then check AGENTS.md
 */

import type {
  ChatPersistence,
  PersistedChatMessage,
  PersistedToolEvent,
} from "../agent/chat-persistence";
import { messages, toolEvents } from "./schema";

type InsertValues = Record<string, unknown>;

type InsertCapableDatabase = {
  insert(table: unknown): {
    values(value: InsertValues): Promise<unknown> | unknown;
  };
};

export function createPostgresChatPersistence(
  database: InsertCapableDatabase,
): ChatPersistence {
  return {
    async saveMessage(message) {
      await database.insert(messages).values(toMessageRow(message));
    },
    async saveToolEvent(event) {
      await database.insert(toolEvents).values(toToolEventRow(event));
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
