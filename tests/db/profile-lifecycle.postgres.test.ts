import { randomUUID } from "node:crypto";

import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, test } from "vitest";

import {
  runActiveProfileTransaction,
  runProfileDeletionTransaction,
} from "../../src/lib/db/profile-lifecycle";
import { conversations, messages, profileDeletions, profiles, schema } from "../../src/lib/db/schema";

const databaseUrl = process.env.DATABASE_URL;
const describePostgres = databaseUrl ? describe : describe.skip;

describePostgres("Postgres profile lifecycle integration", () => {
  const clients: ReturnType<typeof postgres>[] = [];
  const createdProfileIds = new Set<string>();

  function database() {
    const client = postgres(databaseUrl!, { max: 1 });
    clients.push(client);
    return drizzle(client, { schema });
  }

  beforeAll(async () => {
    const db = database();
    await db.execute("select 1 from profile_deletions limit 0");
  });

  afterAll(async () => {
    const cleanup = database();
    for (const profileId of createdProfileIds) {
      await cleanup.delete(profileDeletions).where(eq(profileDeletions.profileId, profileId));
      await cleanup.delete(profiles).where(eq(profiles.id, profileId));
    }
    await Promise.all(clients.map((client) => client.end({ timeout: 5 })));
  });

  test("deletion waits for an active write, removes it, and blocks later writes", async () => {
    const writer = database();
    const deleter = database();
    const profileId = randomUUID();
    const conversationId = randomUUID();
    createdProfileIds.add(profileId);
    const writeStarted = Promise.withResolvers<void>();
    const releaseWrite = Promise.withResolvers<void>();

    const activeWrite = runActiveProfileTransaction(writer, profileId, async (transaction) => {
      const tx = transaction as typeof writer;
      await tx.insert(profiles).values({ id: profileId }).onConflictDoNothing();
      await tx.insert(conversations).values({ id: conversationId, profileId });
      await tx.insert(messages).values({ conversationId, role: "user", content: "temporary" });
      writeStarted.resolve();
      await releaseWrite.promise;
    });
    await writeStarted.promise;

    let deletionSettled = false;
    const deletion = runProfileDeletionTransaction(deleter, profileId, async (transaction) => {
      const tx = transaction as typeof deleter;
      await tx.delete(profiles).where(eq(profiles.id, profileId));
    }).then(() => { deletionSettled = true; });
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(deletionSettled).toBe(false);

    releaseWrite.resolve();
    await Promise.all([activeWrite, deletion]);
    await expect(runActiveProfileTransaction(writer, profileId, async () => {
      throw new Error("tombstoned write callback must not run");
    })).resolves.toBe(false);

    const [profile] = await writer.select().from(profiles).where(eq(profiles.id, profileId));
    const [message] = await writer.select().from(messages).where(eq(messages.conversationId, conversationId));
    const [tombstone] = await writer.select().from(profileDeletions).where(eq(profileDeletions.profileId, profileId));
    expect(profile).toBeUndefined();
    expect(message).toBeUndefined();
    expect(tombstone?.profileId).toBe(profileId);
  }, 30_000);

  test("rolls back the tombstone and permits retry when deletion fails", async () => {
    const writer = database();
    const deleter = database();
    const profileId = randomUUID();
    const conversationId = randomUUID();
    createdProfileIds.add(profileId);
    await writer.insert(profiles).values({ id: profileId });
    await writer.insert(conversations).values({ id: conversationId, profileId });

    await expect(runProfileDeletionTransaction(deleter, profileId, async () => {
      throw new Error("forced rollback");
    })).rejects.toThrow("forced rollback");

    const [tombstone] = await writer.select().from(profileDeletions).where(eq(profileDeletions.profileId, profileId));
    expect(tombstone).toBeUndefined();
    await expect(runActiveProfileTransaction(writer, profileId, async () => {})).resolves.toBe(true);

    await runProfileDeletionTransaction(deleter, profileId, async (transaction) => {
      const tx = transaction as typeof deleter;
      await tx.delete(profiles).where(eq(profiles.id, profileId));
    });

    const [deletedProfile] = await writer.select().from(profiles).where(eq(profiles.id, profileId));
    const [deletedConversation] = await writer.select().from(conversations).where(eq(conversations.id, conversationId));
    const [committedTombstone] = await writer.select().from(profileDeletions).where(eq(profileDeletions.profileId, profileId));
    expect(deletedProfile).toBeUndefined();
    expect(deletedConversation).toBeUndefined();
    expect(committedTombstone?.profileId).toBe(profileId);
  }, 30_000);
});
