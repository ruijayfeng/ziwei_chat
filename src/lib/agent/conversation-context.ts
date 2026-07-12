/**
 * [INPUT]: Depends on a client-supplied, ordered chat transcript
 * [OUTPUT]: Provides bounded, speaker-labeled context for planner and analyst prompts
 * [POS]: Explicit conversation context boundary; it does not persist or infer user memory
 * [PROTOCOL]: Update this header when changed, then check AGENTS.md
 */

export type ConversationMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

const maxTurns = 12;

export function buildConversationContext(messages: ConversationMessage[]) {
  return messages
    .filter((message) => message.content.trim().length > 0)
    .slice(-maxTurns)
    .map((message) => `${message.role === "assistant" ? "助手" : message.role === "system" ? "系统" : "用户"}：${message.content.trim()}`)
    .join("\n");
}
