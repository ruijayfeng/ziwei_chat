# Consumer-Friendly Critic Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make final response review strict about real chart contradictions and unsafe claims while allowing natural consumer explanations and minor format differences.

**Architecture:** Extend the existing deterministic critic with structured blocking/warning issues while preserving `passed`, `issues`, and `requiredRevision`. Replace lexical chart-term rejection with relationship-aware current-chart assertion detection. The Chat route revises only blocking issues, shows warning-only answers, and emits critic-specific failure copy when a blocking contradiction remains.

**Tech Stack:** TypeScript, Next.js App Router, React 19, Vitest, deterministic iztro facts, existing Agent evidence stream.

## Global Constraints

- Block only material chart contradictions, missing chart grounding, safety violations, and prohibited high-stakes claims.
- Allow natural-language interpretation, general doctrine, comparisons, practical suggestions, and minor structural variation.
- Warnings never block or trigger revision.
- Existing `CritiqueResult.passed`, `issues`, and `requiredRevision` remain compatible.
- Never expose API keys, provider response bodies, prompts, raw chart JSON, or source bodies.
- Do not remove the final critic or let the model recalculate the chart.
- Provider failures and critic blocking failures use different user-facing messages.

---

## File Map

- `src/lib/domain/analysis.ts`: add additive structured critic issue type/field.
- `src/lib/agent/critic.ts`: severity classification and relationship-aware chart assertion detection.
- `src/app/api/chat/route.ts`: revise only blocking issues, show warning-only answers, emit critic-specific failure copy.
- `src/lib/ui/chat-evidence.ts`: parse and present warning-only critic state without breaking old evidence.
- `src/lib/ui/chat-errors.ts`: map critic-blocked stream errors to distinct safe copy if needed.
- `src/lib/AGENTS.md`: document critic severity and current-chart assertion boundary.
- `tests/agent/critic.test.ts`: unit tests for blocking vs warning behavior.
- `tests/app/chat-route.test.ts`: revision, warning-only success, and critic failure stream contracts.
- `tests/ui/chat-evidence.test.ts`: additive structured issue parsing/presentation.

### Task 1: Severity-Aware Relationship Critic

**Files:**
- Modify: `src/lib/domain/analysis.ts`
- Modify: `src/lib/agent/critic.ts`
- Modify: `src/lib/AGENTS.md`
- Test: `tests/agent/critic.test.ts`

**Interfaces:**
- Add `CriticIssueSeverity = "blocking" | "warning"`.
- Add `CriticIssue = { code: string; message: string; severity: CriticIssueSeverity }`.
- Extend `CritiqueResult` with `structuredIssues: CriticIssue[]` while retaining `issues: string[]`.
- `runResponseCritic` returns `passed: true` and `requiredRevision: false` when only warnings exist.

- [ ] **Step 1: Write failing tests for natural interpretation and hard contradictions**

Add to `tests/agent/critic.test.ts`:

```ts
test("allows interpretation and general doctrine that do not assert current chart ownership", () => {
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
  expect(result.structuredIssues.every((issue) => issue.severity === "warning")).toBe(true);
});

test("blocks a current-chart palace-star assertion absent from deterministic facts", () => {
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

test("downgrades follow-up count and format deviations to warnings", () => {
  const result = runResponseCritic({
    intent: "career",
    draft: "可以先观察工作节奏。命盘依据：官禄宫有天同。现实解释：先看现实反馈。",
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
```

- [ ] **Step 2: Run critic tests and verify RED**

Run: `npm test -- tests/agent/critic.test.ts`

Expected: FAIL because structured issues do not exist and the current lexical scan blocks the general-doctrine example.

- [ ] **Step 3: Add additive issue types**

In `src/lib/domain/analysis.ts` add:

```ts
export type CriticIssueSeverity = "blocking" | "warning";
export type CriticIssue = {
  code: string;
  message: string;
  severity: CriticIssueSeverity;
};
```

