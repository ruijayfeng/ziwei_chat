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
  const stage = response.headers.get("X-Ziwei-Error-Stage");
  const requestId = response.headers.get("X-Ziwei-Request-Id");
  const message = stageMessage(stage) ?? chatErrorMessages[kind];

  return {
    kind,
    message: requestId ? `${message}（请求 ${requestId}）` : message,
    canRetry: true,
  };
}

function stageMessage(stage: string | null) {
  if (stage === "chart_hydration") {
    return "命盘读取失败，请重新保存出生信息后重试。";
  }
  if (stage === "analysis_preparation") {
    return "分析准备阶段失败，请重试；右侧过程可查看失败阶段。";
  }
  if (stage === "persist_user_message") {
    return "当前资料暂时保存失败，请稍后重试。";
  }
  if (stage === "restore_chart") {
    return "命盘读取失败，请重试；如果持续失败请重新保存出生信息。";
  }
  if (stage === "chart_facts") {
    return "命盘事实提取阶段失败，请重试。";
  }
  if (stage === "planner") {
    return "分析计划阶段失败，请重试。";
  }
  if (stage === "supplemental_tools") {
    return "命盘工具调用阶段失败，请重试。";
  }
  if (stage === "skill") {
    return "分析 skill 加载阶段失败，请重试。";
  }
  if (stage === "rag") {
    return "知识检索阶段失败，请重试。";
  }
  if (stage === "compose_response") {
    return "回答组织阶段失败，请重试。";
  }
  if (stage === "deterministic_critic") {
    return "回答预检阶段失败，请重试。";
  }
  return null;
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
