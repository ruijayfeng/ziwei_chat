import { describe, expect, test } from "vitest";

import {
  chatErrorFromResponse,
  classifyChatError,
  isEmptyAssistantResponse,
} from "../../src/lib/ui/chat-errors";

describe("chat error UI helpers", () => {
  test("classifies network failures with a recoverable message", () => {
    expect(classifyChatError(new TypeError("fetch failed"))).toEqual({
      kind: "network",
      message: "网络连接失败，请稍后重试。",
      canRetry: true,
    });
  });

  test("maps rate limit responses to calm retry copy", () => {
    const response = new Response("rate limit exceeded", { status: 429 });

    expect(chatErrorFromResponse(response)).toEqual({
      kind: "rate_limit",
      message: "请求太频繁了，请稍等一下再继续。",
      canRetry: true,
    });
  });

  test("maps server failures to a retryable analysis message", () => {
    const response = new Response("internal error", { status: 500 });

    expect(chatErrorFromResponse(response)).toEqual({
      kind: "server",
      message: "分析没有完成，请重试。",
      canRetry: true,
    });
  });

  test("uses the server-reported stage for actionable preparation failures", () => {
    const response = new Response("internal error", {
      status: 500,
      headers: {
        "X-Ziwei-Error-Code": "AGENT_REQUEST_FAILED",
        "X-Ziwei-Error-Stage": "analysis_preparation",
      },
    });

    expect(chatErrorFromResponse(response)).toEqual({
      kind: "server",
      message: "分析准备阶段失败，请重试；右侧过程可查看失败阶段。",
      canRetry: true,
    });
  });

  test("maps request-local chart hydration failures", () => {
    const response = new Response("internal error", {
      status: 500,
      headers: { "X-Ziwei-Error-Stage": "chart_hydration" },
    });

    expect(chatErrorFromResponse(response)).toEqual({
      kind: "server",
      message: "命盘读取失败，请重新保存出生信息后重试。",
      canRetry: true,
    });
  });

  test("shows a precise Agent stage and request id for diagnosis", () => {
    const response = new Response("internal error", {
      status: 500,
      headers: {
        "X-Ziwei-Error-Code": "AGENT_REQUEST_FAILED",
        "X-Ziwei-Error-Stage": "rag",
        "X-Ziwei-Request-Id": "request-123",
      },
    });

    expect(chatErrorFromResponse(response)).toEqual({
      kind: "server",
      message: "\u77e5\u8bc6\u68c0\u7d22\u9636\u6bb5\u5931\u8d25\uff0c\u8bf7\u91cd\u8bd5\u3002\uff08\u8bf7\u6c42 request-123\uff09",
      canRetry: true,
    });
  });

  test("does not create an error for successful responses", () => {
    const response = new Response("ok", { status: 200 });

    expect(chatErrorFromResponse(response)).toBeNull();
  });

  test("detects empty assistant responses", () => {
    expect(isEmptyAssistantResponse(" \n\t")).toBe(true);
    expect(isEmptyAssistantResponse("结论：可以继续观察。")).toBe(false);
  });
});
