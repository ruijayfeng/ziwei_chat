/**
 * [INPUT]: Depends on CreateChartInput domain shape
 * [OUTPUT]: Provides chart profile labels and sync state copy for UI components
 * [POS]: UI support module consumed by chart/profile components and shell
 * [PROTOCOL]: Update this header when changed, then check AGENTS.md
 */

import type { CreateChartInput } from "../domain/chart";

export type ChartProfileDetail = {
  label: string;
  value: string;
};

export type ChartProfileView = {
  title: string;
  subtitle: string;
  details: ChartProfileDetail[];
  hasChart: boolean;
};

/** Fixed orientation labels only; star data remains server-derived chart evidence. */
export const chartPalaceLabels = [
  "命宫", "兄弟", "夫妻", "子女", "财帛", "疾厄", "迁移", "仆役", "官禄", "田宅", "福德", "父母",
] as const;

const genderLabels: Record<CreateChartInput["gender"], string> = {
  male: "男",
  female: "女",
};

const calendarLabels: Record<CreateChartInput["calendarType"], string> = {
  solar: "阳历",
  lunar: "农历",
};

export function formatChartProfile(chart: CreateChartInput | null): ChartProfileView {
  if (!chart) {
    return {
      title: "尚未创建命盘",
      subtitle: "保存出生信息后，Ziwei Chat 会基于这张命盘分析。",
      details: [],
      hasChart: false,
    };
  }

  const gender = genderLabels[chart.gender];
  const calendarType = calendarLabels[chart.calendarType];

  return {
    title: chart.name,
    subtitle: `${chart.birthDate} ${chart.birthTime} · ${gender} · ${calendarType}`,
    details: [
      { label: "出生日期", value: chart.birthDate },
      { label: "出生时间", value: chart.birthTime },
      { label: "性别", value: gender },
      { label: "历法", value: calendarType },
      { label: "出生地", value: chart.birthPlace?.trim() || "未填写" },
    ],
    hasChart: true,
  };
}

export function getChartSyncLabel(isSynced: boolean, hasChart: boolean): string {
  if (!hasChart) return "等待保存命盘";
  return isSynced ? "已同步到当前对话" : "命盘已更新，下一次提问会同步";
}
