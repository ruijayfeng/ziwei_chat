import { describe, expect, test } from "vitest";

import {
  defaultEmbeddingSettingsDraft,
  defaultModelSettingsDraft,
  embeddingSettingsDraftForProvider,
  modelSettingsDraftFromStorage,
  modelSettingsRequestFromDraft,
  modelSettingsStatus,
  modelSettingsStorageValue,
  modelSettingsValidationError,
} from "../../src/lib/ui/model-settings";

describe("model settings UI helpers", () => {
  test("uses deterministic local mode when no browser settings exist", () => {
    expect(modelSettingsDraftFromStorage(null)).toEqual(defaultModelSettingsDraft);
    expect(modelSettingsRequestFromDraft(defaultModelSettingsDraft)).toEqual({
      provider: "deterministic-local",
      baseUrl: "",
      apiKey: "",
      model: "",
      embedding: defaultEmbeddingSettingsDraft,
    });
  });

  test("round-trips page-entered chat and embedding model settings", () => {
    const draft = {
      provider: "deepseek" as const,
      baseUrl: "https://api.deepseek.com",
      apiKey: "sk-user",
      model: "deepseek-chat",
      embedding: {
        provider: "qwen" as const,
        baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
        apiKey: "sk-embedding",
        model: "text-embedding-v4",
      },
    };

    const stored = modelSettingsStorageValue(draft);

    expect(modelSettingsDraftFromStorage(stored)).toEqual(draft);
    expect(modelSettingsRequestFromDraft(draft)).toEqual(draft);
  });

  test("keeps legacy flat chat settings compatible and disables missing embedding settings", () => {
    const legacyStored = JSON.stringify({
      provider: "deepseek",
      baseUrl: "https://api.deepseek.com",
      apiKey: "sk-user",
      model: "deepseek-chat",
    });

    expect(modelSettingsDraftFromStorage(legacyStored)).toEqual({
      provider: "deepseek",
      baseUrl: "https://api.deepseek.com",
      apiKey: "sk-user",
      model: "deepseek-chat",
      embedding: defaultEmbeddingSettingsDraft,
    });
  });

  test("falls back to deterministic local mode when stored JSON is invalid", () => {
    expect(modelSettingsDraftFromStorage("{bad json")).toEqual(defaultModelSettingsDraft);
  });

  test("summarizes chat and embedding configuration status for the settings panel", () => {
    expect(modelSettingsStatus(defaultModelSettingsDraft)).toEqual({
      label: "本地模式",
      description: "不调用外部回答模型；命盘工具与检索仍可运行，个性化分析正文需要配置回答模型。",
      missingFields: [],
      ready: false,
      embeddingReady: false,
    });

    expect(
      modelSettingsStatus({
        provider: "deepseek",
        baseUrl: "https://api.deepseek.com/v1",
        apiKey: "",
        model: "deepseek-chat",
        embedding: defaultEmbeddingSettingsDraft,
      }),
    ).toEqual({
      label: "待补全",
      description: "还需要填写 API Key。",
      missingFields: ["API Key"],
      ready: false,
      embeddingReady: false,
    });
  });

  test("applies embedding provider defaults", () => {
    expect(embeddingSettingsDraftForProvider(defaultEmbeddingSettingsDraft, "qwen")).toEqual({
      provider: "qwen",
      baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
      apiKey: "",
      model: "text-embedding-v4",
    });
  });

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
});
