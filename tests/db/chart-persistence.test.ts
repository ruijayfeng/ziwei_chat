import { describe, expect, test } from "vitest";

import { createPostgresChartPersistence } from "../../src/lib/db/chart-persistence";

describe("createPostgresChartPersistence", () => {
  test("saves and restores the primary chart for a profile", async () => {
    const chart = {
      chartId: "00000000-0000-4000-8000-000000000001",
      displayName: "Primary chart",
      chartJson: { palaces: [] },
      summary: {
        chartId: "00000000-0000-4000-8000-000000000001",
        keyPalaces: ["官禄"],
        keyStars: ["天同"],
        keyPatterns: [],
        facts: [],
      },
    };
    const input = {
      profileId: "00000000-0000-4000-8000-000000000002",
      name: "Primary chart",
      gender: "male" as const,
      birthDate: "1990-05-17",
      birthTime: "12:00",
      calendarType: "solar" as const,
      isPrimary: true,
    };
    const rows: Array<Record<string, unknown>> = [];
    const database = {
      insert() {
        return {
          values(value: Record<string, unknown>) {
            rows.push(value);
            return { onConflictDoUpdate: async () => undefined };
          },
        };
      },
      query: {
        charts: {
          findFirst: async () => {
            const row = rows.find((value) => "chartJson" in value);
            return row
              ? {
                  id: String(row.id),
                  displayName: String(row.displayName),
                  chartJson: row.chartJson,
                  chartSummary: row.chartSummary,
                }
              : undefined;
          },
        },
      },
    };
    const persistence = createPostgresChartPersistence(database);

    await persistence.savePrimaryChart(input, chart);

    await expect(persistence.getPrimaryChart(input.profileId)).resolves.toEqual(chart);
  });
});
