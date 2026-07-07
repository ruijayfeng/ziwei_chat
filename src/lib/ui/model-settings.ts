/**
 * [INPUT]: Depends on browser localStorage JSON values and chat request model settings
 * [OUTPUT]: Provides model settings draft parsing, serialization, request payload shaping, and UI status copy
 * [POS]: UI support module for user-entered OpenAI-compatible model configuration
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

export type ModelSettingsDraft = {
  provider: ModelProviderOption;
  baseUrl: string;
  apiKey: string;
  model: string;
};

export type ModelSettingsRequest = {
  provider: ModelProviderOption;
  baseUrl: string;
  apiKey: string;
  model: string;
};

export type ModelSettingsStatus = {
  label: string;
  description: string;
  missingFields: string[];
  ready: boolean;
};

export const modelSettingsStorageKey = "ziwei-chat-model-settings";

export const defaultModelSettingsDraft: ModelSettingsDraft = {
  provider: "deterministic-local",
  baseUrl: "",
  apiKey: "",
  model: "",
};

export const modelProviderDefaults: Record<
  Exclude<ModelProviderOption, "deterministic-local">,
  { baseUrl: string; model: string }
> = {
  "openai-compatible": { baseUrl: "", model: "" },
  openai: { baseUrl: "https://api.openai.com/v1", model: "gpt-4.1-mini" },
  deepseek: { baseUrl: "https://api.deepseek.com/v1", model: "deepseek-chat" },
  qwen: {
    baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    model: "qwen-plus",
  },
  moonshot: { baseUrl: "https://api.moonshot.cn/v1", model: "moonshot-v1-8k" },
  zhipu: { baseUrl: "https://open.bigmodel.cn/api/paas/v4", model: "glm-4-flash" },
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
  const normalized = normalizeDraft(draft);

  if (normalized.provider === "deterministic-local") {
    return defaultModelSettingsDraft;
  }

  return normalized;
}

export function modelSettingsStatus(draft: ModelSettingsDraft): ModelSettingsStatus {
  const normalized = normalizeDraft(draft);
  if (normalized.provider === "deterministic-local") {
    return {
      label: "本地模式",
      description: "使用内置确定性回答，不会调用外部模型。",
      missingFields: [],
      ready: false,
    };
  }

  const missingFields = [
    normalized.baseUrl ? "" : "Base URL",
    normalized.apiKey ? "" : "API Key",
    normalized.model ? "" : "Model",
  ].filter(Boolean);

  return missingFields.length === 0
    ? {
        label: "已启用",
        description: "真实模型已配置，回答会优先使用流式模型生成。",
        missingFields,
        ready: true,
      }
    : {
        label: "待补全",
        description: `还需要填写 ${missingFields.join("、")}。`,
        missingFields,
        ready: false,
      };
}

export function modelSettingsDraftForProvider(
  current: ModelSettingsDraft,
  provider: ModelProviderOption,
): ModelSettingsDraft {
  if (provider === "deterministic-local") return defaultModelSettingsDraft;

  const defaults = modelProviderDefaults[provider];

  return {
    provider,
    baseUrl: current.baseUrl.trim() || defaults.baseUrl,
    apiKey: current.apiKey,
    model: current.model.trim() || defaults.model,
  };
}

function normalizeDraft(value: unknown): ModelSettingsDraft {
  if (!isRecord(value)) return defaultModelSettingsDraft;

  const provider = readProvider(value.provider);
  if (provider === "deterministic-local") return defaultModelSettingsDraft;

  return {
    provider,
    baseUrl: readString(value.baseUrl).trim(),
    apiKey: readString(value.apiKey).trim(),
    model: readString(value.model).trim(),
  };
}

function readProvider(value: unknown): ModelProviderOption {
  return modelProviderOptions.some((option) => option.value === value)
    ? (value as ModelProviderOption)
    : "deterministic-local";
}

function readString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
