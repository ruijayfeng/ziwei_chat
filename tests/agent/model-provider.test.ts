import { describe, expect, test, vi } from "vitest";

import {
  buildModelPrompt,
  generateModelResponse,
  normalizeModelSettings,
} from "../../src/lib/agent/model-provider";

const disabledEmbedding = {
  provider: "disabled",
  enabled: false,
  baseUrl: "",
  apiKey: "",
  model: "",
} as const;

describe("model provider settings", () => {
  test("keeps deterministic local mode when browser chat model settings are incomplete", () => {
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
      embedding: disabledEmbedding,
    });
  });

  test("normalizes chat and embedding OpenAI-compatible endpoints from the page", () => {
    expect(
      normalizeModelSettings({
        provider: "qwen",
        baseUrl: " https://dashscope.aliyuncs.com/compatible-mode/v1/ ",
        apiKey: "sk-test",
        model: "qwen-plus",
        embedding: {
          provider: "openai",
          baseUrl: " https://api.openai.com/v1/ ",
          apiKey: "sk-embedding",
          model: "text-embedding-3-small",
        },
      }),
    ).toEqual({
      provider: "qwen",
      enabled: true,
      baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
      apiKey: "sk-test",
      model: "qwen-plus",
      embedding: {
        provider: "openai",
        enabled: true,
        baseUrl: "https://api.openai.com/v1",
        apiKey: "sk-embedding",
        model: "text-embedding-3-small",
      },
    });
  });

  test("disables embedding settings when they are incomplete", () => {
    expect(
      normalizeModelSettings({
        provider: "openai",
        baseUrl: "https://api.openai.com/v1",
        apiKey: "sk-chat",
        model: "gpt-4.1-mini",
        embedding: {
          provider: "openai",
          baseUrl: "https://api.openai.com/v1",
          apiKey: "",
          model: "text-embedding-3-small",
        },
      }).embedding,
    ).toEqual(disabledEmbedding);
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
        embedding: disabledEmbedding,
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
