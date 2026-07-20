import { describe, expect, test } from "vitest";

import {
  buildZhiweiRuntimePrompt,
  buildZhiweiSystemPrompt,
} from "../../src/lib/agent/zhiwei-persona";

describe("Zhiwei persona prompt", () => {
  test("keeps the global persona and scopes the analysis mode", () => {
    const prompt = buildZhiweiSystemPrompt("analysis");

    expect(prompt).toContain("你叫「知微」");
    expect(prompt).toContain("温柔地接住情绪");
    expect(prompt).toContain("不输出固定报告标题");
  });

  test("keeps palace interpretation within the selected palace", () => {
    const prompt = buildZhiweiSystemPrompt("palace");

    expect(prompt).toContain("只解释当前选中宫位");
    expect(prompt).toContain("不延伸到其他宫位");
  });

  test("places grounded materials in stable bounded sections", () => {
    const prompt = buildZhiweiRuntimePrompt({
      mode: "analysis",
      taskRules: ["只解释已给出的事实"],
      chartFacts: ["官禄宫：天同"],
      knowledgeSources: ["官禄宫基础"],
      conversationContext: "用户正在考虑换工作",
      userContent: "我该辞职吗？",
    });

    expect(prompt).toContain("当前模式：analysis");
    expect(prompt).toContain("<chart_facts>\n官禄宫：天同\n</chart_facts>");
    expect(prompt).toContain("<knowledge>\n官禄宫基础\n</knowledge>");
    expect(prompt).toContain("<conversation_context>\n用户正在考虑换工作\n</conversation_context>");
    expect(prompt).toContain("用户当前消息：\n我该辞职吗？");
    expect(prompt).toContain("只有 <chart_facts> 可被描述为用户的命盘事实");
  });
});
