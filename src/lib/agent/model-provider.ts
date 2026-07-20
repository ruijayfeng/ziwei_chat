/**
 * [INPUT]: Depends on user-supplied OpenAI-compatible model settings and grounded agent context
 * [OUTPUT]: Provides optional provider-backed response generation for the chat API
 * [POS]: Model adapter after deterministic tools/knowledge/critic have produced auditable context
 * [PROTOCOL]: Update this header when changed, then check AGENTS.md
 */

import type { ModelProviderOption } from "../ui/model-settings";

export type IncomingModelSettings = {
  provider?: string;
  baseUrl?: string;
  apiKey?: string;
  model?: string;
  embedding?: {
    provider?: string;
    baseUrl?: string;
    apiKey?: string;
    model?: string;
  };
};

export type ResolvedProviderSettings = {
  provider: ModelProviderOption | "disabled";
  enabled: boolean;
  baseUrl: string;
  apiKey: string;
  model: string;
};

export type ResolvedModelSettings = {
  provider: ModelProviderOption;
  enabled: boolean;
  baseUrl: string;
  apiKey: string;
  model: string;
  embedding: ResolvedProviderSettings;
};

export type GenerateModelResponseInput = {
  settings: ResolvedModelSettings;
  prompt: string;
  systemPrompt?: string;
  fetchImplementation?: typeof fetch;
  onToken?: (token: string) => void;
  timeoutMs?: number;
  idleTimeoutMs?: number;
  maxTokens?: number;
  now?: () => number;
};

export type ModelResponseTelemetry = {
  firstTokenMs: number | null;
  completionMs: number;
};

export type GenerateModelResponseResult =
  | { ok: true; content: string; telemetry: ModelResponseTelemetry }
  | {
      ok: false;
      error: string;
      errorCode:
        | "MODEL_TIMEOUT"
        | "MODEL_IDLE_TIMEOUT"
        | "MODEL_REQUEST_FAILED"
        | "MODEL_RESPONSE_TRUNCATED"
        | "MODEL_STREAM_INCOMPLETE";
      telemetry: ModelResponseTelemetry;
    };

const providerValues = new Set<ModelProviderOption>([
  "deterministic-local",
  "openai-compatible",
  "openai",
  "deepseek",
  "qwen",
  "moonshot",
  "zhipu",
]);

export function normalizeModelSettings(value: IncomingModelSettings | undefined): ResolvedModelSettings {
  const provider = readProvider(value?.provider);
  const baseUrl = trimTrailingSlash(value?.baseUrl ?? "");
  const apiKey = (value?.apiKey ?? "").trim();
  const model = (value?.model ?? "").trim();
  const embedding = normalizeEmbeddingSettings(value?.embedding);

  if (provider === "deterministic-local" || !baseUrl || !apiKey || !model) {
    return {
      provider: "deterministic-local",
      enabled: false,
      baseUrl: "",
      apiKey: "",
      model: "",
      embedding,
    };
  }

  return {
    provider,
    enabled: true,
    baseUrl,
    apiKey,
    model,
    embedding,
  };
}

