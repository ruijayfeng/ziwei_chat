/**
 * [INPUT]: Depends on chart domain contracts and Drizzle chart/profile tables
 * [OUTPUT]: Provides primary-chart persistence and restoration for a profile
 * [POS]: Postgres boundary used by chart tools when DATABASE_URL is configured
 * [PROTOCOL]: Update this header when changed, then check AGENTS.md
 */

import type { CreateChartInput, CreateChartOutput } from "../domain/chart";
import { and, eq } from "drizzle-orm";
import { charts, profiles } from "./schema";

type InsertValues = Record<string, unknown>;

type ChartPersistenceDatabase = {
  insert(table: unknown): {
    values(value: InsertValues): {
      onConflictDoNothing?: () => Promise<unknown> | unknown;
      onConflictDoUpdate: CallableFunction;
    };
  };
  query: {
    charts: {
      findFirst(config: unknown): Promise<StoredChartRow | undefined>;
    };
  };
};

type StoredChartRow = {
  id: string;
  displayName: string;
  chartJson: unknown;
  chartSummary: unknown;
};

export type ChartPersistence = {
  savePrimaryChart(input: CreateChartInput, chart: CreateChartOutput): Promise<void>;
  getPrimaryChart(profileId: string): Promise<CreateChartOutput | null>;
};

export function createPostgresChartPersistence(database: ChartPersistenceDatabase): ChartPersistence {
  return {
    async savePrimaryChart(input, chart) {
      const profileInsert = database.insert(profiles).values({ id: input.profileId });
      await profileInsert.onConflictDoNothing?.();

      const chartInsert = database.insert(charts).values({
        id: chart.chartId,
        profileId: input.profileId,
        displayName: chart.displayName,
        gender: input.gender,
        birthDate: input.birthDate,
        birthTime: input.birthTime,
        calendarType: input.calendarType,
        birthPlace: input.birthPlace,
        chartJson: chart.chartJson,
        chartSummary: chart.summary,
        isPrimary: input.isPrimary,
      });
      await chartInsert.onConflictDoUpdate({
        target: charts.profileId,
        targetWhere: eq(charts.isPrimary, true),
        set: {
          displayName: chart.displayName,
          gender: input.gender,
          birthDate: input.birthDate,
          birthTime: input.birthTime,
          calendarType: input.calendarType,
          birthPlace: input.birthPlace,
          chartJson: chart.chartJson,
          chartSummary: chart.summary,
          isPrimary: input.isPrimary,
        },
      });
    },

    async getPrimaryChart(profileId) {
      const row = await database.query.charts.findFirst({
        where: and(eq(charts.profileId, profileId), eq(charts.isPrimary, true)),
      });
      if (!row) return null;

      return {
        chartId: row.id,
        displayName: row.displayName,
        chartJson: row.chartJson,
        summary: row.chartSummary as CreateChartOutput["summary"],
      };
    },
  };
}
