/**
 * [INPUT]: Depends on browser localStorage JSON values and chat request model settings
 * [OUTPUT]: Provides chat/embedding model settings parsing, serialization, request shaping, and UI status copy
 * [POS]: UI support module for user-entered OpenAI-compatible model and embedding configuration
 * [PROTOCOL]: Update this header when changed, then check AGENTS.md
 */

export const modelProviderOptions = [
  { value: "deterministic-local", label: "本地规则" },
  { value: "openai-compatible", label: "自定义兼容" },
  { value: "openai", label: "OpenAI" },
  { value: "deepseek", label: "DeepSeek" },
  { value: "qwen", label: "通义千问" },
  { value: "moonshot", label: "Moonshot" },
  { value: "zhipu", label: "智谱 GLM" },
] as const;

export type ModelProviderOption = (typeof modelProviderOptions)[number]["value"];

export type EmbeddingSettingsDraft = {
  provider: Exclude<ModelProviderOption, "deterministic-local"> | "disabled";
  baseUrl: string;
  apiKey: string;
  model: string;
};

export type ModelSettingsDraft = {
  provider: ModelProviderOption;
  baseUrl: string;
  apiKey: string;
  model: string;
  embedding: EmbeddingSettingsDraft;
};

export type ModelSettingsRequest = ModelSettingsDraft;

export type ModelSettingsStatus = {
  label: string;
  description: string;
  missingFields: string[];
  ready: boolean;
  embeddingReady: boolean;
};

export const modelSettingsStorageKey = "ziwei-chat-model-settings";

export const defaultEmbeddingSettingsDraft: EmbeddingSettingsDraft = {
  provider: "disabled",
  baseUrl: "",
  apiKey: "",
  model: "",
};

export const defaultModelSettingsDraft: ModelSettingsDraft = {
  provider: "deterministic-local",
  baseUrl: "",
  apiKey: "",
  model: "",
  embedding: defaultEmbeddingSettingsDraft,
};

const supportedDeepSeekModels = new Set(["deepseek-chat", "deepseek-reasoner"]);

export const modelProviderDefaults: Record<
  Exclude<ModelProviderOption, "deterministic-local">,
  { baseUrl: string; model: string; embeddingModel: string }
> = {
  "openai-compatible": { baseUrl: "", model: "", embeddingModel: "" },
  openai: {
    baseUrl: "https://api.openai.com/v1",
    model: "gpt-4.1-mini",
    embeddingModel: "text-embedding-3-small",
  },
  deepseek: {
    baseUrl: "https://api.deepseek.com/v1",
    model: "deepseek-chat",
    embeddingModel: "",
  },
  qwen: {
    baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    model: "qwen-plus",
    embeddingModel: "text-embedding-v4",
  },
  moonshot: {
    baseUrl: "https://api.moonshot.cn/v1",
    model: "moonshot-v1-8k",
    embeddingModel: "",
  },
  zhipu: {
    baseUrl: "https://open.bigmodel.cn/api/paas/v4",
    model: "glm-4-flash",
    embeddingModel: "embedding-3",
  },
};

export function modelSettingsDraftFromStorage(value: string | null): ModelSettingsDraft {
  if (!value) return defaultModelSettingsDraft;

  try {
    return normalizeDraft(JSON.parse(value));
  } catch {
    return defaultModelSettingsDraft;
  }
}

export function modelSettingsStorageValue(draft: ModelSettingsDraft): string {
  return JSON.stringify(normalizeDraft(draft));
}

export function modelSettingsRequestFromDraft(draft: ModelSettingsDraft): ModelSettingsRequest {
  return normalizeDraft(draft);
}

