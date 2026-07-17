import { describe, expect, test, vi } from "vitest";

import { createInsightsPostHandler } from "../../src/app/api/insights/route";

const modelSettings = {
  provider: "openai-compatible",
  baseUrl: "https://provider.example/v1",
  apiKey: "sk-super-secret",
  model: "insight-model",
  embedding: { provider: "disabled", baseUrl: "", apiKey: "", model: "" },
};

function sourceBundle() {
  return {
    conversations: [
      {
        id: "conversation-a",
        title: "PRIVATE_CONVERSATION_TITLE",
        updatedAt: "2026-07-16T16:00:00.000Z",
        messages: [
          { id: "user-a1", role: "user", content: "最近工作方向让我反复权衡", createdAt: "2026-07-15T15:00:00.000Z" },
          { id: "assistant-a1", role: "assistant", content: "PRIVATE_ASSISTANT_CONTENT", createdAt: "2026-07-15T15:01:00.000Z" },
          { id: "user-a2", role: "user", content: "事业选择还是有些犹豫", createdAt: "2026-07-15T15:02:00.000Z" },
        ],
      },
      {
        id: "conversation-b",
        title: "B",
        updatedAt: "2026-07-17T16:00:00.000Z",
        messages: [
          { id: "user-b1", role: "user", content: "今天又在考虑职业变化", createdAt: "2026-07-16T16:00:00.000Z" },
        ],
      },
    ],
  };
}

function validCandidate(overrides: Record<string, unknown> = {}) {
  return {
    weeklyLetter: {
      greeting: "你好",
      paragraphs: [{ text: "你这周多次提到工作选择，可以继续观察取舍。", sourceIds: ["conversation-a:user-a1"] }],
      signoff: "Ziwei Chat",
    },
    patterns: [{
      id: "career-reflection",
      title: "职业选择反复出现",
      detail: "两次对话都提到职业方向，适合先记录影响取舍的条件。",
      topic: "career",
      sourceIds: ["conversation-a:user-a1", "conversation-b:user-b1"],
    }],
    ...overrides,
  };
}

