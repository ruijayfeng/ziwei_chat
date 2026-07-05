/**
 * [INPUT]: Depends on persisted chat message and tool event shapes
 * [OUTPUT]: Provides storage-agnostic chat persistence contract and in-memory implementation
 * [POS]: Persistence boundary between chat route orchestration and Postgres/in-memory storage
 * [PROTOCOL]: Update this header when changed, then check AGENTS.md
 */

export type PersistedChatMessage = {
  conversationId: string;
  profileId: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  metadata?: Record<string, unknown>;
};

export type PersistedToolEvent = {
  profileId?: string;
  conversationId: string;
  messageId?: string;
  toolName: string;
  input: unknown;
  output: unknown;
  success: boolean;
  latencyMs: number;
};

export type ChatPersistence = {
  saveMessage(message: PersistedChatMessage): Promise<void>;
  saveToolEvent(event: PersistedToolEvent): Promise<void>;
  deleteProfileData?(profileId: string): Promise<void>;
  snapshot?: () => {
    messages: PersistedChatMessage[];
    toolEvents: PersistedToolEvent[];
  };
};

export function createInMemoryChatPersistence(): ChatPersistence {
  const messages: PersistedChatMessage[] = [];
  const toolEvents: PersistedToolEvent[] = [];

  return {
    async saveMessage(message) {
      messages.push(message);
    },
    async saveToolEvent(event) {
      toolEvents.push(event);
    },
    async deleteProfileData(profileId) {
      for (let index = messages.length - 1; index >= 0; index -= 1) {
        if (messages[index]?.profileId === profileId) {
          messages.splice(index, 1);
        }
      }
      for (let index = toolEvents.length - 1; index >= 0; index -= 1) {
        if (toolEvents[index]?.profileId === profileId) {
          toolEvents.splice(index, 1);
        }
      }
    },
    snapshot() {
      return {
        messages: [...messages],
        toolEvents: [...toolEvents],
      };
    },
  };
}
