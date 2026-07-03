/**
 * [INPUT]: Depends on in-memory agent tool stores and route-level persistence needs
 * [OUTPUT]: Provides resettable runtime state for local MVP chat route and tests
 * [POS]: Temporary persistence boundary until Postgres-backed services replace it
 * [PROTOCOL]: Update this header when changed, then check AGENTS.md
 */

import {
  createInMemoryChatPersistence,
  type PersistedChatMessage,
  type PersistedToolEvent,
} from "./chat-persistence";
import { createInMemoryToolStores, type InMemoryToolStores } from "./tools";
import { createPostgresChatPersistence } from "../db/chat-persistence";
import { getDatabaseClient } from "../db/client";

let stores = createInMemoryToolStores();
let persistence = createRuntimePersistence();

export function getChatRuntimeStores() {
  return stores;
}

export async function persistChatMessage(message: PersistedChatMessage) {
  await persistence.saveMessage(message);
}

export async function recordRouteToolEvent(
  conversationId: string,
  toolName: string,
  input: unknown,
  output: unknown,
  success: boolean,
) {
  const event: PersistedToolEvent = {
    conversationId,
    toolName,
    input,
    output,
    success,
    latencyMs: 0,
  };

  stores.toolEvents.push(event);
  await persistence.saveToolEvent(event);
}

export function getChatRuntimeSnapshot() {
  const persisted = persistence.snapshot?.() ?? { messages: [], toolEvents: [] };

  return {
    messages: persisted.messages,
    toolEvents: [...stores.toolEvents],
    persistedToolEvents: persisted.toolEvents,
  };
}

export async function deleteProfileRuntimeData(profileId: string) {
  for (const [chartId, chart] of stores.charts.entries()) {
    if (chart.profileId === profileId) {
      stores.charts.delete(chartId);
    }
  }

  stores.primaryChartByProfileId.delete(profileId);
  await persistence.deleteProfileData?.(profileId);
}

export function resetChatRuntime() {
  stores = createInMemoryToolStores();
  persistence = createRuntimePersistence();
}

export function replaceChatRuntimeStores(nextStores: InMemoryToolStores) {
  stores = nextStores;
}

function createRuntimePersistence() {
  if (process.env.DATABASE_URL) {
    return createPostgresChatPersistence(getDatabaseClient());
  }

  return createInMemoryChatPersistence();
}
