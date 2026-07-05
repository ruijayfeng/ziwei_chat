import { describe, expect, test, vi } from "vitest";

describe("database client", () => {
  test("does not create a Postgres connection at module import time", async () => {
    vi.stubEnv("DATABASE_URL", "");

    await expect(import("../../src/lib/db/client")).resolves.toHaveProperty(
      "createDatabaseClient",
    );
  });
});
