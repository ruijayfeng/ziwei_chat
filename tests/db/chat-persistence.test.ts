import { describe, expect, test } from "vitest";

import {
  charts,
  conversations,
  memories,
  messages,
  toolEvents,
} from "../../src/lib/db/schema";
import { createPostgresChatPersistence } from "../../src/lib/db/chat-persistence";

describe("createPostgresChatPersistence", () => {
  test("maps chat persistence writes to messages and tool_events tables", async () => {
    const writes: Array<{ table: unknown; value: Record<string, unknown> }> = [];
    const ignoredConflicts: unknown[] = [];
    const database = {
      insert(table: unknown) {
        return {
          values(value: Record<string, unknown>) {
            writes.push({ table, value });
            return {
              async onConflictDoNothing() {
                ignoredConflicts.push(table);
              },
            };
          },
        };
      },
      delete() {
        return {
          async where() {},
        };
      },
    };
    const persistence = createPostgresChatPersistence(database);

    await persistence.saveMessage({
      conversationId: "00000000-0000-4000-8000-000000000001",
      profileId: "00000000-0000-4000-8000-000000000002",
      role: "assistant",
      content: "结论：可以看。",
      metadata: { intent: "career" },
    });
    await persistence.saveToolEvent({
      conversationId: "00000000-0000-4000-8000-000000000001",
      toolName: "runResponseCritic",
      input: { intent: "career" },
      output: { passed: true },
      success: true,
      latencyMs: 3,
    });

    expect(writes).toEqual([
      {
        table: expect.anything(),
        value: {
          id: "00000000-0000-4000-8000-000000000002",
        },
      },
      {
        table: conversations,
        value: {
          id: "00000000-0000-4000-8000-000000000001",
          profileId: "00000000-0000-4000-8000-000000000002",
        },
      },
      {
        table: messages,
        value: {
          conversationId: "00000000-0000-4000-8000-000000000001",
          role: "assistant",
          content: "结论：可以看。",
          metadata: { intent: "career" },
        },
      },
      {
        table: toolEvents,
        value: {
          conversationId: "00000000-0000-4000-8000-000000000001",
          messageId: undefined,
          toolName: "runResponseCritic",
          input: { intent: "career" },
          output: { passed: true },
          success: true,
          latencyMs: 3,
        },
      },
    ]);
    expect(ignoredConflicts).toHaveLength(2);
  });

  test("deletes profile-owned memories, charts, and conversations through the database adapter", async () => {
    const deletedTables: unknown[] = [];
    const database = {
      insert() {
        return {
          async values() {},
        };
      },
      delete(table: unknown) {
        deletedTables.push(table);
        return {
          async where() {},
        };
      },
    };
    const persistence = createPostgresChatPersistence(database);

    await persistence.deleteProfileData?.("00000000-0000-4000-8000-000000000002");

    expect(deletedTables).toEqual([memories, charts, conversations]);
  });

  test("maps undefined tool event JSON values to database nulls", async () => {
    const writes: Array<{ table: unknown; value: Record<string, unknown> }> = [];
    const database = {
      insert(table: unknown) {
        return {
          values(value: Record<string, unknown>) {
            writes.push({ table, value });
            return {};
          },
        };
      },
      delete() {
        return {
          async where() {},
        };
      },
    };
    const persistence = createPostgresChatPersistence(database);

    await persistence.saveToolEvent({
      conversationId: "00000000-0000-4000-8000-000000000001",
      toolName: "loadSkill",
      input: undefined,
      output: undefined,
      success: false,
      latencyMs: 0,
    });

    expect(writes).toContainEqual({
      table: toolEvents,
      value: expect.objectContaining({
        input: null,
        output: null,
      }),
    });
  });

  test("maps profile-scoped conversation and message reads to sanitized records", async () => {
    const rows = [
      [{ id: "conversation-1", title: "事业问题", lastMessageAt: new Date("2026-07-16T00:00:00Z") }],
      [{ id: "message-1", conversationId: "conversation-1", role: "user", content: "事业问题", createdAt: new Date("2026-07-16T00:00:00Z") }],
    ];
    const database = readDatabase(rows);
    const persistence = createPostgresChatPersistence(database);

    await expect(persistence.listConversations?.("00000000-0000-4000-8000-000000000002")).resolves.toEqual([
      { id: "conversation-1", title: "事业问题", lastMessageAt: "2026-07-16T00:00:00.000Z" },
    ]);
    await expect(persistence.listMessages?.(
      "00000000-0000-4000-8000-000000000002",
      "00000000-0000-4000-8000-000000000001",
    )).resolves.toEqual([
      { id: "message-1", conversationId: "conversation-1", role: "user", content: "事业问题", createdAt: "2026-07-16T00:00:00.000Z" },
    ]);
  });
});

function readDatabase(resultSets: Array<Array<Record<string, unknown>>>) {
  let index = 0;
  return {
    insert() { return { async values() {} }; },
    update() { return { set() { return { async where() {} }; } }; },
    delete() { return { async where() {} }; },
    select() {
      const result = resultSets[index++] ?? [];
      const query = {
        from() { return query; },
        innerJoin() { return query; },
        where() { return query; },
        orderBy() { return Promise.resolve(result); },
      };
      return query;
    },
  };
}
