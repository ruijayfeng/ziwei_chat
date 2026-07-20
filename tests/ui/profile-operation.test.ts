import { describe, expect, test } from "vitest";
import { isCurrentProfileOperation, type ProfileOperationToken } from "../../src/lib/ui/profile-operation";

describe("profile operation guard", () => {
  const current: ProfileOperationToken = {
    profileId: "profile-2",
    profileRevision: 3,
    chartOperationRevision: 8,
  };

  test("accepts the current save token", () => {
    expect(isCurrentProfileOperation({
      profileId: "profile-2",
      profileRevision: 3,
      chartOperationRevision: 8,
    }, current)).toBe(true);
  });

  test("rejects old profile, profile revision, and chart operation tokens", () => {
    expect(isCurrentProfileOperation({ profileId: "profile-1", profileRevision: 3, chartOperationRevision: 8 }, current)).toBe(false);
    expect(isCurrentProfileOperation({ profileId: "profile-2", profileRevision: 2, chartOperationRevision: 8 }, current)).toBe(false);
    expect(isCurrentProfileOperation({ profileId: "profile-2", profileRevision: 3, chartOperationRevision: 7 }, current)).toBe(false);
  });

  test("rejects a restore token after a save advances chart operation revision", () => {
    const restoreToken: ProfileOperationToken = {
      profileId: "profile-2",
      profileRevision: 3,
      chartOperationRevision: 8,
    };
    const saveCurrent: ProfileOperationToken = { ...current, chartOperationRevision: 9 };

    expect(isCurrentProfileOperation(restoreToken, saveCurrent)).toBe(false);
  });
});
