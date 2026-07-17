import { describe, expect, test } from "vitest";

import { createPostgresChartPersistence } from "../../src/lib/db/chart-persistence";
import { profileDeletions } from "../../src/lib/db/schema";

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
    const baseDatabase = {
      insert(_table?: unknown) {
        return {
          values(value: Record<string, unknown>) {
            if ("chartJson" in value) {
              const existing = rows.find((item) => "chartJson" in item);
              if (!existing) rows.push(value);
            }
            return {
              onConflictDoUpdate: async (config: { set: Record<string, unknown> }) => {
                const row = rows.find((item) => "chartJson" in item);
                if (row) Object.assign(row, config.set);
              },
            };
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
                  gender: String(row.gender),
                  birthDate: String(row.birthDate),
                  birthTime: String(row.birthTime),
                  calendarType: String(row.calendarType),
                  birthPlace: typeof row.birthPlace === "string" ? row.birthPlace : null,
                  chartJson: row.chartJson,
                  chartSummary: row.chartSummary,
                }
              : undefined;
          },
        },
      },
    };
    let activeProfileId = "";
    const originalInsert = baseDatabase.insert.bind(baseDatabase);
    const database = Object.assign(baseDatabase, {
      async transaction<T>(callback: (transaction: typeof database) => Promise<T>) {
        return callback(database);
      },
      async lockProfile(profileId: string) {
        activeProfileId = profileId;
      },
      query: {
        ...baseDatabase.query,
        profileDeletions: { async findFirst() { return activeProfileId === "deleted" ? { profileId: activeProfileId } : undefined; } },
      },
      insert(table: unknown) {
        if (table === profileDeletions) {
          return { values() { return { async onConflictDoNothing() {} }; } };
        }
        return originalInsert(table);
      },
    });
    const persistence = createPostgresChartPersistence(database);

    const replacement = {
      ...chart,
      chartId: "00000000-0000-4000-8000-000000000003",
      summary: { ...chart.summary, chartId: "00000000-0000-4000-8000-000000000003" },
    };

    await persistence.savePrimaryChart(input, chart);
    await persistence.savePrimaryChart(input, replacement);

    await expect(persistence.getPrimaryChart(input.profileId)).resolves.toEqual(replacement);
  });
});