Extend `CritiqueResult` with `structuredIssues: CriticIssue[]`.

- [ ] **Step 4: Implement severity classification and relationship detection**

In `src/lib/agent/critic.ts`:

```ts
const issues: CriticIssue[] = [];
const add = (code: string, message: string, severity: CriticIssueSeverity) =>
  issues.push({ code, message, severity });

const blocking = issues.filter((issue) => issue.severity === "blocking");
return {
  passed: blocking.length === 0,
  issues: issues.map((issue) => issue.message),
  structuredIssues: issues,
  requiredRevision: blocking.length > 0,
};
```

Replace `mentionsUnknownChartFact` with `hasUnsupportedCurrentChartAssertion`:

```ts
const ownership = "(?:你的|你命盘|本命|命盘中|盘里|当前命盘)";
const relation = "(?:有|坐|落|见|化|为|是|形成|构成|位于)";
const chartTerm = [...palaceTerms, ...starTerms].join("|");
const assertion = new RegExp(`${ownership}.{0,8}${relation}.{0,10}(?:${chartTerm})`);
const hypothetical = /如果|通常|一般|可能|可以作为|并非本次命盘事实|不是本次命盘依据/;
```

Only add `unsupported_current_chart_fact` when the response contains a current-chart ownership relationship that cannot be supported by `ChartFact` palace/star/transform/pattern sets and is not hypothetical/general doctrine. Keep existing safety and missing-grounding checks as blocking. Convert follow-up count and heading/format checks to warning issues.

- [ ] **Step 5: Run critic tests and verify GREEN**

Run: `npm test -- tests/agent/critic.test.ts`

Expected: all critic tests PASS, including existing safety and fabricated-fact tests.

- [ ] **Step 6: Commit the critic contract**

```powershell
git add src/lib/domain/analysis.ts src/lib/agent/critic.ts src/lib/AGENTS.md tests/agent/critic.test.ts
git commit -m "fix(critic): allow grounded consumer interpretations"
```

### Task 2: Route Revision and Error Separation

**Files:**
- Modify: `src/app/api/chat/route.ts`
- Modify: `src/lib/ui/chat-evidence.ts`
- Modify: `src/lib/ui/chat-errors.ts` only if the stream error needs a new mapping.
- Test: `tests/app/chat-route.test.ts`
- Test: `tests/ui/chat-evidence.test.ts`

**Interfaces:**
- Warning-only critique returns an answer and marks evidence as passed-with-warnings.
- Blocking critique attempts one revision; remaining blocking issues emit critic-specific copy.
- Provider failures retain existing provider-specific copy.

- [ ] **Step 1: Write failing route/evidence tests**

Add to `tests/app/chat-route.test.ts`:

```ts
test("shows a model answer when the critic has warnings only", async () => {
  const response = await POST(chatRequestWithModelAnswerThatMentionsGeneralDoctrine());
  const events = parseStreamEvents(await response.text());
  expect(events.some((event) => event.event === "token")).toBe(true);
  const evidence = events.filter((event) => event.event === "evidence").at(-1)?.data as any;
  expect(evidence.critic.status).toBe("passed_with_warnings");
});

test("uses critic-specific failure copy when blocking issues remain after revision", async () => {
  const response = await POST(chatRequestWithUnfixableChartAssertion());
  const events = parseStreamEvents(await response.text());
  expect(events).toContainEqual({
    event: "error",
    data: { message: "这次回答与当前命盘事实存在冲突，已停止展示，请重试。", canRetry: true },
  });
});
```

Add to `tests/ui/chat-evidence.test.ts`:

```ts
test("preserves warning-only critic status", () => {
  const evidence = evidenceFromPayload({
    ...validEvidencePayload,
    critic: { status: "passed_with_warnings", issues: ["format"] },
  });
  expect(evidence.critic.status).toBe("passed_with_warnings");
  expect(evidence.critic.issues).toEqual(["format"]);
});
```

- [ ] **Step 2: Run route/evidence tests and verify RED**

