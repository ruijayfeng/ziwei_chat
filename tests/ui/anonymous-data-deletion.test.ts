import { describe, expect, test, vi } from "vitest";

import { deleteAnonymousProfileData } from "../../src/lib/ui/anonymous-data-deletion";

describe("anonymous data deletion coordinator", () => {
  test("does not run local cleanup when remote deletion fails", async () => {
    const cleanup = vi.fn();

    await expect(deleteAnonymousProfileData(
      async () => { throw new Error("remote deletion failed"); },
      cleanup,
    )).rejects.toThrow("remote deletion failed");

    expect(cleanup).not.toHaveBeenCalled();
  });

  test("runs local cleanup exactly once after remote deletion succeeds", async () => {
    const order: string[] = [];

    await deleteAnonymousProfileData(
      async () => { order.push("remote"); },
      () => { order.push("local"); },
    );

    expect(order).toEqual(["remote", "local"]);
  });

  test("allows old-profile cache cleanup inside local cleanup only after remote deletion commits", async () => {
    const order: string[] = [];

    await deleteAnonymousProfileData(
      async () => { order.push("remote"); },
      () => {
        order.push("cache");
        order.push("local");
      },
    );

    expect(order).toEqual(["remote", "cache", "local"]);
  });
});
