/**
 * [INPUT]: Depends on DATABASE_URL, postgres, drizzle-orm, and the local schema module
 * [OUTPUT]: Provides Drizzle database client creation and a default db instance
 * [POS]: Persistence adapter shared by server-side services and route handlers
 * [PROTOCOL]: Update this header when changed, then check AGENTS.md
 */

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { schema } from "./schema";

export function createDatabaseClient(databaseUrl = process.env.DATABASE_URL) {
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required to create the database client.");
  }

  const queryClient = postgres(databaseUrl);

  return drizzle(queryClient, { schema });
}

export const db = createDatabaseClient();