export async function generateModelResponse({
  settings,
  prompt,
  systemPrompt = "你是 Ziwei Chat 的中文紫微斗数分析 Agent。命盘事实由工具提供，你负责基于证据、skill 和 RAG 做综合分析。",
  fetchImplementation = fetch,
  onToken,
  timeoutMs = 45_000,
  idleTimeoutMs = 12_000,
  maxTokens = 1_200,
  now = Date.now,
}: GenerateModelResponseInput): Promise<GenerateModelResponseResult> {
  if (!settings.enabled) {
    return {
      ok: false,
      error: "model settings are incomplete",
      errorCode: "MODEL_REQUEST_FAILED",
      telemetry: { firstTokenMs: null, completionMs: 0 },
    };
  }

  const startedAt = now();
  let firstTokenAt: number | null = null;
  const telemetry = (): ModelResponseTelemetry => ({
    firstTokenMs: firstTokenAt === null ? null : firstTokenAt - startedAt,
    completionMs: now() - startedAt,
  });
  const emitToken = (token: string) => {
    if (firstTokenAt === null) firstTokenAt = now();
    onToken?.(token);
  };
  const abortController = new AbortController();
  let timeoutReason: "total" | "idle" | null = null;
  const timeoutId = setTimeout(() => {
    timeoutReason = "total";
    abortController.abort();
  }, timeoutMs);

  try {
    const requestInit = buildChatCompletionRequest(
      settings,
      systemPrompt,
      prompt,
      abortController.signal,
      maxTokens,
    );
    const attempted: string[] = [];
    let response: Response | null = null;

    for (const endpoint of chatCompletionEndpoints(settings.baseUrl)) {
      attempted.push(endpoint);
      response = await raceWithAbort(
        fetchImplementation(endpoint, requestInit),
        abortController.signal,
      );
      if (response.ok || response.status !== 404) break;
    }

    if (!response) {
      return { ok: false, error: "model request was not attempted", errorCode: "MODEL_REQUEST_FAILED", telemetry: telemetry() };
    }

    if (!response.ok) {
      return {
        ok: false,
        error: `model request failed with status ${response.status} at ${redactAttemptedEndpoints(attempted)}`,
        errorCode: "MODEL_REQUEST_FAILED",
        telemetry: telemetry(),
      };
    }

    const modelResponse = await readOpenAiCompatibleStream(
      response,
      emitToken,
      abortController.signal,
      idleTimeoutMs,
      () => {
        timeoutReason = "idle";
        abortController.abort();
      },
    );

    if (modelResponse.finishReason === "length") {
      return {
        ok: false,
        error: "model response was truncated by the provider token limit",
        errorCode: "MODEL_RESPONSE_TRUNCATED",
        telemetry: telemetry(),
      };
    }
    if (modelResponse.finishReason && modelResponse.finishReason !== "stop") {
      return {
        ok: false,
        error: `model response ended with finish_reason ${modelResponse.finishReason}`,
        errorCode: "MODEL_REQUEST_FAILED",
        telemetry: telemetry(),
      };
    }
    if (modelResponse.finishReason === null && modelResponse.content.trim().length > 0) {
      return {
        ok: false,
        error: "model stream ended without a completion marker",
        errorCode: "MODEL_STREAM_INCOMPLETE",
        telemetry: telemetry(),
      };
    }

    return modelResponse.content.trim().length > 0
      ? { ok: true, content: modelResponse.content.trim(), telemetry: telemetry() }
      : { ok: false, error: "model response is empty", errorCode: "MODEL_REQUEST_FAILED", telemetry: telemetry() };
  } catch (error) {
    return {
      ok: false,
      error: abortController.signal.aborted
        ? timeoutReason === "idle"
          ? `model stream went idle for ${idleTimeoutMs}ms`
          : `model request timed out after ${timeoutMs}ms`
        : error instanceof Error ? error.message : "model request failed",
      errorCode: abortController.signal.aborted
        ? timeoutReason === "idle"
          ? "MODEL_IDLE_TIMEOUT"
          : "MODEL_TIMEOUT"
        : "MODEL_REQUEST_FAILED",
      telemetry: telemetry(),
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

function buildChatCompletionRequest(
  settings: ResolvedModelSettings,
  systemPrompt: string,
  prompt: string,
  signal?: AbortSignal,
  maxTokens = 1_200,
): RequestInit {
  return {
    method: "POST",
    signal,
    headers: {
      Authorization: `Bearer ${settings.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: settings.model,
      stream: true,
      max_tokens: Math.max(1, Math.floor(maxTokens)),
      ...(settings.provider === "moonshot" && settings.model.toLowerCase() === "kimi-k2.6"
        ? { thinking: { type: "disabled" } }
        : {}),
      ...(settings.provider === "moonshot" ? {} : { temperature: 0.4 }),
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        { role: "user", content: prompt },
      ],
    }),
  };
}

function chatCompletionEndpoints(baseUrl: string) {
  const primary = `${baseUrl}/chat/completions`;
  if (hasVersionPath(baseUrl)) return [primary];

  return [primary, `${baseUrl}/v1/chat/completions`];
}

function hasVersionPath(baseUrl: string) {
  try {
    return new URL(baseUrl).pathname.split("/").some((part) => /^v\d+$/i.test(part));
  } catch {
    return false;
  }
}

function redactAttemptedEndpoints(endpoints: string[]) {
  return endpoints
    .map((endpoint) => {
      try {
        const url = new URL(endpoint);
        return `${url.origin}${url.pathname}`;
      } catch {
        return endpoint;
      }
    })
    .join(", ");
}

function readProvider(value: unknown): ModelProviderOption {
  return typeof value === "string" && providerValues.has(value as ModelProviderOption)
    ? (value as ModelProviderOption)
    : "deterministic-local";
}

function normalizeEmbeddingSettings(
  value: IncomingModelSettings["embedding"] | undefined,
): ResolvedProviderSettings {
  const provider = readEmbeddingProvider(value?.provider);
  const baseUrl = trimTrailingSlash(value?.baseUrl ?? "");
  const apiKey = (value?.apiKey ?? "").trim();
  const model = (value?.model ?? "").trim();

  if (provider === "disabled" || !baseUrl || !apiKey || !model) {
    return {
      provider: "disabled",
      enabled: false,
      baseUrl: "",
      apiKey: "",
      model: "",
    };
  }

  return {
    provider,
    enabled: true,
    baseUrl,
    apiKey,
    model,
  };
}

function readEmbeddingProvider(value: unknown): ResolvedProviderSettings["provider"] {
  if (value === "disabled") return "disabled";
  const provider = readProvider(value);
  return provider === "deterministic-local" ? "disabled" : provider;
}

function trimTrailingSlash(value: string) {
  return value.trim().replace(/\/+$/, "");
}

async function readOpenAiCompatibleStream(
  response: Response,
  onToken: ((token: string) => void) | undefined,
  signal: AbortSignal,
  idleTimeoutMs: number,
  onIdleTimeout: () => void,
) {
  if (response.headers.get("content-type")?.includes("application/json")) {
    const json = (await raceWithAbort(response.json(), signal)) as {
      choices?: Array<{ message?: { content?: unknown }; finish_reason?: unknown }>;
    };
    const content = json.choices?.[0]?.message?.content;
    if (typeof content === "string") {
      onToken?.(content);
      return {
        content,
        finishReason: readFinishReason(json.choices?.[0]?.finish_reason) ?? "stop",
      };
    }

    return { content: "", finishReason: readFinishReason(json.choices?.[0]?.finish_reason) };
  }

  if (!response.body) {
    return { content: "", finishReason: null };
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let content = "";

  try {
    while (true) {
      const { done, value } = await readStreamChunk(reader, signal, idleTimeoutMs, onIdleTimeout);
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const events = buffer.split(/\r?\n\r?\n/);
      buffer = events.pop() ?? "";

      for (const event of events) {
        if (isStreamDoneEvent(event)) {
          return { content, finishReason: "stop" };
        }

        const parsed = readStreamEvent(event);
        if (parsed.token !== null) {
          content += parsed.token;
          onToken?.(parsed.token);
        }

        if (parsed.finishReason !== null) {
          return { content, finishReason: parsed.finishReason };
        }
      }
    }

    buffer += decoder.decode();
    if (isStreamDoneEvent(buffer)) {
      return { content, finishReason: "stop" };
    }

    const parsed = readStreamEvent(buffer);
    if (parsed.token !== null) {
      content += parsed.token;
      onToken?.(parsed.token);
    }

    return { content, finishReason: parsed.finishReason };
  } finally {
    try {
      void reader.cancel().catch(() => {
        // Cleanup must not outlive the provider timeout contract.
      });
    } catch {
      // The provider may have already closed or aborted the stream.
    }
    try {
      reader.releaseLock();
    } catch {
      // A pending provider read may retain the lock until cancellation settles.
    }
  }
}

function isStreamDoneEvent(event: string) {
  return event
    .split(/\r?\n/)
    .map((line) => line.trim())
    .some((line) => /^data:\s*\[DONE\]$/.test(line));
}

async function readStreamChunk(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  signal: AbortSignal,
  idleTimeoutMs: number,
  onIdleTimeout: () => void,
) {
  if (signal.aborted) {
    throw new Error("model request aborted");
  }

  const read = raceWithAbort(reader.read(), signal);
  if (idleTimeoutMs <= 0) return read;

  let idleTimer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      read,
      new Promise<never>((_, reject) => {
        idleTimer = setTimeout(() => {
          onIdleTimeout();
          reject(new Error("model stream went idle"));
        }, idleTimeoutMs);
      }),
    ]);
  } finally {
    if (idleTimer !== undefined) clearTimeout(idleTimer);
  }
}

function raceWithAbort<T>(operation: Promise<T>, signal: AbortSignal): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    if (signal.aborted) {
      reject(new Error("model request aborted"));
      return;
    }

    const rejectForAbort = () => reject(new Error("model request aborted"));
    signal.addEventListener("abort", rejectForAbort, { once: true });
    operation.then(
      (value) => {
        signal.removeEventListener("abort", rejectForAbort);
        resolve(value);
      },
      (error) => {
        signal.removeEventListener("abort", rejectForAbort);
        reject(error);
      },
    );
  });
}

function readStreamEvent(event: string) {
  const data = event
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice("data:".length).trim())
    .join("\n");

  if (!data || data === "[DONE]") {
    return { token: null, finishReason: null };
  }

  try {
    const json = JSON.parse(data) as {
      choices?: Array<{
        delta?: { content?: unknown };
        message?: { content?: unknown };
        finish_reason?: unknown;
      }>;
    };
    const choice = json.choices?.[0];
    const content = choice?.delta?.content ?? choice?.message?.content;
    return {
      token: typeof content === "string" ? content : null,
      finishReason: readFinishReason(choice?.finish_reason),
    };
  } catch {
    return { token: null, finishReason: null };
  }
}

function readFinishReason(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : null;
}
