import { describe, expect, test } from "vitest";

import {
  defaultModelSettingsDraft,
  modelSettingsDraftFromStorage,
  modelSettingsRequestFromDraft,
  modelSettingsStatus,
  modelSettingsStorageValue,
} from "../../src/lib/ui/model-settings";

describe("model settings UI helpers", () => {
  test("uses deterministic local mode when no browser settings exist", () => {
    expect(modelSettingsDraftFromStorage(null)).toEqual(defaultModelSettingsDraft);
    expect(modelSettingsRequestFromDraft(defaultModelSettingsDraft)).toEqual({
      provider: "deterministic-local",
      baseUrl: "",
      apiKey: "",
      model: "",
    });
  });

  test("round-trips page-entered base URL, API key, provider, and model", () => {
    const draft = {
      provider: "deepseek" as const,
      baseUrl: "https://api.deepseek.com",
      apiKey: "sk-user",
      model: "deepseek-chat",
    };

    const stored = modelSettingsStorageValue(draft);

    expect(modelSettingsDraftFromStorage(stored)).toEqual(draft);
    expect(modelSettingsRequestFromDraft(draft)).toEqual(draft);
  });

  test("falls back to deterministic local mode when stored JSON is invalid", () => {
    expect(modelSettingsDraftFromStorage("{bad json")).toEqual(defaultModelSettingsDraft);
  });

  test("summarizes model configuration status for the settings panel", () => {
    expect(modelSettingsStatus(defaultModelSettingsDraft)).toEqual({
      label: "本地模式",
      description: "使用内置确定性回答，不会调用外部模型。",
      missingFields: [],
      ready: false,
    });

    expect(
      modelSettingsStatus({
        provider: "deepseek",
        baseUrl: "https://api.deepseek.com/v1",
        apiKey: "",
        model: "deepseek-chat",
      }),
    ).toEqual({
      label: "待补全",
      description: "还需要填写 API Key。",
      missingFields: ["API Key"],
      ready: false,
    });
  });
});
