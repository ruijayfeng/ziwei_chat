/**
 * [INPUT]: Depends on /api/chat static-text and newline-event responses, evidence parsing, and chat error helpers
 * [OUTPUT]: Provides an abortable transport that emits evidence/tokens and returns one critic-approved answer
 * [POS]: Browser transport boundary kept separate from React session state and presentation components
 * [PROTOCOL]: Update this header when changed, then check AGENTS.md
 */

import { chatStreamHeader, readChatStreamEvents } from "../agent/evidence-events";
import type { CreateChartInput } from "../domain/chart";
import type { ChatRequestBody, ChatRequestMessage } from "./chat-contract";
import {
  evidenceFromPayload,
  evidenceFromResponse,
  initialEvidence,
  type EvidenceState,
} from "./chat-evidence";
import {
  chatErrorFromResponse,
  classifyChatError,
  emptyAssistantResponseError,
  isEmptyAssistantResponse,
  type ChatErrorState,
} from "./chat-errors";
import type { ModelSettingsRequest } from "./model-settings";

type FetchImplementation = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export type SendChatRequestInput = {
  profileId: string;
  conversationId: string;
  messages: ChatRequestMessage[];
  chartInput?: CreateChartInput;
  modelSettings: ModelSettingsRequest;
  evidenceRunId: string;
  signal?: AbortSignal;
};

export type ChatClientHandlers = {
  onEvidence?: (evidence: EvidenceState) => void;
  onToken?: (token: string) => void;
};

export type ChatClientResult = {
  content: string;
  evidence: EvidenceState;
};

export class ChatClientError extends Error implements ChatErrorState {
  readonly kind: ChatErrorState["kind"];
  readonly canRetry: boolean;

  constructor(error: ChatErrorState) {
    super(error.message);
    this.name = "ChatClientError";
    this.kind = error.kind;
    this.canRetry = error.canRetry;
  }
}

export async function sendChatRequest(
  input: SendChatRequestInput,
  handlers: ChatClientHandlers = {},
  fetchImpl: FetchImplementation = fetch,
): Promise<ChatClientResult> {
  const { signal, ...requestBody } = input;
  let response: Response;

  try {
    response = await fetchImpl("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody satisfies ChatRequestBody),
      signal,
    });
  } catch (error) {
    throw new ChatClientError(classifyChatError(error));
  }

  const responseError = chatErrorFromResponse(response);
  if (responseError) throw new ChatClientError(responseError);

  const hasHeaderEvidence = response.headers.has("X-Ziwei-Evidence");
  let latestEvidence = evidenceFromResponse(response);
  if (hasHeaderEvidence) handlers.onEvidence?.(latestEvidence);

  if (response.headers.get("X-Ziwei-Stream") !== chatStreamHeader) {
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let content = "";
    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const token = decoder.decode(value, { stream: true });
        content += token;
        if (token) handlers.onToken?.(token);
      }
      const finalToken = decoder.decode();
      content += finalToken;
      if (finalToken) handlers.onToken?.(finalToken);
    }
    if (isEmptyAssistantResponse(content)) {
      throw new ChatClientError(emptyAssistantResponseError());
    }
    return { content, evidence: latestEvidence };
  }

  const reader = response.body?.getReader();
  if (!reader) throw protocolError("回答流不可读，请重试。");

  const decoder = new TextDecoder();
  let buffer = "";
  let content = "";
  let didFinish = false;
  let streamError: ChatErrorState | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parsed = readChatStreamEvents(buffer);
    buffer = parsed.rest;

    for (const event of parsed.events) {
      if (didFinish) throw protocolError("回答流在结束后仍包含数据，请重试。");
      if (event.event === "evidence") {
        latestEvidence = evidenceFromPayload(event.data);
        handlers.onEvidence?.(latestEvidence);
      } else if (event.event === "token" && !streamError) {
        content += event.data;
        handlers.onToken?.(event.data);
      } else if (event.event === "error") {
        streamError = { kind: "server", ...event.data };
      } else if (event.event === "done") {
        didFinish = true;
      }
    }
  }

  buffer += decoder.decode();
  if (buffer.trim() || !didFinish) throw protocolError("回答流未正常结束，请重试。");
  if (streamError) throw new ChatClientError(streamError);
  if (isEmptyAssistantResponse(content)) throw new ChatClientError(emptyAssistantResponseError());

  return { content, evidence: latestEvidence ?? initialEvidence };
}

function protocolError(message: string) {
  return new ChatClientError({ kind: "server", message, canRetry: true });
}
