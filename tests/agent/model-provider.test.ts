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

  test("retries /v1 chat completions for bare compatible provider base URLs", async () => {
    const fetchMock = vi.fn<typeof fetch>(async (url) => {
      if (String(url) === "https://integrate.api.nvidia.com/chat/completions") {
        return new Response("not found", { status: 404 });
      }

      return new Response(
        JSON.stringify({
          choices: [{ message: { content: "retried model answer" } }],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    });

    const result = await generateModelResponse({
      settings: {
        provider: "openai-compatible",
        enabled: true,
        baseUrl: "https://integrate.api.nvidia.com",
        apiKey: "sk-test",
        model: "test-model",
        embedding: disabledEmbedding,
      },
      prompt: "hello",
      fetchImplementation: fetchMock,
    });

    expect(result).toEqual({ ok: true, content: "retried model answer" });
    expect(fetchMock.mock.calls.map((call) => call[0])).toEqual([
      "https://integrate.api.nvidia.com/chat/completions",
      "https://integrate.api.nvidia.com/v1/chat/completions",
    ]);
  });

  test("omits the incompatible temperature parameter for Moonshot chat models", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () =>
      new Response(
        JSON.stringify({ choices: [{ message: { content: "moonshot answer" } }] }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );

    await generateModelResponse({
      settings: {
        provider: "moonshot",
        enabled: true,
        baseUrl: "https://api.moonshot.cn/v1",
        apiKey: "sk-test",
        model: "kimi-k2.6",
        embedding: disabledEmbedding,
      },
      prompt: "hello",
      fetchImplementation: fetchMock,
    });

    const requestInit = fetchMock.mock.calls[0]?.[1] as RequestInit | undefined;
    expect(JSON.parse(String(requestInit?.body))).not.toHaveProperty("temperature");
  });
});
