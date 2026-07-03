/**
 * [INPUT]: Depends on in-memory agent tool stores and route-level persistence needs
 * [OUTPUT]: Provides resettable runtime state for local MVP chat route and tests
 * [POS]: Temporary persistence boundary until Postgres-backed services replace it
 * [PROTOCOL]: Update this header when changed, then check AGENTS.md
 */

import { createInMemoryToolStores, type InMemoryToolStores } from "./tools";

export type PersistedChatMessage = {
  conversationId: string;
  profileId: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  metadata?: Record<string, unknown>;
};

let stores = createInMemoryToolStores();
let messages: PersistedChatMessage[] = [];

export function getChatRuntimeStores() {
  return stores;
}

export function persistChatMessage(message: PersistedChatMessage) {
  messages.push(message);
}

export function recordRouteToolEvent(
  toolName: string,
  input: unknown,
  output: unknown,
  success: boolean,
) {
  stores.toolEvents.push({
    toolName,
    input,
    output,
    success,
    latencyMs: 0,
  });
}

export function getChatRuntimeSnapshot() {
  return {
    messages: [...messages],
    toolEvents: [...stores.toolEvents],
  };
}

export function resetChatRuntime() {
  stores = createInMemoryToolStores();
  messages = [];
}

export function replaceChatRuntimeStores(nextStores: InMemoryToolStores) {
  stores = nextStores;
}
