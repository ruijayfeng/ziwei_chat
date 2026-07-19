# Chat Reliability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make chart questions reach the grounded Agent pipeline without duplicate database writes, reject unsupported built-in DeepSeek model names before send, and show actionable safe failure messages.

**Architecture:** `/api/chart` remains the only durable browser chart-write boundary. `/api/chat` hydrates browser-provided chart input into request-local Agent stores through a non-persisting tool operation, while the existing restore path handles requests without browser chart input. Pure model-settings and chat-error helpers own validation and copy so React components only coordinate state.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Vitest, iztro, Postgres/Drizzle, browser-local model settings.

## Global Constraints

- Preserve the public Chat request shape and stateless no-database mode.
- Do not change Postgres schema or migrations.
- Do not automatically rewrite a user-entered model name.
- DeepSeek Chat accepts only `deepseek-chat` and `deepseek-reasoner`.
- Other OpenAI-compatible providers retain free-form model names.
- Do not expose API keys, provider response bodies, prompts, raw chart JSON, or knowledge source bodies.
- Keep Chat message persistence best-effort and non-blocking.
- Do not weaken final critic gating or present deterministic drafts as completed model answers.

---

## File Map

- `src/lib/agent/tools.ts`: add request-local `hydrateChart` and keep durable `createChart` semantics unchanged.
- `src/app/api/chat/route.ts`: use `hydrateChart` for `body.chartInput` and report `chart_hydration` on failures.
- `src/lib/ui/model-settings.ts`: expose pure provider-specific model validation through settings status.
- `src/components/workspace/workspace-provider.tsx`: block invalid model settings before creating a Chat turn.
- `src/lib/ui/chat-errors.ts`: map `chart_hydration` and model failures to actionable safe copy.
- `src/app/api/chat/route.ts`: update stream failure copy for provider/model failures.
- `src/lib/AGENTS.md`, `src/components/AGENTS.md`: keep module maps aligned with changed responsibilities.
- `tests/agent/tools.test.ts`: request-local hydration contract.
- `tests/app/chat-route.test.ts`: Chat no-write and stream failure contracts.
- `tests/ui/model-settings.test.ts`: DeepSeek model validation.
- `tests/ui/chat-errors.test.ts`: stage-specific copy.
- `tests/ui/chart-session.test.ts`: WorkspaceProvider send-boundary source contract if no focused DOM harness exists.

### Task 1: Request-Local Chart Hydration

**Files:**
- Modify: `src/lib/agent/tools.ts`
- Modify: `src/app/api/chat/route.ts`
- Modify: `src/lib/AGENTS.md`
- Test: `tests/agent/tools.test.ts`
- Test: `tests/app/chat-route.test.ts`

**Interfaces:**
- Consumes: `CreateChartInput`, existing iztro `createChart`, request-scoped `InMemoryToolStores`.
- Produces: `tools.hydrateChart(input: CreateChartInput): Promise<ToolResult<CreateChartOutput>>`.
- Invariant: `hydrateChart` updates `stores.charts` and `stores.primaryChartByProfileId` but never calls `ChartPersistence.savePrimaryChart`.

- [ ] **Step 1: Write a failing tool test for non-persisting hydration**

Add to `tests/agent/tools.test.ts`:

```ts
test("hydrates a request-local primary chart without durable persistence", async () => {
  let saveCalls = 0;
  const stores = createInMemoryToolStores();
  const tools = createAgentTools({
    stores,
    chartPersistence: {
      async savePrimaryChart() { saveCalls += 1; },
      async getPrimaryChart() { return null; },
    },
  });

  const result = await tools.hydrateChart(chartInput);

  expect(result.ok).toBe(true);
  expect(saveCalls).toBe(0);
  if (!result.ok) return;
  expect(stores.primaryChartByProfileId.get(chartInput.profileId)).toBe(result.data.chartId);
  expect(stores.charts.get(result.data.chartId)?.input).toEqual(chartInput);
});
```

- [ ] **Step 2: Run the tool test and verify RED**

Run: `npm test -- tests/agent/tools.test.ts`

Expected: FAIL because `hydrateChart` does not exist.

- [ ] **Step 3: Implement the minimal hydration operation**

In `src/lib/agent/tools.ts`, extract the shared in-memory chart registration and add:

