import { describe, expect, test } from "vitest";
import { isCurrentProfileOperation, type ProfileOperationToken } from "../../src/lib/ui/profile-operation";

describe("profile operation guard", () => {
  const current: ProfileOperationToken = { profileId: "profile-2", revision: 3 };

  test("accepts the current profile and revision token", () => {
    expect(isCurrentProfileOperation({ profileId: "profile-2", revision: 3 }, current)).toBe(true);
  });

  test("rejects tokens from an old profile or revision", () => {
    expect(isCurrentProfileOperation({ profileId: "profile-1", revision: 3 }, current)).toBe(false);
    expect(isCurrentProfileOperation({ profileId: "profile-2", revision: 2 }, current)).toBe(false);
  });
});
