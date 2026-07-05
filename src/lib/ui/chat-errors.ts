/**
 * [INPUT]: Depends on Fetch Response and unknown error values
 * [OUTPUT]: Provides chat error classification helpers for UI components
 * [POS]: UI support module consumed by the chat shell and tested outside React
 * [PROTOCOL]: Update this header when changed, then check AGENTS.md
 */

export type ChatErrorKind = "network" | "rate_limit" | "server" | "empty_response";

export type ChatErrorState = {
  kind: ChatErrorKind;
  message: string;
  canRetry: boolean;
};

export const chatErrorMessages: Record<ChatErrorKind, string> = {
  network: "网络连接失败，请稍后重试。",
  rate_limit: "请求太频繁了，请稍等一下再继续。",
  server: "分析没有完成，请重试。",
  empty_response: "这次没有生成可读回复，请重新发送。",
};

export function classifyChatError(error: unknown): ChatErrorState {
  const kind: ChatErrorKind =
    error instanceof Response && error.status === 429 ? "rate_limit" : "network";

  return {
    kind,
    message: chatErrorMessages[kind],
    canRetry: true,
  };
}

export function chatErrorFromResponse(response: Response): ChatErrorState | null {
  if (response.ok) return null;

  const kind: ChatErrorKind = response.status === 429 ? "rate_limit" : "server";

  return {
    kind,
    message: chatErrorMessages[kind],
    canRetry: true,
  };
}

export function emptyAssistantResponseError(): ChatErrorState {
  return {
    kind: "empty_response",
    message: chatErrorMessages.empty_response,
    canRetry: true,
  };
}

export function isEmptyAssistantResponse(content: string): boolean {
  return content.trim().length === 0;
}
