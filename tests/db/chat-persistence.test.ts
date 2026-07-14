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
});
