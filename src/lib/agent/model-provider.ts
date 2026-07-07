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

export type ModelPromptInput = {
  userContent: string;
  deterministicDraft: string;
  chartFacts: string[];
  knowledgeSources: string[];
  criticStatus: "not_run" | "passed" | "needs_review";
  criticIssues: string[];
};

export type GenerateModelResponseInput = {
  settings: ResolvedModelSettings;
  prompt: string;
  fetchImplementation?: typeof fetch;
  onToken?: (token: string) => void;
};

export type GenerateModelResponseResult =
  | { ok: true; content: string }
  | { ok: false; error: string };

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

export function buildModelPrompt({
  userContent,
  deterministicDraft,
  chartFacts,
  knowledgeSources,
  criticStatus,
  criticIssues,
}: ModelPromptInput): string {
  return [
    "请基于以下已经由工具产生的紫微斗数上下文回答用户。",
    "要求：只使用命盘事实、技能流程和知识来源中出现的信息；不要自行排盘；不要给绝对化结论；保持中文自然、温和、可读。",
    "",
    `用户问题：${userContent}`,
    "",
    "命盘事实：",
    chartFacts.length > 0 ? chartFacts.map((fact) => `- ${fact}`).join("\n") : "- 暂无",
    "",
    "知识来源：",
    knowledgeSources.length > 0
      ? knowledgeSources.map((source) => `- ${source}`).join("\n")
      : "- 暂无",
    "",
    `Critic 状态：${criticStatus}`,
    criticIssues.length > 0 ? `Critic 问题：${criticIssues.join("；")}` : "Critic 问题：无",
    "",
    "本地确定性草稿：",
    deterministicDraft,
    "",
    "请输出最终给用户看的回答，保留“结论 / 命盘依据 / 现实解释 / 建议 / 追问”的结构。",
  ].join("\n");
}

export async function generateModelResponse({
  settings,
  prompt,
  fetchImplementation = fetch,
  onToken,
}: GenerateModelResponseInput): Promise<GenerateModelResponseResult> {
  if (!settings.enabled) {
    return { ok: false, error: "model settings are incomplete" };
  }

  try {
    const response = await fetchImplementation(`${settings.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${settings.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: settings.model,
        stream: true,
        temperature: 0.4,
        messages: [
          {
            role: "system",
            content:
              "你是 Ziwei Chat 的中文回答生成器。命盘事实由工具提供，你只负责把证据组织成自然语言。",
          },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      return { ok: false, error: `model request failed with status ${response.status}` };
    }

    const content = await readOpenAiCompatibleStream(response, onToken);

    return content.trim().length > 0
      ? { ok: true, content: content.trim() }
      : { ok: false, error: "model response is empty" };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "model request failed",
    };
  }
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
) {
  if (response.headers.get("content-type")?.includes("application/json")) {
    const json = (await response.json()) as {
      choices?: Array<{ message?: { content?: unknown } }>;
    };
    const content = json.choices?.[0]?.message?.content;
    if (typeof content === "string") {
      onToken?.(content);
      return content;
    }

    return "";
  }

  if (!response.body) {
    return "";
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let content = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split(/\r?\n\r?\n/);
    buffer = events.pop() ?? "";

    for (const event of events) {
      const token = readStreamEventToken(event);
      if (token === null) continue;

      content += token;
      onToken?.(token);
    }
  }

  buffer += decoder.decode();
  const token = readStreamEventToken(buffer);
  if (token !== null) {
    content += token;
    onToken?.(token);
  }

  return content;
}

function readStreamEventToken(event: string) {
  const data = event
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice("data:".length).trim())
    .join("\n");

  if (!data || data === "[DONE]") {
    return null;
  }

  const json = JSON.parse(data) as {
    choices?: Array<{
      delta?: { content?: unknown };
      message?: { content?: unknown };
    }>;
  };
  const content = json.choices?.[0]?.delta?.content ?? json.choices?.[0]?.message?.content;

  return typeof content === "string" ? content : null;
}
