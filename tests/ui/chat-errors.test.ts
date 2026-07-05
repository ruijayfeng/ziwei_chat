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

  test("does not create an error for successful responses", () => {
    const response = new Response("ok", { status: 200 });

    expect(chatErrorFromResponse(response)).toBeNull();
  });

  test("detects empty assistant responses", () => {
    expect(isEmptyAssistantResponse(" \n\t")).toBe(true);
    expect(isEmptyAssistantResponse("结论：可以继续观察。")).toBe(false);
  });
});
