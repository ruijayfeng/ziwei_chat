import { describe, expect, test } from "vitest";

import {
  chartPalaceLabels,
  formatChartProfile,
  getChartSyncLabel,
} from "../../src/lib/ui/chart-profile";
import type { CreateChartInput } from "../../src/lib/domain/chart";

const baseChart: CreateChartInput = {
  profileId: "profile-1",
  name: "我的命盘",
  gender: "female",
  birthDate: "1990-05-17",
  birthTime: "12:00",
  calendarType: "solar",
  birthPlace: "上海",
  isPrimary: true,
};

describe("chart profile UI helpers", () => {
  test("provides the stable twelve-palace index used by the chart overview", () => {
    expect(chartPalaceLabels).toEqual([
      "命宫", "兄弟", "夫妻", "子女", "财帛", "疾厄", "迁移", "仆役", "官禄", "田宅", "福德", "父母",
    ]);
  });

  test("formats an empty chart state", () => {
    expect(formatChartProfile(null)).toEqual({
      title: "尚未创建命盘",
      subtitle: "保存出生信息后，Ziwei Chat 会基于这张命盘分析。",
      details: [],
      hasChart: false,
    });
  });

  test("formats chart details into plain Chinese labels", () => {
    expect(formatChartProfile(baseChart)).toEqual({
      title: "我的命盘",
      subtitle: "1990-05-17 12:00 · 女 · 阳历",
      details: [
        { label: "出生日期", value: "1990-05-17" },
        { label: "出生时间", value: "12:00" },
        { label: "性别", value: "女" },
        { label: "历法", value: "阳历" },
        { label: "出生地", value: "上海" },
      ],
      hasChart: true,
    });
  });

  test("uses fallback copy for optional birthplace", () => {
    expect(formatChartProfile({ ...baseChart, birthPlace: "" }).details).toContainEqual({
      label: "出生地",
      value: "未填写",
    });
  });

  test("formats male and lunar labels", () => {
    expect(
      formatChartProfile({
        ...baseChart,
        gender: "male",
        calendarType: "lunar",
      }).subtitle,
    ).toBe("1990-05-17 12:00 · 男 · 农历");
  });

  test("formats chart sync state", () => {
    expect(getChartSyncLabel(false, false)).toBe("等待保存命盘");
    expect(getChartSyncLabel(false, true)).toBe("命盘已更新，下一次提问会同步");
    expect(getChartSyncLabel(true, true)).toBe("已同步到当前对话");
  });
});