```ts
const registerChart = (input: CreateChartInput, chart: CreateChartOutput) => {
  stores.charts.set(chart.chartId, {
    ...chart,
    profileId: input.profileId,
    isPrimary: input.isPrimary,
    input,
  });
  if (input.isPrimary) stores.primaryChartByProfileId.set(input.profileId, chart.chartId);
};

hydrateChart: withToolEvent(stores, "hydrateChart", async (input: CreateChartInput) => {
  const result = createChartWithIztro(input);
  if (!result.ok) return result;
  registerChart(input, result.data);
  return result;
}),
```

Refactor `createChart` to call `registerChart` only after durable persistence succeeds, preserving its existing stable chart-id behavior.

- [ ] **Step 4: Run the tool test and verify GREEN**

Run: `npm test -- tests/agent/tools.test.ts`

Expected: all tool tests PASS and persistence call counts remain unchanged for `createChart`.

- [ ] **Step 5: Write a failing Chat route test for no duplicate save**

Add a test seam exported only as a normal dependency parameter, not a test-only production method:

```ts
test("hydrates browser chart input without durable chart persistence", async () => {
  const response = await POST(chatRequestWithChart(careerQuestion));
  expect(response.status).toBe(200);

  const evidence = readEvidenceHeader(response);
  expect(evidence.toolsUsed).toContain("hydrateChart");
  expect(evidence.toolsUsed).not.toContain("createChart");
  expect(evidence.chartFacts.length).toBeGreaterThan(0);
});
```

Update existing expectations that list the first tool from `createChart` to `hydrateChart` only for Chat requests carrying `chartInput`.

- [ ] **Step 6: Run the Chat route test and verify RED**

Run: `npm test -- tests/app/chat-route.test.ts`

Expected: FAIL because evidence still reports `createChart`.

- [ ] **Step 7: Switch Chat to request-local hydration**

In `src/app/api/chat/route.ts`:

```ts
if (body.chartInput) {
  diagnostics.stage = "chart_hydration";
  const hydrated = await tools.hydrateChart({
    ...body.chartInput,
    profileId,
    isPrimary: true,
  });
  if (!hydrated.ok) {
    throw new Error(`chart_hydration: ${hydrated.error.code}`);
  }
}
```

Do not call `tools.createChart` from the Chat route.

- [ ] **Step 8: Run Task 1 focused tests**

Run: `npm test -- tests/agent/tools.test.ts tests/app/chat-route.test.ts tests/app/chart-route.test.ts tests/db/chart-persistence.test.ts`

Expected: all tests PASS; `/api/chart` tests still prove durable persistence and stable chart identity.

- [ ] **Step 9: Update module documentation and commit**

Update `src/lib/AGENTS.md` to describe `hydrateChart` as request-local and `createChart` as durable when persistence is supplied.

```powershell
git add src/lib/agent/tools.ts src/app/api/chat/route.ts src/lib/AGENTS.md tests/agent/tools.test.ts tests/app/chat-route.test.ts
git commit -m "fix(chat): hydrate charts without duplicate writes"
```

### Task 2: DeepSeek Model Validation Before Send

**Files:**
- Modify: `src/lib/ui/model-settings.ts`
- Modify: `src/components/workspace/workspace-provider.tsx`
- Modify: `src/components/model-settings-panel.tsx` only if current status rendering cannot show the validation description.
- Modify: `src/lib/AGENTS.md`
- Modify: `src/components/AGENTS.md`
- Test: `tests/ui/model-settings.test.ts`
- Test: `tests/ui/chart-session.test.ts`

**Interfaces:**
- Produces: `modelSettingsValidationError(draft: ModelSettingsDraft): string | null`.
- Extends: `ModelSettingsStatus` with no new field; unsupported models return `ready: false`, `label: "模型不可用"`, and actionable `description`.
- Workspace behavior: invalid settings create a failed retryable assistant turn without calling `sendChatRequest`.

- [ ] **Step 1: Write failing pure validation tests**

Add to `tests/ui/model-settings.test.ts`:

```ts
test("validates built-in DeepSeek chat model aliases", () => {
  const base = {
    provider: "deepseek" as const,
    baseUrl: "https://api.deepseek.com/v1",
    apiKey: "sk-user",
    embedding: defaultEmbeddingSettingsDraft,
  };

  expect(modelSettingsValidationError({ ...base, model: "deepseek-chat" })).toBeNull();
  expect(modelSettingsValidationError({ ...base, model: "deepseek-reasoner" })).toBeNull();
  expect(modelSettingsValidationError({ ...base, model: "deepseek-v4-pro" })).toBe(
    "DeepSeek 模型不可用，请改用 deepseek-chat 或 deepseek-reasoner。",
  );
  expect(modelSettingsStatus({ ...base, model: "deepseek-v4-pro" })).toMatchObject({
    ready: false,
    label: "模型不可用",
  });
});

test("keeps custom compatible model names free-form", () => {
  expect(modelSettingsValidationError({
    provider: "openai-compatible",
    baseUrl: "https://example.test/v1",
    apiKey: "sk-user",
    model: "private-model-v7",
    embedding: defaultEmbeddingSettingsDraft,
  })).toBeNull();
});
```

