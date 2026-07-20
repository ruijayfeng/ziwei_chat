import { afterEach, describe, expect, test, vi } from "vitest";

vi.mock("../../src/lib/agent/llm-analyst", () => ({
  generateLlmAnalysis: vi.fn().mockImplementation(async (input: { responseMode?: string }) => ({
    ok: true,
    content: [
      input.responseMode === "palace" ? "这座宫位的呈现，更适合结合现实中的选择慢慢体会。" : "错误的聊天报告模式",
    ].join("\n"),
    telemetry: { firstTokenMs: 1, completionMs: 1 },
  })),
  reviseLlmAnalysis: vi.fn(),
}));

import { generateLlmAnalysis, reviseLlmAnalysis } from "../../src/lib/agent/llm-analyst";
import { POST } from "../../src/app/api/chart/palace-interpretation/route";

const profileId = "019f75c6-534e-7e31-90a0-1b1ebfc8ac5e";

afterEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/chart/palace-interpretation", () => {
  test("returns a model-setup error for only the explicitly requested palace", async () => {
    const response = await POST(
      new Request("http://localhost/api/chart/palace-interpretation", {
        method: "POST",
        body: JSON.stringify({
          profileId,
          palace: "命宫",
          chartInput: {
            profileId,
            name: "Primary chart",
            gender: "male",
            birthDate: "1990-05-17",
            birthTime: "12:00",
            calendarType: "solar",
            isPrimary: true,
          },
          modelSettings: { provider: "deterministic-local" },
        }),
      }),
    );

    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toEqual({
      code: "MODEL_NOT_CONFIGURED",
      message: "请先在设置中配置可用的回答模型。",
    });
  });

  test("generates when the selected palace has chart facts", async () => {
    const response = await POST(
      new Request("http://localhost/api/chart/palace-interpretation", {
        method: "POST",
        body: JSON.stringify({
          profileId,
          palace: "命宫",
          chartInput: {
            profileId,
            name: "Primary chart",
            gender: "male",
            birthDate: "1990-05-17",
            birthTime: "12:00",
            calendarType: "solar",
            isPrimary: true,
          },
          modelSettings: {
            provider: "openai-compatible",
            baseUrl: "https://example.test/v1",
            apiKey: "test-key",
            model: "test-model",
          },
        }),
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ palace: "命宫", content: expect.stringContaining("这座宫位") });
  });

  test("generates for a palace outside the general summary scope", async () => {
    const response = await POST(
      new Request("http://localhost/api/chart/palace-interpretation", {
        method: "POST",
        body: JSON.stringify({
          profileId,
          palace: "田宅",
          chartInput: {
            profileId,
            name: "Primary chart",
            gender: "male",
            birthDate: "1990-05-17",
            birthTime: "12:00",
            calendarType: "solar",
            isPrimary: true,
          },
          modelSettings: {
            provider: "openai-compatible",
            baseUrl: "https://example.test/v1",
            apiKey: "test-key",
            model: "test-model",
          },
        }),
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ palace: "田宅", content: expect.stringContaining("这座宫位") });
  });

  test("revises a response that invents a current-palace chart fact before returning it", async () => {
    vi.mocked(generateLlmAnalysis).mockResolvedValueOnce({
      ok: true,
      content: "你的命宫有紫微，这说明你天生适合掌控全局。",
      telemetry: { firstTokenMs: 1, completionMs: 1 },
    });
    vi.mocked(reviseLlmAnalysis).mockResolvedValueOnce({
      ok: true,
      content: "这座命宫呈现出的重点，更适合先从现实中的选择与节奏慢慢体会。",
      telemetry: { firstTokenMs: 1, completionMs: 1 },
    });

    const response = await POST(
      new Request("http://localhost/api/chart/palace-interpretation", {
        method: "POST",
        body: JSON.stringify({
          profileId,
          palace: "命宫",
          chartInput: {
            profileId,
            name: "Primary chart",
            gender: "male",
            birthDate: "1990-05-17",
            birthTime: "12:00",
            calendarType: "solar",
            isPrimary: true,
          },
          modelSettings: {
            provider: "openai-compatible",
            baseUrl: "https://example.test/v1",
            apiKey: "test-key",
            model: "test-model",
          },
        }),
      }),
    );

    expect(vi.mocked(reviseLlmAnalysis)).toHaveBeenCalledOnce();
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      palace: "命宫",
      content: "这座命宫呈现出的重点，更适合先从现实中的选择与节奏慢慢体会。",
    });
  });
});
