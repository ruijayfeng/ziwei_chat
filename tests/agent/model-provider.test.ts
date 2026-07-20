import { describe, expect, test, vi } from "vitest";

import {
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
  test("finishes successfully when SSE sends DONE before the connection closes", async () => {
    const encoder = new TextEncoder();
    const result = await generateModelResponse({
      settings: {
        provider: "openai-compatible",
        enabled: true,
        baseUrl: "https://example.test/v1",
        apiKey: "sk-test",
        model: "test-model",
        embedding: disabledEmbedding,
      },
      prompt: "hello",
      timeoutMs: 25,
      fetchImplementation: vi.fn<typeof fetch>(async () =>
        new Response(
          new ReadableStream<Uint8Array>({
            start(controller) {
              controller.enqueue(
                encoder.encode('data: {"choices":[{"delta":{"content":"complete answer"}}]}\n\n'),
              );
              controller.enqueue(encoder.encode("data: [DONE]\n\n"));
              // A provider or proxy may keep the HTTP connection alive after
              // the protocol-level completion marker.
            },
          }),
          { status: 200, headers: { "content-type": "text/event-stream" } },
        ),
      ),
    });

    expect(result).toMatchObject({
      ok: true,
      content: "complete answer",
    });
  });

  test("accepts compact SSE DONE markers from compatible providers", async () => {
    const encoder = new TextEncoder();
    const result = await generateModelResponse({
      settings: {
        provider: "openai-compatible",
        enabled: true,
        baseUrl: "https://example.test/v1",
        apiKey: "sk-test",
        model: "test-model",
        embedding: disabledEmbedding,
      },
      prompt: "hello",
      timeoutMs: 25,
      fetchImplementation: vi.fn<typeof fetch>(async () =>
        new Response(
          new ReadableStream<Uint8Array>({
            start(controller) {
              controller.enqueue(encoder.encode('data: {"choices":[{"delta":{"content":"answer"}}]}\n\n'));
              controller.enqueue(encoder.encode("data:[DONE]\n\n"));
            },
          }),
          { status: 200, headers: { "content-type": "text/event-stream" } },
        ),
      ),
    });

    expect(result).toMatchObject({ ok: true, content: "answer" });
  });

  test("finishes when a compatible provider sends finish_reason stop without DONE", async () => {
    const encoder = new TextEncoder();
    const result = await generateModelResponse({
      settings: {
        provider: "openai-compatible",
        enabled: true,
        baseUrl: "https://example.test/v1",
        apiKey: "sk-test",
        model: "test-model",
        embedding: disabledEmbedding,
      },
      prompt: "hello",
      timeoutMs: 100,
      fetchImplementation: vi.fn<typeof fetch>(async () =>
        new Response(
          new ReadableStream<Uint8Array>({
            start(controller) {
              controller.enqueue(
                encoder.encode('data: {"choices":[{"delta":{"content":"complete answer"}}]}\n\n'),
              );
              controller.enqueue(
                encoder.encode('data: {"choices":[{"delta":{},"finish_reason":"stop"}]}\n\n'),
              );
            },
          }),
          { status: 200, headers: { "content-type": "text/event-stream" } },
        ),
      ),
    });

    expect(result).toMatchObject({ ok: true, content: "complete answer" });
  });

  test("rejects provider output truncated by a finish_reason length event", async () => {
    const result = await generateModelResponse({
      settings: {
        provider: "openai-compatible",
        enabled: true,
        baseUrl: "https://example.test/v1",
        apiKey: "sk-test",
        model: "test-model",
        embedding: disabledEmbedding,
      },
      prompt: "hello",
      fetchImplementation: vi.fn<typeof fetch>(async () =>
        new Response(
          [
            'data: {"choices":[{"delta":{"content":"partial answer"}}]}',
            "",
            'data: {"choices":[{"delta":{},"finish_reason":"length"}]}',
            "",
          ].join("\n"),
          { status: 200, headers: { "content-type": "text/event-stream" } },
        ),
      ),
    });

    expect(result).toMatchObject({
      ok: false,
      errorCode: "MODEL_RESPONSE_TRUNCATED",
    });
  });

  test("rejects an SSE connection that ends without a completion marker", async () => {
    const result = await generateModelResponse({
      settings: {
        provider: "openai-compatible",
        enabled: true,
        baseUrl: "https://example.test/v1",
        apiKey: "sk-test",
        model: "test-model",
        embedding: disabledEmbedding,
      },
      prompt: "hello",
      fetchImplementation: vi.fn<typeof fetch>(async () =>
        new Response('data: {"choices":[{"delta":{"content":"partial answer"}}]}\n\n', {
          status: 200,
          headers: { "content-type": "text/event-stream" },
        }),
      ),
    });

    expect(result).toMatchObject({
      ok: false,
      errorCode: "MODEL_STREAM_INCOMPLETE",
    });
  });

  test("times out while an accepted SSE response never completes", async () => {
    const result = await generateModelResponse({
      settings: {
        provider: "openai-compatible",
        enabled: true,
        baseUrl: "https://example.test/v1",
        apiKey: "sk-test",
        model: "test-model",
        embedding: disabledEmbedding,
      },
      prompt: "hello",
      timeoutMs: 10,
      fetchImplementation: vi.fn<typeof fetch>(async () =>
        new Response(new ReadableStream<Uint8Array>({ start() {} }), {
          status: 200,
          headers: { "content-type": "text/event-stream" },
        }),
      ),
    });

    expect(result).toMatchObject({
      ok: false,
      errorCode: "MODEL_TIMEOUT",
      telemetry: { firstTokenMs: null, completionMs: expect.any(Number) },
    });
  });

  test("does not let a hanging stream cleanup exceed the request timeout", async () => {
    const result = await Promise.race([
      generateModelResponse({
        settings: {
          provider: "openai-compatible",
          enabled: true,
          baseUrl: "https://example.test/v1",
          apiKey: "sk-test",
          model: "test-model",
          embedding: disabledEmbedding,
        },
        prompt: "hello",
        timeoutMs: 10,
        idleTimeoutMs: 0,
        fetchImplementation: vi.fn<typeof fetch>(async () =>
          new Response(
            new ReadableStream<Uint8Array>({
              start() {},
              cancel() {
                return new Promise<void>(() => {});
              },
            }),
            { status: 200, headers: { "content-type": "text/event-stream" } },
          ),
        ),
      }),
      new Promise<"still-pending">((resolve) => {
        setTimeout(() => resolve("still-pending"), 100);
      }),
    ]);

    expect(result).toMatchObject({
      ok: false,
      errorCode: "MODEL_TIMEOUT",
    });
  });

  test("fails an SSE stream when it goes idle after the first token", async () => {
    vi.useFakeTimers();

    try {
      const encoder = new TextEncoder();
      const resultPromise = generateModelResponse({
        settings: {
          provider: "openai-compatible",
          enabled: true,
          baseUrl: "https://example.test/v1",
          apiKey: "sk-test",
          model: "test-model",
          embedding: disabledEmbedding,
        },
        prompt: "hello",
        timeoutMs: 100,
        idleTimeoutMs: 25,
        fetchImplementation: vi.fn<typeof fetch>(async () =>
          new Response(
            new ReadableStream<Uint8Array>({
              start(controller) {
                controller.enqueue(
                  encoder.encode('data: {"choices":[{"delta":{"content":"partial"}}]}\n\n'),
                );
              },
            }),
            { status: 200, headers: { "content-type": "text/event-stream" } },
          ),
        ),
      });

      await vi.advanceTimersByTimeAsync(25);

      await expect(resultPromise).resolves.toMatchObject({
        ok: false,
        errorCode: "MODEL_IDLE_TIMEOUT",
        telemetry: { firstTokenMs: expect.any(Number), completionMs: expect.any(Number) },
      });
    } finally {
      vi.useRealTimers();
    }
  });

  test("reports first-token and completion timing for a streamed model response", async () => {
    const timestamps = [100, 140, 260];
    const clock = vi.fn(() => timestamps.shift() ?? 260);

    const result = await generateModelResponse({
      settings: {
        provider: "openai-compatible",
        enabled: true,
        baseUrl: "https://example.test/v1",
        apiKey: "sk-test",
        model: "test-model",
        embedding: disabledEmbedding,
      },
      prompt: "hello",
      now: clock,
      fetchImplementation: vi.fn<typeof fetch>(async () =>
        new Response(['data: {"choices":[{"delta":{"content":"answer"}}]}', "", "data: [DONE]", ""].join("\n"), {
          status: 200,
          headers: { "content-type": "text/event-stream" },
        }),
      ),
    });

    expect(result).toEqual({
      ok: true,
      content: "answer",
      telemetry: { firstTokenMs: 40, completionMs: 160 },
    });
  });

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
      prompt: "grounded agent context",
      fetchImplementation: fetchMock,
      onToken: (token) => streamedTokens.push(token),
    });

    expect(result).toMatchObject({ ok: true, content: "model stream answer" });
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
      max_tokens: 1200,
      messages: [
        expect.objectContaining({ role: "system" }),
        expect.objectContaining({ role: "user" }),
      ],
    });
  });

  test("allows callers to lower the provider output budget", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () =>
      new Response(JSON.stringify({ choices: [{ message: { content: "short answer" } }] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    await generateModelResponse({
      settings: {
        provider: "openai-compatible",
        enabled: true,
        baseUrl: "https://example.test/v1",
        apiKey: "sk-test",
        model: "test-model",
        embedding: disabledEmbedding,
      },
      prompt: "hello",
      maxTokens: 640,
      fetchImplementation: fetchMock,
    });

    const requestInit = fetchMock.mock.calls[0]?.[1] as RequestInit | undefined;
    expect(JSON.parse(String(requestInit?.body))).toMatchObject({ max_tokens: 640 });
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

    expect(result).toMatchObject({ ok: true, content: "retried model answer" });
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
    const body = JSON.parse(String(requestInit?.body));
    expect(body).not.toHaveProperty("temperature");
    expect(body).toMatchObject({ thinking: { type: "disabled" } });
  });
});
