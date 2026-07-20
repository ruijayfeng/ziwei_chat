/**
 * [INPUT]: Depends on a transactional database client and profile deletion tombstones
 * [OUTPUT]: Provides serialized active-profile writes and tombstone-first deletion
 * [POS]: Shared privacy boundary for every Postgres write owned by an anonymous profile
 * [PROTOCOL]: Update this header when changed, then check AGENTS.md
 */

import { eq, sql } from "drizzle-orm";

import { profileDeletions } from "./schema";

type LifecycleTransaction = {
  execute?(query: unknown): Promise<unknown> | unknown;
  lockProfile?(profileId: string): Promise<void> | void;
  query: {
    profileDeletions: {
      findFirst(config?: unknown): Promise<{ profileId: string } | undefined>;
    };
  };
  insert(table: unknown): {
    values(value: Record<string, unknown>): {
      onConflictDoNothing(): Promise<unknown> | unknown;
    };
  };
};

export type ProfileLifecycleDatabase = LifecycleTransaction & {
  transaction<T>(callback: (transaction: LifecycleTransaction) => Promise<T>): Promise<T>;
};

export async function runActiveProfileTransaction(
  database: ProfileLifecycleDatabase,
  profileId: string,
  write: (transaction: LifecycleTransaction) => Promise<void>,
) {
  return database.transaction(async (transaction) => {
    await lockProfile(transaction, profileId);
    const deletion = await transaction.query.profileDeletions.findFirst({
      where: eq(profileDeletions.profileId, profileId),
      columns: { profileId: true },
    });
    if (deletion) return false;

    await write(transaction);
    return true;
  });
}

export async function runProfileDeletionTransaction(
  database: ProfileLifecycleDatabase,
  profileId: string,
  removeOwnedData: (transaction: LifecycleTransaction) => Promise<void>,
) {
  await database.transaction(async (transaction) => {
    await lockProfile(transaction, profileId);
    await transaction
      .insert(profileDeletions)
      .values({ profileId })
      .onConflictDoNothing();
    await removeOwnedData(transaction);
  });
}

async function lockProfile(transaction: LifecycleTransaction, profileId: string) {
  if (transaction.lockProfile) {
    await transaction.lockProfile(profileId);
    return;
  }
  if (!transaction.execute) throw new Error("Profile lifecycle transaction cannot acquire a lock");
  await transaction.execute(sql`select pg_advisory_xact_lock(hashtextextended(${profileId}, 0))`);
}