function sse(content: string) {
  const encoder = new TextEncoder();
  return new Response(new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n\n`));
      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close();
    },
  }), { status: 200, headers: { "content-type": "text/event-stream" } });
}

function request(body: unknown, headers?: HeadersInit) {
  return new Request("http://localhost/api/insights", {
    method: "POST",
    headers,
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

async function payload(response: Response) {
  return { status: response.status, body: await response.json() };
}

describe("POST /api/insights", () => {
  test.each([
    ["invalid JSON", "{"],
    ["extra envelope key", { sourceBundle: sourceBundle(), modelSettings, extra: true }],
    ["missing envelope key", { sourceBundle: sourceBundle() }],
    ["malformed model settings", { sourceBundle: sourceBundle(), modelSettings: { ...modelSettings, extra: true } }],
    ["malformed source bundle", {
      sourceBundle: { conversations: [{ ...sourceBundle().conversations[0], hidden: true }] },
      modelSettings,
    }],
  ])("rejects %s", async (_name, body) => {
    const handler = createInsightsPostHandler({ fetchImplementation: vi.fn() });
    expect(await payload(await handler(request(body)))).toEqual({
      status: 400,
      body: { code: "INVALID_REQUEST", message: "请求格式不正确。", canRetry: false },
    });
  });

  test("rejects a clearly oversized content length before reading the body", async () => {
    const text = vi.fn(async () => "{}");
    const fakeRequest = { headers: new Headers({ "content-length": "240001" }), text } as unknown as Request;
    const handler = createInsightsPostHandler({ fetchImplementation: vi.fn() });

    expect(await payload(await handler(fakeRequest))).toEqual({
      status: 413,
      body: { code: "PAYLOAD_TOO_LARGE", message: "请求内容过大。", canRetry: false },
    });
    expect(text).not.toHaveBeenCalled();
  });

  test("rejects an arbitrarily large numeric content length before reading the body", async () => {
    const text = vi.fn(async () => "{}");
    const fakeRequest = {
      headers: new Headers({ "content-length": "9".repeat(400) }),
      text,
    } as unknown as Request;
    const handler = createInsightsPostHandler({ fetchImplementation: vi.fn() });

    expect((await handler(fakeRequest)).status).toBe(413);
    expect(text).not.toHaveBeenCalled();
  });

  test("rejects more than 120,000 Unicode code points after reading text", async () => {
    const handler = createInsightsPostHandler({ fetchImplementation: vi.fn() });
    const body = `{"padding":"${"😀".repeat(120_001)}"}`;
    const response = await handler(request(body));
    expect(response.status).toBe(413);
    await expect(response.json()).resolves.toEqual({ code: "PAYLOAD_TOO_LARGE", message: "请求内容过大。", canRetry: false });
  });

  test("rejects more than 400 source messages before aggregation", async () => {
    const bundle = sourceBundle();
    bundle.conversations[0]!.messages = Array.from({ length: 401 }, (_, index) => ({
      id: `m-${index}`, role: "user", content: "x", createdAt: "2026-07-15T15:00:00.000Z",
    }));
    const fetchImplementation = vi.fn<typeof fetch>();
    const handler = createInsightsPostHandler({ fetchImplementation });

    expect(await payload(await handler(request({ sourceBundle: bundle, modelSettings })))).toEqual({
      status: 413,
      body: { code: "PAYLOAD_TOO_LARGE", message: "请求内容过大。", canRetry: false },
    });
    expect(fetchImplementation).not.toHaveBeenCalled();
  });

  test("allows exactly 40 conversations and 400 messages into bounded aggregation", async () => {
    const conversations = Array.from({ length: 40 }, (_, conversationIndex) => ({
      id: `conversation-${String(conversationIndex).padStart(2, "0")}`,
      title: "bounded",
      updatedAt: "2026-07-17T00:00:00.000Z",
      messages: Array.from({ length: 10 }, (_, messageIndex) => ({
        id: `message-${messageIndex}`,
        role: "user",
        content: "回顾最近的选择",
        createdAt: `2026-07-${messageIndex === 0 ? "17" : "16"}T00:00:00.000Z`,
      })),
    }));
    const candidate = validCandidate({
      weeklyLetter: {
        greeting: "你好",
        paragraphs: [{ text: "可以继续观察最近的选择。", sourceIds: ["conversation-00:message-0"] }],
        signoff: "Ziwei Chat",
      },
      patterns: [{
        id: "choice-reflection",
        title: "选择持续出现",
        detail: "不同对话都提到了选择，可以记录当时看重的条件。",
        topic: "reflection",
        sourceIds: ["conversation-00:message-0", "conversation-02:message-0"],
      }],
    });
    const handler = createInsightsPostHandler({
      fetchImplementation: vi.fn(async () => sse(JSON.stringify(candidate))),
    });

    expect((await handler(request({ sourceBundle: { conversations }, modelSettings }))).status).toBe(200);
  });

  test.each([
    ["conversation envelope", 41, 1],
    ["total message envelope", 4, 101],
  ])("rejects a grossly oversized %s", async (_name, conversationCount, messagesPerConversation) => {
    const conversations = Array.from({ length: conversationCount }, (_, conversationIndex) => ({
      id: `conversation-${conversationIndex}`,
      title: "bounded",
      updatedAt: "2026-07-17T00:00:00.000Z",
      messages: Array.from({ length: messagesPerConversation }, (_, messageIndex) => ({
        id: `message-${messageIndex}`,
        role: "user",
        content: "x",
        createdAt: "2026-07-17T00:00:00.000Z",
      })),
    }));
    const fetchImplementation = vi.fn<typeof fetch>();
    const handler = createInsightsPostHandler({ fetchImplementation });

    expect((await payload(await handler(request({ sourceBundle: { conversations }, modelSettings })))).status).toBe(413);
    expect(fetchImplementation).not.toHaveBeenCalled();
  });

  test("returns structured insufficient history details without a provider call", async () => {
    const bundle = sourceBundle();
    bundle.conversations = [bundle.conversations[0]!];
    bundle.conversations[0]!.messages = [bundle.conversations[0]!.messages[0]!];
    const fetchImplementation = vi.fn<typeof fetch>();
    const handler = createInsightsPostHandler({ fetchImplementation });
    const result = await payload(await handler(request({ sourceBundle: bundle, modelSettings })));

    expect(result).toEqual({
      status: 422,
      body: {
        code: "INSUFFICIENT_HISTORY",
        message: "对话记录还不足以生成洞见。",
        canRetry: false,
      },
    });
    expect(fetchImplementation).not.toHaveBeenCalled();
  });

  test("requires complete enabled model settings without a provider call", async () => {
    const fetchImplementation = vi.fn<typeof fetch>();
    const handler = createInsightsPostHandler({ fetchImplementation });
    const disabled = { ...modelSettings, provider: "deterministic-local", baseUrl: "", apiKey: "", model: "" };

    expect(await payload(await handler(request({ sourceBundle: sourceBundle(), modelSettings: disabled })))).toEqual({
      status: 400,
      body: { code: "MODEL_SETTINGS_REQUIRED", message: "请先完成模型设置。", canRetry: false },
    });
    expect(fetchImplementation).not.toHaveBeenCalled();
  });

  test("maps provider failures to a fixed safe retryable error", async () => {
    const fetchImplementation = vi.fn<typeof fetch>(async () => new Response("endpoint-secret", { status: 500 }));
    const handler = createInsightsPostHandler({ fetchImplementation });
    const result = await payload(await handler(request({ sourceBundle: sourceBundle(), modelSettings })));

    expect(result).toEqual({
      status: 502,
      body: { code: "MODEL_PROVIDER_FAILED", message: "模型暂时无法生成洞见，请稍后重试。", canRetry: true },
    });
    expect(JSON.stringify(result.body)).not.toContain("endpoint-secret");
    expect(JSON.stringify(result.body)).not.toContain(modelSettings.baseUrl);
  });

  test.each([
    ["malformed output", "not json"],
    ["extra prose around JSON", `Here it is: ${JSON.stringify(validCandidate())}`],
    ["multiple fenced wrappers", `\`\`\`json\n${JSON.stringify(validCandidate())}\n\`\`\`\n\`\`\`json\n{}\n\`\`\``],
  ])("rejects %s as invalid model JSON", async (_name, content) => {
    const handler = createInsightsPostHandler({ fetchImplementation: vi.fn(async () => sse(content)) });
    expect(await payload(await handler(request({ sourceBundle: sourceBundle(), modelSettings })))).toEqual({
      status: 502,
      body: { code: "INVALID_MODEL_RESPONSE", message: "模型返回的洞见格式无效，请重试。", canRetry: true },
    });
  });

  test("routes strict candidate shape failures through the critic", async () => {
    const content = JSON.stringify({ ...validCandidate(), hidden: true });
    const handler = createInsightsPostHandler({ fetchImplementation: vi.fn(async () => sse(content)) });

    expect(await payload(await handler(request({ sourceBundle: sourceBundle(), modelSettings })))).toEqual({
      status: 502,
      body: { code: "INSIGHT_CRITIC_FAILED", message: "生成的洞见未通过依据与安全检查，请重试。", canRetry: true },
    });
  });

  test("rejects unknown provenance at the critic boundary", async () => {
    const candidate = validCandidate({
      weeklyLetter: {
        greeting: "你好",
        paragraphs: [{ text: "可以继续观察。", sourceIds: ["unknown:source"] }],
        signoff: "Ziwei Chat",
      },
    });
    const handler = createInsightsPostHandler({ fetchImplementation: vi.fn(async () => sse(JSON.stringify(candidate))) });
    expect(await payload(await handler(request({ sourceBundle: sourceBundle(), modelSettings })))).toEqual({
      status: 502,
      body: { code: "INSIGHT_CRITIC_FAILED", message: "生成的洞见未通过依据与安全检查，请重试。", canRetry: true },
    });
  });

  test("rejects unsafe certainty at the critic boundary", async () => {
    const candidate = validCandidate();
    candidate.weeklyLetter.paragraphs[0]!.text = "你一定会在事业上成功。";
    const handler = createInsightsPostHandler({ fetchImplementation: vi.fn(async () => sse(JSON.stringify(candidate))) });
    expect((await payload(await handler(request({ sourceBundle: sourceBundle(), modelSettings })))).body.code).toBe("INSIGHT_CRITIC_FAILED");
  });

  test("accepts a strict bare JSON object", async () => {
    const handler = createInsightsPostHandler({
      fetchImplementation: vi.fn(async () => sse(JSON.stringify(validCandidate()))),
      now: () => new Date("2026-07-17T08:00:00.000Z"),
    });

    expect((await handler(request({ sourceBundle: sourceBundle(), modelSettings }))).status).toBe(200);
  });

  test("accepts one strict fenced JSON wrapper and returns only the sanitized approved report", async () => {
    let providerBody = "";
    const fetchImplementation = vi.fn<typeof fetch>(async (_url, init) => {
      providerBody = String(init?.body ?? "");
      return sse(`\`\`\`json\n${JSON.stringify(validCandidate())}\n\`\`\``);
    });
    const handler = createInsightsPostHandler({
      fetchImplementation,
      now: () => new Date("2026-07-17T08:00:00.000Z"),
    });
    const result = await payload(await handler(request({ sourceBundle: sourceBundle(), modelSettings })));

    expect(result.status).toBe(200);
    expect(result.body).toEqual({
      sourceWindow: { from: "2026-07-15T15:00:00.000Z", to: "2026-07-16T16:00:00.000Z" },
      generatedAt: "2026-07-17T08:00:00.000Z",
      sourceFingerprint: expect.stringMatching(/^[a-f0-9]{64}$/),
      weeklyLetter: validCandidate().weeklyLetter,
      patterns: validCandidate().patterns,
      critic: { passed: true, issues: [] },
    });
    expect(result.body).not.toHaveProperty("sources");
    expect(result.body).not.toHaveProperty("telemetry");

    const providerPayload = JSON.parse(providerBody);
    const prompt = providerPayload.messages.map((message: { content: string }) => message.content).join("\n");
    expect(prompt).toContain("conversationCount");
    expect(prompt).toContain("topicCounts");
    expect(prompt).toContain("conversation-a:user-a1");
    expect(prompt).toContain("最近工作方向让我反复权衡");
    expect(prompt).not.toContain("PRIVATE_ASSISTANT_CONTENT");
    expect(prompt).not.toContain("PRIVATE_CONVERSATION_TITLE");
    expect(prompt).not.toContain("sk-super-secret");
    expect(prompt).not.toContain("```");
    expect(providerPayload.max_tokens).toBeLessThanOrEqual(900);
  });
});
