/**
 * [INPUT]: Depends on iztro chart generation and summarize-chart fact extraction
 * [OUTPUT]: Provides deterministic chart creation with structured validation errors
 * [POS]: Chart engine adapter that prevents the LLM from calculating chart positions
 * [PROTOCOL]: Update this header when changed, then check AGENTS.md
 */

import { randomUUID } from "node:crypto";

import { astro } from "iztro";

import type {
  ChartServiceResult,
  CreateChartInput,
  CreateChartOutput,
} from "@/lib/domain/chart";
import { summarizeChart } from "./summarize-chart";

const earthlyBranchTimeIndex: Record<string, number> = {
  子: 0,
  丑: 1,
  寅: 2,
  卯: 3,
  辰: 4,
  巳: 5,
  午: 6,
  未: 7,
  申: 8,
  酉: 9,
  戌: 10,
  亥: 11,
  早子: 0,
  晚子: 12,
};

export function createChart(
  input: CreateChartInput,
): ChartServiceResult<CreateChartOutput> {
  const birthDate = normalizeBirthDate(input.birthDate);
  if (!birthDate) {
    return {
      ok: false,
      error: {
        code: "INVALID_BIRTH_DATE",
        message: "Birth date must be a valid YYYY-MM-DD date.",
        recoverable: true,
      },
    };
  }

  const timeIndex = toTimeIndex(input.birthTime);
  if (timeIndex === null) {
    return {
      ok: false,
      error: {
        code: "INVALID_BIRTH_TIME",
        message: "Birth time must be HH:mm or one of the 12 earthly branches.",
        recoverable: true,
      },
    };
  }

  try {
    const chartId = randomUUID();
    const gender = input.gender === "male" ? "male" : "female";
    const chartJson =
      input.calendarType === "solar"
        ? astro.bySolar(birthDate, timeIndex, gender, true, "zh-CN")
        : astro.byLunar(birthDate, timeIndex, gender, false, true, "zh-CN");
    const summary = summarizeChart({
      chartId,
      chartJson,
      topics: ["career", "relationship", "wealth", "personality", "recent_fortune"],
    });

    return {
      ok: true,
      data: {
        chartId,
        displayName: input.name,
        chartJson,
        summary,
      },
    };
  } catch (error) {
    return {
      ok: false,
      error: {
        code: "CHART_ENGINE_FAILED",
        message:
          error instanceof Error
            ? error.message
            : "The chart engine failed to create a chart.",
        recoverable: true,
      },
    };
  }
}

function normalizeBirthDate(birthDate: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthDate);
  if (!match) {
    return null;
  }

  const [, year, month, day] = match;
  const parsed = new Date(`${birthDate}T00:00:00.000Z`);
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.getUTCFullYear() !== Number(year) ||
    parsed.getUTCMonth() + 1 !== Number(month) ||
    parsed.getUTCDate() !== Number(day)
  ) {
    return null;
  }

  return `${Number(year)}-${Number(month)}-${Number(day)}`;
}

function toTimeIndex(birthTime: string) {
  const branchIndex = earthlyBranchTimeIndex[birthTime.replace(/时$/, "")];
  if (branchIndex !== undefined) {
    return branchIndex;
  }

  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(birthTime);
  if (!match) {
    return null;
  }

  const hour = Number(match[1]);

  if (hour === 23) {
    return 12;
  }

  return Math.floor((hour + 1) / 2);
}