- [ ] **Step 2: Run model settings tests and verify RED**

Run: `npm test -- tests/ui/model-settings.test.ts`

Expected: FAIL because `modelSettingsValidationError` does not exist and unsupported DeepSeek currently reports ready.

- [ ] **Step 3: Implement pure model validation**

In `src/lib/ui/model-settings.ts`:

```ts
const supportedDeepSeekModels = new Set(["deepseek-chat", "deepseek-reasoner"]);

export function modelSettingsValidationError(draft: ModelSettingsDraft) {
  const normalized = normalizeDraft(draft);
  if (
    normalized.provider === "deepseek" &&
    normalized.model &&
    !supportedDeepSeekModels.has(normalized.model)
  ) {
    return "DeepSeek 模型不可用，请改用 deepseek-chat 或 deepseek-reasoner。";
  }
  return null;
}
```

Make `modelSettingsStatus` check missing fields first, then provider validation, then return ready.

- [ ] **Step 4: Run model settings tests and verify GREEN**

Run: `npm test -- tests/ui/model-settings.test.ts`

Expected: all tests PASS.

- [ ] **Step 5: Write a failing WorkspaceProvider send-boundary contract**

Add to `tests/ui/chart-session.test.ts` source-contract checks:

```ts
test("blocks invalid provider settings before opening a chat request", () => {
  const providerSource = readFileSync(
    resolve(process.cwd(), "src/components/workspace/workspace-provider.tsx"),
    "utf8",
  );

  expect(providerSource).toContain("modelSettingsValidationError(modelSettings)");
  expect(providerSource).toContain("if (modelValidationError)");
  expect(providerSource.indexOf("if (modelValidationError)")).toBeLessThan(
    providerSource.indexOf("await sendChatRequest"),
  );
});
```

- [ ] **Step 6: Run the provider contract and verify RED**

Run: `npm test -- tests/ui/chart-session.test.ts`

Expected: FAIL because WorkspaceProvider does not validate before send.

- [ ] **Step 7: Block invalid settings without transmitting a request**

In `WorkspaceProvider.sendMessage`, validate after constructing the turn action but before creating an `AbortController` or calling `sendChatRequest`:

```ts
const modelValidationError = modelSettingsValidationError(modelSettings);
if (modelValidationError) {
  dispatchChat(action);
  dispatchChat({
    type: "turn_failed",
    requestId,
    error: { kind: "server", message: modelValidationError, canRetry: true },
  });
  return;
}
```

This keeps the question available for retry after the user fixes Settings and does not transmit it externally.

- [ ] **Step 8: Run Task 2 focused tests**

Run: `npm test -- tests/ui/model-settings.test.ts tests/ui/chart-session.test.ts tests/ui/chat-session.test.ts`

Expected: all tests PASS.

- [ ] **Step 9: Update module documentation and commit**

Update the relevant L2 member lines for `model-settings.ts` and `workspace-provider.tsx`.

```powershell
git add src/lib/ui/model-settings.ts src/components/workspace/workspace-provider.tsx src/components/model-settings-panel.tsx src/lib/AGENTS.md src/components/AGENTS.md tests/ui/model-settings.test.ts tests/ui/chart-session.test.ts
git commit -m "fix(settings): validate DeepSeek chat models"
```

Omit `src/components/model-settings-panel.tsx` from staging if no code change was required.

### Task 3: Actionable Chat Failure Messages

**Files:**
- Modify: `src/lib/ui/chat-errors.ts`
- Modify: `src/app/api/chat/route.ts`
- Test: `tests/ui/chat-errors.test.ts`
- Test: `tests/app/chat-route.test.ts`

**Interfaces:**
- `chatErrorFromResponse` maps `X-Ziwei-Error-Stage: chart_hydration` to a chart-specific retry message.
- Model event-stream failures use `模型没有完成回答，请检查模型名称、API Key 和网络后重试。`.

- [ ] **Step 1: Write failing error-copy tests**

Add to `tests/ui/chat-errors.test.ts`:

