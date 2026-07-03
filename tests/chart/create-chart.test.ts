import { describe, expect, test } from "vitest";

import { createChart } from "../../src/lib/chart/create-chart";

describe("createChart", () => {
  test("creates a deterministic chart with raw chart JSON and extracted summary", () => {
    const result = createChart({
      profileId: "profile-1",
      name: "MVP fixture",
      gender: "male",
      birthDate: "1990-05-17",
      birthTime: "12:00",
      calendarType: "solar",
      isPrimary: true,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error(result.error.message);
    }

    expect(result.data.displayName).toBe("MVP fixture");
    expect(result.data.chartId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    expect(result.data.chartJson).toMatchObject({
      gender: "男",
      solarDate: "1990-5-17",
    });
    expect(result.data.summary.keyPalaces).toContain("官禄");
    expect(result.data.summary.facts.length).toBeGreaterThan(0);
  });

  test("returns a structured validation error for invalid birth date", () => {
    const result = createChart({
      profileId: "profile-1",
      name: "Bad fixture",
      gender: "female",
      birthDate: "not-a-date",
      birthTime: "12:00",
      calendarType: "solar",
      isPrimary: true,
    });

    expect(result).toEqual({
      ok: false,
      error: {
        code: "INVALID_BIRTH_DATE",
        message: "Birth date must be a valid YYYY-MM-DD date.",
        recoverable: true,
      },
    });
  });

  test("returns a structured validation error for invalid birth time", () => {
    const result = createChart({
      profileId: "profile-1",
      name: "Bad fixture",
      gender: "female",
      birthDate: "1990-05-17",
      birthTime: "25:00",
      calendarType: "solar",
      isPrimary: true,
    });

    expect(result).toEqual({
      ok: false,
      error: {
        code: "INVALID_BIRTH_TIME",
        message: "Birth time must be HH:mm or one of the 12 earthly branches.",
        recoverable: true,
      },
    });
  });
});