export function modelSettingsStatus(draft: ModelSettingsDraft): ModelSettingsStatus {
  const normalized = normalizeDraft(draft);
  const embeddingReady = isEmbeddingReady(normalized.embedding);

  if (normalized.provider === "deterministic-local") {
    return {
      label: "本地模式",
      description: embeddingReady
        ? "不调用外部回答模型；Embedding 可用于检索，个性化分析正文仍需要配置回答模型。"
        : "不调用外部回答模型；命盘工具与检索仍可运行，个性化分析正文需要配置回答模型。",
      missingFields: [],
      ready: false,
      embeddingReady,
    };
  }

  const missingFields = [
    normalized.baseUrl ? "" : "Base URL",
    normalized.apiKey ? "" : "API Key",
    normalized.model ? "" : "Model",
  ].filter(Boolean);

  const validationError = modelSettingsValidationError(normalized);

  if (missingFields.length === 0 && validationError) {
    return {
      label: "模型不可用",
      description: validationError,
      missingFields,
      ready: false,
      embeddingReady,
    };
  }

  return missingFields.length === 0
    ? {
        label: "已启用",
        description: embeddingReady
          ? "回答模型和 Embedding 模型都已配置。"
          : "回答模型已配置；Embedding 未配置时会回退本地关键词 RAG。",
        missingFields,
        ready: true,
        embeddingReady,
      }
    : {
        label: "待补全",
        description: `还需要填写 ${missingFields.join("、")}。`,
        missingFields,
        ready: false,
        embeddingReady,
      };
}

export function modelSettingsValidationError(draft: ModelSettingsDraft): string | null {
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

export function runtimeLabel(draft: ModelSettingsDraft) {
  const normalized = normalizeDraft(draft);
  return normalized.provider === "deterministic-local"
    ? "本地规则"
    : normalized.model || "模型待补全";
}

export function retrievalLabel(draft: ModelSettingsDraft) {
  const normalized = normalizeDraft(draft);
  return normalized.embedding.provider === "disabled" ? "本地关键词检索" : "Embedding 已配置";
}

export function modelSettingsDraftForProvider(
  current: ModelSettingsDraft,
  provider: ModelProviderOption,
): ModelSettingsDraft {
  const normalized = normalizeDraft(current);
  if (provider === "deterministic-local") {
    return {
      ...defaultModelSettingsDraft,
      embedding: normalized.embedding,
    };
  }

  const defaults = modelProviderDefaults[provider];

  return {
    ...normalized,
    provider,
    baseUrl: normalized.baseUrl.trim() || defaults.baseUrl,
    apiKey: normalized.apiKey,
    model: normalized.model.trim() || defaults.model,
  };
}

export function embeddingSettingsDraftForProvider(
  current: EmbeddingSettingsDraft,
  provider: EmbeddingSettingsDraft["provider"],
): EmbeddingSettingsDraft {
  if (provider === "disabled") return defaultEmbeddingSettingsDraft;

  const defaults = modelProviderDefaults[provider];

  return {
    provider,
    baseUrl: current.baseUrl.trim() || defaults.baseUrl,
    apiKey: current.apiKey,
    model: current.model.trim() || defaults.embeddingModel,
  };
}

function normalizeDraft(value: unknown): ModelSettingsDraft {
  if (!isRecord(value)) return defaultModelSettingsDraft;

  const provider = readProvider(value.provider);
  const chat =
    provider === "deterministic-local"
      ? {
          provider,
          baseUrl: "",
          apiKey: "",
          model: "",
        }
      : {
          provider,
          baseUrl: readString(value.baseUrl).trim(),
          apiKey: readString(value.apiKey).trim(),
          model: readString(value.model).trim(),
        };

  return {
    ...chat,
    embedding: normalizeEmbeddingSettings(value.embedding),
  };
}

function normalizeEmbeddingSettings(value: unknown): EmbeddingSettingsDraft {
  if (!isRecord(value)) return defaultEmbeddingSettingsDraft;

  const provider = readEmbeddingProvider(value.provider);
  if (provider === "disabled") return defaultEmbeddingSettingsDraft;

  return {
    provider,
    baseUrl: readString(value.baseUrl).trim(),
    apiKey: readString(value.apiKey).trim(),
    model: readString(value.model).trim(),
  };
}

function isEmbeddingReady(value: EmbeddingSettingsDraft) {
  return value.provider !== "disabled" && Boolean(value.baseUrl && value.apiKey && value.model);
}

function readProvider(value: unknown): ModelProviderOption {
  return modelProviderOptions.some((option) => option.value === value)
    ? (value as ModelProviderOption)
    : "deterministic-local";
}

function readEmbeddingProvider(value: unknown): EmbeddingSettingsDraft["provider"] {
  if (value === "disabled") return "disabled";
  const provider = readProvider(value);
  return provider === "deterministic-local" ? "disabled" : provider;
}

function readString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