```ts
test("maps request-local chart hydration failures", () => {
  const response = new Response("internal error", {
    status: 500,
    headers: { "X-Ziwei-Error-Stage": "chart_hydration" },
  });

  expect(chatErrorFromResponse(response)).toEqual({
    kind: "server",
    message: "命盘读取失败，请重新保存出生信息后重试。",
    canRetry: true,
  });
});
```

Update the configured-model failure expectation in `tests/app/chat-route.test.ts`:

```ts
expect(events).toContainEqual({
  event: "error",
  data: {
    message: "模型没有完成回答，请检查模型名称、API Key 和网络后重试。",
    canRetry: true,
  },
});
```

- [ ] **Step 2: Run error tests and verify RED**

Run: `npm test -- tests/ui/chat-errors.test.ts tests/app/chat-route.test.ts`

Expected: FAIL on the new chart stage and old model stream copy.

- [ ] **Step 3: Implement the safe copy mappings**

In `src/lib/ui/chat-errors.ts`, add:

```ts
if (stage === "chart_hydration") {
  return "命盘读取失败，请重新保存出生信息后重试。";
}
```

In `src/app/api/chat/route.ts`, make `modelFailureEvent()` return:

```ts
return {
  message: "模型没有完成回答，请检查模型名称、API Key 和网络后重试。",
  canRetry: true,
};
```

- [ ] **Step 4: Run Task 3 focused tests**

Run: `npm test -- tests/ui/chat-errors.test.ts tests/ui/chat-client.test.ts tests/ui/reference-chat.test.ts tests/app/chat-route.test.ts`

Expected: all tests PASS; final evidence remains available on model failure.

- [ ] **Step 5: Commit**

```powershell
git add src/lib/ui/chat-errors.ts src/app/api/chat/route.ts tests/ui/chat-errors.test.ts tests/app/chat-route.test.ts
git commit -m "fix(chat): surface actionable failure stages"
```

### Task 4: Full Verification and Browser Acceptance

**Files:**
- Modify only if required by verified failures: files already listed in Tasks 1-3.
- Verify: current production preview at `http://localhost:3200`.

**Interfaces:**
- Consumes all preceding task contracts.
- Produces fresh automated, build, and browser evidence; no new runtime API.

- [ ] **Step 1: Run static and full automated gates**

Run serially:

```powershell
npm run typecheck
npm test
npm run build
git diff --check
```

Expected:

- typecheck exits 0.
- all non-environment tests pass; existing Postgres-gated skips remain explicit.
- production build exits 0.
- `git diff --check` exits 0.

- [ ] **Step 2: Restart only the expected preview process**

Verify port 3200 belongs to `next start -p 3200`, stop that process, then launch:

```powershell
npm run start -- -p 3200
```

Expected: `http://localhost:3200` returns HTTP 200.

- [ ] **Step 3: Verify unsupported DeepSeek model blocking**

With the existing browser settings still showing `deepseek-v4-pro`, submit a chart question.

Expected:

- no `/api/chat` network request is sent;
- assistant failure says to use `deepseek-chat` or `deepseek-reasoner`;
- question remains retryable;
- sidebar chart remains ready;
- console has zero errors.

- [ ] **Step 4: Update the browser-owned model setting**

Through the Settings UI, change only the model field from `deepseek-v4-pro` to `deepseek-chat`. Do not read, print, or alter the API key.

Expected: settings status becomes ready and retains the existing provider/Base URL.

- [ ] **Step 5: Verify a real chart question**

Retry `我的命盘咋样整体`.

Expected before model completion:

- `/api/chat` responds without a chart persistence timeout;
- evidence includes `hydrateChart`, `getCurrentChart`, `summarizeChartFacts`, skill/RAG, and deterministic critic;
- evidence contains real chart facts;
- no `/api/chart` request occurs.

Expected final state:

- if the provider succeeds, the final critic passes and a readable answer renders;
- if the provider fails, the model-specific retry message renders and completed deterministic evidence remains visible;
- sidebar chart remains ready and console has zero errors.

- [ ] **Step 6: Inspect sanitized server output**

Expected:

- no chart persistence timeout occurs during Chat hydration;
- best-effort message persistence warnings, if present, do not interrupt the answer;
- no credential, raw chart JSON, prompt, or source body is logged.

- [ ] **Step 7: Final diff review and integration commit**

Review only task-owned files and confirm pre-existing documentation changes and `ziwei-chat-redesign/` remain untouched.

If browser verification required no further code changes, no integration commit is needed. If a verified issue required a focused correction, repeat RED/GREEN for it and commit only those files with:

```powershell
git commit -m "fix(chat): complete reliability acceptance"
```