Run: `npm test -- tests/app/chat-route.test.ts tests/ui/chat-evidence.test.ts`

Expected: FAIL because warning-only responses currently trigger revision/failure and evidence accepts only passed/needs_review.

- [ ] **Step 3: Add warning-aware evidence parsing and presentation**

Extend the evidence critic status union to include `passed_with_warnings`. Keep unknown values normalized safely to `not_run`/`needs_review` according to existing parser behavior. Map this status to the existing passed visual tone and expose its issue text as detail.

- [ ] **Step 4: Gate revision only on blocking issues**

In `streamModelAndPersist`, use `postCritique.requiredRevision` rather than `!postCritique.passed` for deciding whether to call `reviseLlmAnalysis`. After revision, preserve warning-only success and set final evidence critic status to `passed_with_warnings` when `passed` is true but warnings exist.

Add a separate helper:

```ts
function criticFailureEvent() {
  return {
    message: "这次回答与当前命盘事实存在冲突，已停止展示，请重试。",
    canRetry: true,
  };
}
```

Use it only when `postCritique.requiredRevision` remains true. Keep `modelFailureEvent()` for `modelResult.ok === false` and provider errors.

- [ ] **Step 5: Run route/evidence tests and verify GREEN**

Run: `npm test -- tests/app/chat-route.test.ts tests/ui/chat-evidence.test.ts tests/ui/chat-client.test.ts tests/ui/reference-chat.test.ts`

Expected: warning-only model answers stream tokens; provider failures retain provider copy; blocking critic failures use critic copy; final evidence is emitted in every path.

- [ ] **Step 6: Commit route behavior**

```powershell
git add src/app/api/chat/route.ts src/lib/ui/chat-evidence.ts src/lib/ui/chat-errors.ts tests/app/chat-route.test.ts tests/ui/chat-evidence.test.ts
git commit -m "fix(chat): separate critic warnings from blocking failures"
```

### Task 3: Full Verification and Browser Acceptance

**Files:**
- Modify only task-owned files if a verified test failure requires a focused correction.
- Verify: `http://localhost:3200` using the current saved chart and `deepseek-chat`.

- [ ] **Step 1: Run static and full automated gates**

Run serially:

```powershell
npm run typecheck
npm test
npm run build
git diff --check
```

Expected: typecheck/build/diff check exit 0; full tests pass with only existing environment-gated skips.

- [ ] **Step 2: Restart the expected production preview**

Verify port 3200 is the project `next start -p 3200`, restart it after the build, and confirm `Invoke-WebRequest http://localhost:3200/` returns 200.

- [ ] **Step 3: Run the consumer career question**

In the browser, ask exactly: `我目前的事业方向，适合关注什么？`.

Expected:

- `hydrateChart`, `getCurrentChart`, `summarizeChartFacts`, skill, RAG, and critic evidence are present;
- a natural answer renders even when it contains interpretation beyond exact `rawText` fields;
- only direct unsupported current-chart assertions can trigger one revision;
- warning-only evidence does not show the generic failure message;
- provider failures and critic blocking failures show different messages;
- no `/api/chart` request is made during Chat;
- sidebar remains ready, console has zero errors, and no sensitive data is exposed.

- [ ] **Step 4: Inspect sanitized service output and final diff**

Verify recent logs contain no raw prompt, API key, raw chart JSON, provider body, or knowledge source body. Leave unrelated pre-existing untracked files untouched.

- [ ] **Step 5: Final verification and commit**

Run `npm test` once more after any focused correction. Commit only task-owned changes:

```powershell
git add src/lib/domain/analysis.ts src/lib/agent/critic.ts src/app/api/chat/route.ts src/lib/ui/chat-evidence.ts src/lib/ui/chat-errors.ts src/lib/AGENTS.md tests/agent/critic.test.ts tests/app/chat-route.test.ts tests/ui/chat-evidence.test.ts
git commit -m "fix(critic): allow grounded consumer responses"
```
