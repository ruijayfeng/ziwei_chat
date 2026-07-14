import { beforeEach, describe, expect, test } from "vitest";

import { GET, POST, readPrimaryChartWithTimeout } from "../../src/app/api/chart/route";
import { resetChatRuntime } from "../../src/lib/agent/chat-runtime";
import type { ChartPersistence } from "../../src/lib/db/chart-persistence";

describe("POST /api/chart", () => {
  beforeEach(() => resetChatRuntime());

  test("returns a sanitized deterministic chart visual summary after saving birth data", async () => {
    const response = await POST(new Request("http://localhost/api/chart", {
      method: "POST",
      body: JSON.stringify({
        profileId: "00000000-0000-4000-8000-000000000001",
        chart: {
          profileId: "00000000-0000-4000-8000-000000000001",
          name: "Jay",
          gender: "male",
          birthDate: "1990-05-17",
          birthTime: "12:00",
          calendarType: "solar",
          isPrimary: true,
        },
      }),
    }));

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.chartId).toEqual(expect.any(String));
    expect(payload.summary.facts.length).toBeGreaterThan(0);
    expect(payload.chartJson).toBeUndefined();
  });

  test("restores a saved primary chart for the same anonymous profile", async () => {
    const profileId = "00000000-0000-4000-8000-000000000001";
    await POST(new Request("http://localhost/api/chart", {
      method: "POST",
      body: JSON.stringify({
        profileId,
        chart: {
          profileId,
          name: "Jay",
          gender: "male",
          birthDate: "1990-05-17",
          birthTime: "12:00",
          calendarType: "solar",
          isPrimary: true,
        },
      }),
    }));

    const response = await GET(new Request(`http://localhost/api/chart?profileId=${profileId}`));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      chart: {
        profileId,
        name: "Jay",
        birthDate: "1990-05-17",
        birthTime: "12:00",
      },
      summary: { facts: expect.any(Array) },
    });
  });

  test("bounds a stalled persisted chart restore", async () => {
    const stalledPersistence: ChartPersistence = {
      savePrimaryChart: async () => undefined,
      getPrimaryChart: async () => null,
      getPrimaryChartRecord: async () => new Promise(() => {}),
    };
    await expect(readPrimaryChartWithTimeout(stalledPersistence, "profile-1", 5)).rejects.toThrow("chart restore timeout");
  });
});
