import { describe, expect, test } from "vitest";

import { runResponseCritic } from "../../src/lib/agent/critic";

const chartFact = {
  id: "chart-1:career:官禄",
  topic: "career",
  palace: "官禄",
  stars: ["天同"],
  transforms: ["忌"],
  patterns: [],
  rawText: "官禄宫位主星为 天同，四化为 忌。",
  confidence: "high" as const,
};

describe("runResponseCritic", () => {
  test("accepts a grounded model answer with a full-width Chinese follow-up question mark", () => {
    const result = runResponseCritic({
      intent: "career",
      draft:
        "结论：考研这件事更适合当成一段需要稳定投入的长期选择来看。\n\n命盘依据：\n- 工具已经提供事业判断基础。\n\n现实解释：这不是直接断定一定能不能上岸，而是看学习节奏、压力承受和阶段投入是否匹配。\n\n建议：先用两周做一次真题和复习时间评估，再决定是否投入完整周期。\n\n追问：你现在更担心的是考试结果，还是备考过程能不能坚持？",
      toolsUsed: ["getCurrentChart", "summarizeChartFacts"],
      chartFacts: [chartFact],
      knowledgeSources: [],
      safetyLevel: "caution",
    });

    expect(result).toEqual({
      passed: true,
      issues: [],
      requiredRevision: false,
    });
  });

  test("passes a grounded serious answer with exactly one follow-up question", () => {
    const result = runResponseCritic({
      intent: "career",
      draft:
        "结论：最近更适合先观察机会。\n\n命盘依据：官禄宫有天同化忌。\n\n现实解释：这更像工作节奏需要调整。\n\n建议：先用两周整理选择。\n\n追问：你现在更想换环境，还是换岗位？",
      toolsUsed: ["getCurrentChart", "summarizeChartFacts"],
      chartFacts: [chartFact],
      knowledgeSources: [],
      safetyLevel: "caution",
    });

    expect(result).toEqual({
      passed: true,
      issues: [],
      requiredRevision: false,
    });
  });

  test("fails serious answers that lack chart facts or use absolute claims", () => {
    const result = runResponseCritic({
      intent: "wealth",
      draft: "你一定会发财。要不要现在买入？",
      toolsUsed: [],
      chartFacts: [],
      knowledgeSources: [],
      safetyLevel: "caution",
    });

    expect(result.passed).toBe(false);
    expect(result.requiredRevision).toBe(true);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        "Serious Ziwei analysis must include chart facts.",
        "Response contains overconfident language.",
      ]),
    );
  });

  test("fails answers that fabricate palaces or stars not returned by tools", () => {
    const result = runResponseCritic({
      intent: "career",
      draft:
        "结论：先观察机会。\n\n命盘依据：\n- 官禄宫有天同，也可以看出迁移宫有紫微。\n\n现实解释：这只是倾向。\n\n建议：先整理选择。\n\n追问：你现在更想换环境还是换内容？",
      toolsUsed: ["getCurrentChart", "summarizeChartFacts"],
      chartFacts: [
        {
          ...chartFact,
          palace: "官禄",
          stars: ["天同"],
          rawText: "官禄宫主星为天同。",
        },
      ],
      knowledgeSources: [],
      safetyLevel: "caution",
    });

    expect(result.passed).toBe(false);
    expect(result.issues).toContain("Response mentions chart facts that tools did not return.");
  });

  test("limits the chart-fact whitelist to a markdown chart-basis section", () => {
    const result = runResponseCritic({
      intent: "career",
      draft: [
        "## \u7ed3\u8bba",
        "\u5148\u89c2\u5bdf\u673a\u4f1a\u3002",
        "",
        "## \u547d\u76d8\u4f9d\u636e",
        "- \u5b98\u7984\u5bab\u6709\u5929\u540c\u3002",
        "",
        "## \u73b0\u5b9e\u5c42\u9762\u7684\u89e3\u91ca",
        "\u7d2b\u5fae\u3001\u5929\u673a\u7b49\u672f\u8bed\u53ea\u662f\u4e00\u822c\u77e5\u8bc6\u793a\u4f8b\uff0c\u4e0d\u662f\u4f60\u7684\u547d\u76d8\u4e8b\u5b9e\u3002",
        "",
        "## \u5efa\u8bae",
        "\u5148\u6574\u7406\u73b0\u5b9e\u9009\u9879\u3002",
        "",
        "## \u8ffd\u95ee",
        "\u4f60\u73b0\u5728\u66f4\u60f3\u6362\u73af\u5883\uff0c\u8fd8\u662f\u6362\u5185\u5bb9\uff1f",
      ].join("\n"),
      toolsUsed: ["getCurrentChart", "summarizeChartFacts"],
      chartFacts: [
        {
          ...chartFact,
          palace: "\u5b98\u7984",
          stars: ["\u5929\u540c"],
          rawText: "\u5b98\u7984\u5bab\u4e3b\u661f\u4e3a\u5929\u540c\u3002",
        },
      ],
      knowledgeSources: [],
      safetyLevel: "caution",
    });

    expect(result).toEqual({
      passed: true,
      issues: [],
      requiredRevision: false,
    });
  });

  test.each([
    ["Chinese numeral", "三、现实层面的解释"],
    ["Arabic numeral", "3. 现实层面的解释"],
    ["parenthesized numeral", "（三）现实层面的解释"],
    ["bullet", "- 现实层面的解释"],
  ])("stops the chart-basis section at a %s heading", (_label, explanationHeading) => {
    const result = runResponseCritic({
      intent: "career",
      draft: [
        "结论：先观察机会。",
        "",
        "命盘依据：",
        "- 官禄宫有天同。",
        "",
        explanationHeading,
        "紫微、天机等术语只是一般知识示例，不是你的命盘事实。",
        "",
        "建议：先整理现实选项。",
        "",
        "追问：你现在更想换环境，还是换内容？",
      ].join("\n"),
      toolsUsed: ["getCurrentChart", "summarizeChartFacts"],
      chartFacts: [
        {
          ...chartFact,
          palace: "官禄",
          stars: ["天同"],
          rawText: "官禄宫主星为天同。",
        },
      ],
      knowledgeSources: [],
      safetyLevel: "caution",
    });

    expect(result).toEqual({
      passed: true,
      issues: [],
      requiredRevision: false,
    });
  });

  test("fails dangerous advice and missing follow-up questions", () => {
    const result = runResponseCritic({
      intent: "wealth",
      draft:
        "结论：财运很好。\n\n命盘依据：财帛宫有依据。\n\n现实解释：这是倾向。\n\n建议：现在买入并加杠杆。",
      toolsUsed: ["getCurrentChart", "summarizeChartFacts"],
      chartFacts: [
        {
          ...chartFact,
          topic: "wealth",
          palace: "财帛",
          stars: ["武曲"],
          rawText: "财帛宫主星为武曲。",
        },
      ],
      knowledgeSources: [],
      safetyLevel: "caution",
    });

    expect(result.passed).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        "Response contains prohibited high-stakes advice.",
        "Response must include exactly one useful follow-up question.",
      ]),
    );
  });

  test("allows general doctrine and interpretive extensions without blocking", () => {
    const result = runResponseCritic({
      intent: "career",
      draft: "结论：可以先观察工作节奏。\n\n命盘依据：官禄宫有天同。\n\n现实解释：迁移宫通常也可以作为后续观察方向，巨门也常被用来解释辨析与表达。\n\n建议：记录两周沟通中的反应。\n\n追问：你最近更想改善表达还是工作节奏？",
      toolsUsed: ["getCurrentChart", "summarizeChartFacts"],
      chartFacts: [{ ...chartFact, palace: "官禄", stars: ["天同"] }],
      knowledgeSources: [],
      safetyLevel: "caution",
    });

    expect(result.passed).toBe(true);
    expect(result.requiredRevision).toBe(false);
    expect(result.structuredIssues?.every((issue) => issue.severity === "warning") ?? true).toBe(true);
  });

  test("blocks a current-chart assertion absent from deterministic facts", () => {
    const result = runResponseCritic({
      intent: "career",
      draft: "结论：先观察机会。\n\n命盘依据：你的迁移宫有紫微。\n\n现实解释：这代表外部变化。\n\n建议：先整理选择。\n\n追问：你更想换环境还是换内容？",
      toolsUsed: ["getCurrentChart", "summarizeChartFacts"],
      chartFacts: [{ ...chartFact, palace: "官禄", stars: ["天同"] }],
      knowledgeSources: [],
      safetyLevel: "caution",
    });

    expect(result.passed).toBe(false);
    expect(result.requiredRevision).toBe(true);
    expect(result.structuredIssues).toContainEqual(expect.objectContaining({
      severity: "blocking",
      code: "unsupported_current_chart_fact",
    }));
  });

  test("downgrades missing follow-up questions to a warning", () => {
    const result = runResponseCritic({
      intent: "career",
      draft: "可以先观察工作节奏。\n\n命盘依据：官禄宫有天同。\n\n现实解释：先看现实反馈。",
      toolsUsed: ["getCurrentChart", "summarizeChartFacts"],
      chartFacts: [{ ...chartFact, palace: "官禄", stars: ["天同"] }],
      knowledgeSources: [],
      safetyLevel: "caution",
    });

    expect(result.passed).toBe(true);
    expect(result.requiredRevision).toBe(false);
    expect(result.structuredIssues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "follow_up_count", severity: "warning" }),
    ]));
  });

  test("accepts a chart-setup prompt that makes no chart claim", () => {
    const result = runResponseCritic({
      intent: "career",
      draft: "请先创建一张命盘，我才能基于确定性排盘继续分析。你愿意先补充出生资料吗？",
      toolsUsed: [],
      chartFacts: [],
      knowledgeSources: [],
      safetyLevel: "caution",
    });

    expect(result).toEqual({ passed: true, issues: [], requiredRevision: false });
  });

  test("does not let a chart-setup phrase excuse an invented chart claim", () => {
    const result = runResponseCritic({
      intent: "career",
      draft: "请先创建一张命盘，不过你官禄宫有天同。你愿意补充出生资料吗？",
      toolsUsed: [],
      chartFacts: [],
      knowledgeSources: [],
      safetyLevel: "caution",
    });

    expect(result.passed).toBe(false);
    expect(result.issues).toContain("Serious Ziwei analysis must include chart facts.");
  });

  test("enforces topic-specific skill prohibitions", () => {
    const result = runResponseCritic({
      intent: "relationship",
      draft: "结论：先观察。\n\n命盘依据：\n- 工具事实。\n\n现实解释：这是倾向。\n\n建议：可以暗中查看对方手机。\n\n追问：你现在更担心什么？",
      toolsUsed: ["getCurrentChart", "summarizeChartFacts"],
      chartFacts: [{ ...chartFact, topic: "relationship", palace: "夫妻", rawText: "夫妻宫事实。" }],
      knowledgeSources: [],
      safetyLevel: "caution",
      prohibitionIds: ["relationship_manipulation"],
    });

    expect(result.passed).toBe(false);
    expect(result.issues).toContain("Response conflicts with the active skill's forbidden advice.");
  });

  test("does not reject a negated chart-explanation prediction boundary", () => {
    const result = runResponseCritic({
      intent: "chart_explanation",
      draft: "结论：这里只解释命盘，不做预测。\n\n命盘依据：\n- 工具事实。\n\n现实解释：这是术语说明。\n\n建议：先理解宫位。\n\n追问：你想先看哪个宫位？",
      toolsUsed: ["getCurrentChart", "summarizeChartFacts"],
      chartFacts: [{ ...chartFact, topic: "general", palace: "命宫", rawText: "命宫事实。" }],
      knowledgeSources: [],
      safetyLevel: "normal",
      prohibitionIds: ["chart_explanation_prediction"],
    });

    expect(result.passed).toBe(true);
  });

  test("checks later prohibition matches after an earlier negated match", () => {
    const result = runResponseCritic({
      intent: "general_chat",
      draft: "不要说我预测，但我预测明天会发生。",
      toolsUsed: [],
      chartFacts: [],
      knowledgeSources: [],
      safetyLevel: "normal",
      prohibitionIds: ["chart_explanation_prediction"],
    });

    expect(result.issues).toContain("Response conflicts with the active skill's forbidden advice.");
  });

  test.each(["不建议辞职。", "不要买入。", "不能用命盘诊断。"])(
    "allows a negated global high-stakes boundary: %s",
    (draft) => {
      const result = runResponseCritic({
        intent: "general_chat",
        draft,
        toolsUsed: [],
        chartFacts: [],
        knowledgeSources: [],
        safetyLevel: "normal",
      });

      expect(result.passed).toBe(true);
    },
  );

  test.each([
    ["immediate_career_exit", "建议：你应该立即辞职。"],
    ["career_outcome_certainty", "结论：保证你会升职。"],
    ["legal_or_retaliation_instruction", "建议：你应该报复上司。"],
    ["timing_certainty", "结论：你一定会在明年成功。"],
    ["relationship_manipulation", "建议：暗中查看对方手机。"],
    ["relationship_fatalism", "结论：你们是命中注定。"],
    ["unsafe_relationship_advice", "建议：继续忍受暴力。"],
    ["relationship_outcome_certainty", "结论：你们一定会复合。"],
    ["financial_action_instruction", "建议：现在全仓买入。"],
    ["financial_outcome_certainty", "结论：保证你会赚钱。"],
    ["professional_financial_boundary", "建议：无需咨询理财师。"],
    ["exact_income_prediction", "结论：你的年薪会达到1000000。"],
    ["clinical_diagnosis", "结论：诊断你有人格障碍。"],
    ["fixed_personality_label", "结论：你就是控制狂。"],
    ["fixed_personality_certainty", "结论：你的性格永远无法改变。"],
    ["harmful_behavior_excuse", "结论：因为命盘，伤害别人也合理。"],
    ["fear_prediction", "结论：你近期大祸临头。"],
    ["disaster_or_windfall_prediction", "结论：你将有横财。"],
    ["regulated_instruction", "建议：你应该停药。"],
    ["unsupported_lucky_date", "结论：2027年3月18日是最幸运的吉日。"],
    ["single_factor_determinism", "结论：一颗星决定整个命盘。"],
    ["undisclosed_school_mixing", "结论：各流派结论都一样。"],
    ["invented_chart_fact", "命盘依据：假设你命宫有紫微。"],
    ["chart_explanation_prediction", "结论：我预测你明年升职。"],
  ] as const)("executes the %s prohibition contract", (prohibitionId, unsafeSentence) => {
    const result = runResponseCritic({
      intent: "general_chat",
      draft: unsafeSentence,
      toolsUsed: [],
      chartFacts: [],
      knowledgeSources: [],
      safetyLevel: "normal",
      prohibitionIds: [prohibitionId],
    });

    expect(result.issues, prohibitionId).toContain("Response conflicts with the active skill's forbidden advice.");
  });
});
