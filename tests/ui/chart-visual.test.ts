import { describe, expect, test } from "vitest";

import { activateChartVisualModel, buildChartVisualModel, chartPalaceOrder, selectActivePalaces } from "../../src/lib/ui/chart-visual";

describe("chart visual model", () => {
  test("keeps the twelve palaces in a stable disc order", () => {
    expect(chartPalaceOrder).toEqual(["命宫", "兄弟", "夫妻", "子女", "财帛", "疾厄", "迁移", "仆役", "官禄", "田宅", "福德", "父母"]);
  });

  test("builds truthful palace data from deterministic chart facts", () => {
    const model = buildChartVisualModel({
      chartId: "chart-1",
      displayName: "Jay",
      summary: {
        chartId: "chart-1",
        keyPalaces: ["官禄"],
        keyStars: ["天机"],
        keyPatterns: [],
        facts: [{ id: "fact-1", topic: "career", palace: "官禄", stars: ["天机"], transforms: ["禄"], patterns: [], rawText: "官禄宫位主星为天机。", confidence: "high" }],
      },
    });

    expect(model.palaces.find((palace) => palace.name === "官禄")).toMatchObject({ stars: ["天机"], transforms: ["禄"], active: true });
    expect(model.palaces.find((palace) => palace.name === "命宫")).toMatchObject({ stars: [], transforms: [], active: false });
  });

  test("selects only evidence-backed active palaces", () => {
    expect(selectActivePalaces(["官禄", "不存在", "官禄"])).toEqual(["官禄"]);
  });

  test("highlights only palaces used by the current evidence run", () => {
    const base = buildChartVisualModel({ chartId: "chart-1", displayName: "Jay", summary: { chartId: "chart-1", keyPalaces: [], keyStars: [], keyPatterns: [], facts: [] } });
    const next = activateChartVisualModel(base, ["官禄", "迁移"]);
    expect(next.palaces.filter((palace) => palace.active).map((palace) => palace.name)).toEqual(["迁移", "官禄"]);
  });
});
