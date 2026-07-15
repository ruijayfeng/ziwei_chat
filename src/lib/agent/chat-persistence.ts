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

export type ConversationRecord = {
  id: string;
  title: string;
  lastMessageAt: string;
};

export type ConversationMessageRecord = {
  id: string;
  conversationId: string;
  role: PersistedChatMessage["role"];
  content: string;
  createdAt: string;
};

export type ChatPersistence = {
  saveMessage(message: PersistedChatMessage): Promise<void>;
  saveToolEvent(event: PersistedToolEvent): Promise<void>;
  listConversations?(profileId: string): Promise<ConversationRecord[]>;
  listMessages?(profileId: string, conversationId: string): Promise<ConversationMessageRecord[]>;
  deleteProfileData?(profileId: string): Promise<void>;
  snapshot?: () => {
    messages: PersistedChatMessage[];
    toolEvents: PersistedToolEvent[];
  };
};

export function createInMemoryChatPersistence(): ChatPersistence {
  const messages: PersistedChatMessage[] = [];
  const toolEvents: PersistedToolEvent[] = [];
  const messageRecords: Array<ConversationMessageRecord & { profileId: string; order: number }> = [];
  const conversationRecords = new Map<string, ConversationRecord & { profileId: string; order: number }>();
  let writeOrder = 0;

  return {
    async saveMessage(message) {
      messages.push(message);
      writeOrder += 1;
      const now = new Date().toISOString();
      const current = conversationRecords.get(message.conversationId);
      conversationRecords.set(message.conversationId, {
        id: message.conversationId,
        profileId: message.profileId,
        title: current?.title || (message.role === "user" ? message.content.slice(0, 60) : "未命名对话"),
        lastMessageAt: now,
        order: writeOrder,
      });
      messageRecords.push({
        id: `memory-message-${writeOrder}`,
        conversationId: message.conversationId,
        profileId: message.profileId,
        role: message.role,
        content: message.content,
        createdAt: now,
        order: writeOrder,
      });
    },
    async saveToolEvent(event) {
      toolEvents.push(event);
    },
    async listConversations(profileId) {
      return [...conversationRecords.values()]
        .filter((record) => record.profileId === profileId)
        .sort((left, right) => right.order - left.order)
        .map(({ id, title, lastMessageAt }) => ({ id, title, lastMessageAt }));
    },
    async listMessages(profileId, conversationId) {
      return messageRecords
        .filter((record) => record.profileId === profileId && record.conversationId === conversationId)
        .sort((left, right) => left.order - right.order)
        .map(({ id, role, content, createdAt }) => ({ id, conversationId, role, content, createdAt }));
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
      for (let index = messageRecords.length - 1; index >= 0; index -= 1) {
        if (messageRecords[index]?.profileId === profileId) messageRecords.splice(index, 1);
      }
      for (const [conversationId, record] of conversationRecords.entries()) {
        if (record.profileId === profileId) conversationRecords.delete(conversationId);
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
