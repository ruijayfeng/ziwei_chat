import { describe, expect, test, vi } from "vitest";

import {
  runActiveProfileTransaction,
  runProfileDeletionTransaction,
} from "../../src/lib/db/profile-lifecycle";
import { profileDeletions } from "../../src/lib/db/schema";

describe("Postgres profile lifecycle", () => {
  test("serializes writes and skips them after a profile tombstone exists", async () => {
    const state = lifecycleDatabase();
    const write = vi.fn(async () => {});

    await expect(runActiveProfileTransaction(state.database, "profile-1", write)).resolves.toBe(true);
    await runProfileDeletionTransaction(state.database, "profile-1", async () => {});
    await expect(runActiveProfileTransaction(state.database, "profile-1", write)).resolves.toBe(false);

    expect(write).toHaveBeenCalledTimes(1);
    expect(state.lockedProfiles).toEqual(["profile-1", "profile-1", "profile-1"]);
    expect(state.insertedTables).toContain(profileDeletions);
  });

  test("creates the tombstone before deleting profile-owned rows", async () => {
    const state = lifecycleDatabase();

    await runProfileDeletionTransaction(state.database, "profile-2", async () => {
      state.operations.push("delete-owned-data");
    });

    expect(state.operations).toEqual(["lock", "tombstone", "delete-owned-data"]);
  });
});

function lifecycleDatabase() {
  const deletedProfiles = new Set<string>();
  const lockedProfiles: string[] = [];
  const insertedTables: unknown[] = [];
  const operations: string[] = [];
  let activeProfileId = "";

  type FakeDatabase = {
    transaction<T>(callback: (transaction: FakeDatabase) => Promise<T>): Promise<T>;
    lockProfile(profileId: string): Promise<void>;
    query: { profileDeletions: { findFirst(): Promise<{ profileId: string } | undefined> } };
    insert(table: unknown): { values(value: { profileId: string }): { onConflictDoNothing(): Promise<void> } };
  };
  const database: FakeDatabase = {
    async transaction<T>(callback: (transaction: FakeDatabase) => Promise<T>) {
      return callback(database);
    },
    async lockProfile(profileId: string) {
      activeProfileId = profileId;
      lockedProfiles.push(profileId);
      operations.push("lock");
    },
    query: {
      profileDeletions: {
        async findFirst() {
          return deletedProfiles.has(activeProfileId) ? { profileId: activeProfileId } : undefined;
        },
      },
    },
    insert(table: unknown) {
      insertedTables.push(table);
      return {
        values(value: { profileId: string }) {
          return {
            async onConflictDoNothing() {
              deletedProfiles.add(value.profileId);
              operations.push("tombstone");
            },
          };
        },
      };
    },
  };

  return { database, insertedTables, lockedProfiles, operations };
}
