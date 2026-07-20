# 知微人格与自然对谈协议实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将知微设为所有用户可见模型回答的全局人格，并移除聊天分析的固定五段式输出要求，同时保留命盘事实和安全约束。

**Architecture:** 新建单一 prompt 构建模块，分别生成不含动态数据的 system 人格与含固定边界标签的 runtime prompt。`llm-analyst` 是三种用户可见模式唯一的接入点；critic 和本地保底回答保留事实与安全判断，但不再依赖用户可见标题。

**Tech Stack:** Next.js 16、TypeScript、Vitest、OpenAI-compatible chat completions。

## Global Constraints

- 只有服务端工具提供的 `chartFacts` 可以被描述为用户个人命盘事实。
- RAG 与 Skill 只能解释，不得写成用户盘面事实。
- 不改变排盘、RAG、数据库、模型设置和流式协议。
- 用户可见回答不得强制“结论 / 命盘依据 / 现实解释 / 建议 / 追问”标题、固定字数或固定问题结尾。
- 现有高风险、非决定论和技能禁止项继续由 critic 阻断。
- 不暂存或修改未跟踪目录 `ziwei-chat-redesign/`。

---

### Task 1: 知微人格与运行时拼接器

**Files:**
- Create: `src/lib/agent/zhiwei-persona.ts`
- Test: `tests/agent/zhiwei-persona.test.ts`

**Interfaces:**
- Produces `ZHIWEI_PERSONA`, `buildZhiweiSystemPrompt(mode)` and `buildZhiweiRuntimePrompt(input)`.
- `mode` is `"analysis" | "conversation" | "palace"`.
- Runtime input includes task rules, chart facts, knowledge, conversation context and user content.

- [x] **Step 1: Write the failing tests**

```ts
expect(buildZhiweiSystemPrompt("analysis")).toContain("你叫「知微」");
expect(buildZhiweiSystemPrompt("palace")).toContain("不延伸到其他宫位");
expect(buildZhiweiRuntimePrompt({
  mode: "analysis", taskRules: ["只解释已给出的事实"], chartFacts: ["官禄宫：天同"],
  knowledgeSources: ["官禄宫基础"], conversationContext: "用户正在考虑换工作", userContent: "我该辞职吗？",
})).toContain("<chart_facts>\n官禄宫：天同\n</chart_facts>");
```

- [x] **Step 2: Run the focused test and verify RED**

Run: `npm test -- tests/agent/zhiwei-persona.test.ts`

Expected: FAIL because `zhiwei-persona.ts` does not exist.

- [x] **Step 3: Implement the prompt module**

```ts
export type ZhiweiMode = "analysis" | "conversation" | "palace";

export function buildZhiweiSystemPrompt(mode: ZhiweiMode) {
  return [ZHIWEI_PERSONA, modeInstructions[mode]].join("\n\n");
}

export function buildZhiweiRuntimePrompt(input: ZhiweiRuntimePromptInput) {
  return [
    `当前模式：${input.mode}`,
    `当前任务规则：\n${asLines(input.taskRules)}`,
    `<chart_facts>\n${asLines(input.chartFacts)}\n</chart_facts>`,
    `<knowledge>\n${asLines(input.knowledgeSources)}\n</knowledge>`,
    `<conversation_context>\n${input.conversationContext || "无"}\n</conversation_context>`,
    `用户当前消息：\n${input.userContent}`,
    "只有 <chart_facts> 可被描述为用户命盘事实。<knowledge> 只能解释，不得补充盘面。",
  ].join("\n\n");
}
```

- [x] **Step 4: Run the focused test and verify GREEN**

Run: `npm test -- tests/agent/zhiwei-persona.test.ts`

Expected: PASS.

### Task 2: 让三种用户可见模式共用知微人格

**Files:**
- Modify: `src/lib/agent/llm-analyst.ts`
- Modify: `src/lib/agent/model-provider.ts`
- Test: `tests/agent/llm-analyst.test.ts`
- Test: `tests/agent/model-provider.test.ts`

**Interfaces:**
- Consumes Task 1 exports.
- `generateLlmAnalysis` and `reviseLlmAnalysis` pass `buildZhiweiSystemPrompt(responseMode)` and one `buildZhiweiRuntimePrompt(...)` value to the model provider.
- `buildModelPrompt` is removed or becomes an internal compatibility wrapper with no five-section instruction.

- [x] **Step 1: Write failing mode assertions**

```ts
expect(request.messages[0]?.content).toContain("你叫「知微」");
expect(request.messages[1]?.content).toContain("当前模式：analysis");
expect(request.messages[1]?.content).not.toContain("完整保留结论、命盘依据、现实解释、建议和一个追问");
expect(request.messages[1]?.content).toContain("<chart_facts>");
```

- [x] **Step 2: Run the focused tests and verify RED**

Run: `npm test -- tests/agent/llm-analyst.test.ts tests/agent/model-provider.test.ts`

Expected: FAIL because current prompts do not contain知微 and still require the five-section response.

- [x] **Step 3: Implement the shared mode integration**

```ts
return generateModelResponse({
  settings,
  systemPrompt: buildZhiweiSystemPrompt(responseMode),
  prompt: buildZhiweiRuntimePrompt({ mode: responseMode, taskRules, chartFacts, knowledgeSources, conversationContext, userContent }),
  onToken,
  maxTokens: responseMode === "palace" ? 520 : 1_200,
});
```

