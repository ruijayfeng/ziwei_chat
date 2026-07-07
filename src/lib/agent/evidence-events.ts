/**
 * [INPUT]: Depends on JSON-serializable evidence snapshots and answer tokens
 * [OUTPUT]: Provides a small newline-delimited event framing protocol for chat streams
 * [POS]: Shared stream boundary between /api/chat and the client app shell
 * [PROTOCOL]: Update this header when changed, then check AGENTS.md
 */

export type ChatStreamEvent =
  | { event: "evidence"; data: unknown }
  | { event: "token"; data: string }
  | { event: "done"; data: null };

export const chatStreamHeader = "events";

export function encodeChatStreamEvent(event: ChatStreamEvent) {
  return `${JSON.stringify(event)}\n`;
}

export function readChatStreamEvents(buffer: string) {
  const lines = buffer.split("\n");
  const rest = lines.pop() ?? "";
  const events = lines.map(readChatStreamEvent).filter(isChatStreamEvent);

  return { events, rest };
}

export function readChatStreamEvent(line: string): ChatStreamEvent | null {
  if (!line.trim()) return null;

  try {
    const value = JSON.parse(line) as ChatStreamEvent;
    if (value.event === "evidence") return value;
    if (value.event === "token" && typeof value.data === "string") return value;
    if (value.event === "done" && value.data === null) return value;
    return null;
  } catch {
    return null;
  }
}

function isChatStreamEvent(value: ChatStreamEvent | null): value is ChatStreamEvent {
  return value !== null;
}
