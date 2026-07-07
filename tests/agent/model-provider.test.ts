import { describe, expect, test, vi } from "vitest";

import {
  buildModelPrompt,
  generateModelResponse,
  normalizeModelSettings,
} from "../../src/lib/agent/model-provider";

describe("model provider settings", () => {
  test("keeps deterministic local mode when browser model settings are incomplete", () => {
    expect(
      normalizeModelSettings({
        provider: "deepseek",
        baseUrl: "https://api.deepseek.com",
        apiKey: "",
        model: "deepseek-chat",
      }),
    ).toEqual({
      provider: "deterministic-local",
      enabled: false,
      baseUrl: "",
      apiKey: "",
      model: "",
    });
  });

  test("normalizes a custom OpenAI-compatible model endpoint from the page", () => {
    expect(
      normalizeModelSettings({
        provider: "qwen",
        baseUrl: " https://dashscope.aliyuncs.com/compatible-mode/v1/ ",
        apiKey: "sk-test",
        model: "qwen-plus",
      }),
    ).toEqual({
      provider: "qwen",
      enabled: true,
      baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
      apiKey: "sk-test",
      model: "qwen-plus",
    });
  });
});

describe("generateModelResponse", () => {
  test("streams grounded agent context from an OpenAI-compatible chat completion endpoint", async () => {
    const streamedTokens: string[] = [];
    const fetchMock = vi.fn<typeof fetch>(async () =>
      new Response(
        [
          'data: {"choices":[{"delta":{"content":"model "}}]}\n\n',
          'data: {"choices":[{"delta":{"content":"stream "}}]}\n\n',
          'data: {"choices":[{"delta":{"content":"answer"}}]}\n\n',
          "data: [DONE]\n\n",
        ].join(""),
        { status: 200, headers: { "content-type": "text/event-stream" } },
      ),
    );

    const result = await generateModelResponse({
      settings: {
        provider: "openai-compatible",
        enabled: true,
        baseUrl: "https://example.test/v1",
        apiKey: "sk-test",
        model: "test-model",
      },
      prompt: buildModelPrompt({
        userContent: "career question",
        deterministicDraft: "Conclusion: observe first.",
        chartFacts: ["Career palace has deterministic chart support."],
        knowledgeSources: ["Career analysis starts from the career palace."],
        criticStatus: "passed",
        criticIssues: [],
      }),
      fetchImplementation: fetchMock,
      onToken: (token) => streamedTokens.push(token),
    });

    expect(result).toEqual({ ok: true, content: "model stream answer" });
    expect(streamedTokens).toEqual(["model ", "stream ", "answer"]);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://example.test/v1/chat/completions",
      expect.objectContaining({
        method: "POST",
        headers: {
          Authorization: "Bearer sk-test",
          "Content-Type": "application/json",
        },
      }),
    );
    const requestInit = fetchMock.mock.calls[0]?.[1] as RequestInit | undefined;

    expect(JSON.parse(String(requestInit?.body))).toMatchObject({
      model: "test-model",
      stream: true,
      messages: [
        expect.objectContaining({ role: "system" }),
        expect.objectContaining({ role: "user" }),
      ],
    });
  });
});