The analysis revision appends critic issues and prior text after the same runtime prompt. Conversation rules forbid forced chart analysis; palace rules limit interpretation to the selected palace. No user-visible title or mandatory follow-up requirement is added.

- [x] **Step 4: Run focused tests and verify GREEN**

Run: `npm test -- tests/agent/llm-analyst.test.ts tests/agent/model-provider.test.ts`

Expected: PASS.

### Task 3: 自然保底回答与无标题 critic

**Files:**
- Modify: `src/lib/agent/response-composer.ts`
- Modify: `src/lib/agent/critic.ts`
- Modify: `src/lib/domain/analysis.ts`
- Modify: `src/lib/agent/planner.ts`
- Modify: `src/lib/agent/llm-planner.ts`
- Modify: `src/app/api/chat/route.ts`
- Test: `tests/agent/response-composer.test.ts`
- Test: `tests/agent/critic.test.ts`
- Test: `tests/agent/planner.test.ts`
- Test: `tests/agent/llm-planner.test.ts`
- Test: `tests/app/chat-route.test.ts`

**Interfaces:**
- Planner preserves tool, skill and retrieval requirements but no longer declares a five-heading display contract.
- Critic accepts zero or more visible questions and validates every personal chart assertion against the fact list, without locating a “命盘依据” section.
- Composer returns natural paragraphs and can omit a follow-up when none is supplied.

- [x] **Step 1: Write failing behavior tests**

```ts
expect(composeResponse({ conclusion, chartBasis, plainExplanation, suggestion, followUp: "" }))
  .not.toMatch(/^(结论|命盘依据|现实解释|建议|追问)[：:]/m);
expect(runResponseCritic({ intent: "career", draft: "你的官禄宫有紫微。", chartFacts, toolsUsed, safetyLevel: "caution" }).passed)
  .toBe(false);
expect(runResponseCritic({ intent: "career", draft: "我先陪你把这一步看清。", chartFacts, toolsUsed, safetyLevel: "caution" }).structuredIssues)
  .not.toContainEqual(expect.objectContaining({ code: "follow_up_count" }));
```

- [x] **Step 2: Run the focused tests and verify RED**

Run: `npm test -- tests/agent/response-composer.test.ts tests/agent/critic.test.ts tests/agent/planner.test.ts tests/agent/llm-planner.test.ts tests/app/chat-route.test.ts`

Expected: FAIL because the composer emits headings and critic requires exactly one question.

- [x] **Step 3: Implement the minimal behavior change**

```ts
const response = [
  conclusion,
  chartBasis.length ? `从盘里与这件事最相关的线索看，${chartBasis.join("；")}` : "",
  plainExplanation,
  suggestion,
  followUp,
].filter(Boolean).join("\n\n");
```

Replace section-only fact scanning with sentence-level scanning of personal chart-assertion patterns. Remove `follow_up_count`; replace the planner response shape with internal values such as `"natural_dialogue"`, `"grounded_interpretation"`, and `"practical_direction"` that are not emitted to users. Update deterministic route fallbacks to use the same composer.

- [x] **Step 4: Run focused tests and verify GREEN**

Run: `npm test -- tests/agent/response-composer.test.ts tests/agent/critic.test.ts tests/agent/planner.test.ts tests/agent/llm-planner.test.ts tests/app/chat-route.test.ts`

Expected: PASS.

### Task 4: 更新主题规则、协议文档与全量验证

**Files:**
- Modify: `content/skills/career.md`
- Modify: `content/skills/relationship.md`
- Modify: `content/skills/wealth.md`
- Modify: `content/skills/personality.md`
- Modify: `content/skills/recent-fortune.md`
- Modify: `content/skills/chart-explanation.md`
- Modify: `docs/prompts/response-protocol.md`
- Test: `tests/app/palace-interpretation-route.test.ts`
- Test: `tests/evaluation/eval-cases.test.ts`

**Interfaces:**
- Skill documents say to ask one question only when it will materially advance the conversation.
- Response protocol documents internal grounding and natural dialogue rather than visible headings.

- [x] **Step 1: Write failing regression assertions**

```ts
expect(modelInput.responseMode).toBe("palace");
expect(modelInput.chartFacts).toHaveLength(1);
expect(modelInput.skillResponseRules).not.toContain("输出结论 / 命盘依据 / 现实解释 / 建议 / 追问");
```

- [x] **Step 2: Run the targeted tests and verify RED where contract changed**

Run: `npm test -- tests/app/palace-interpretation-route.test.ts tests/evaluation/eval-cases.test.ts`

Expected: Existing assertions that encode the report template fail and are replaced with natural-dialogue assertions.

- [x] **Step 3: Update protocol and skill language**

Replace “最后追问” with “当需要补充关键信息时，只提出一个能够推进对话的问题”。Replace the response-protocol five-section example with a natural two-to-three paragraph example that references chart facts conversationally.

- [x] **Step 4: Run all gates and verify GREEN**

Run:

```text
npm run lint
npm run typecheck
npm test
npm run eval:agent
npm run build
git diff --check
```

Expected: all commands exit 0; agent evaluation has zero failed cases.
