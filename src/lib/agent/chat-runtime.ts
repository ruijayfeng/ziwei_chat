/**
 * [INPUT]: Depends on in-memory tool stores, database availability, and chat/chart persistence adapters
 * [OUTPUT]: Provides resettable runtime stores plus bounded chat, tool-event, and chart persistence operations
 * [POS]: Runtime composition boundary selecting Postgres persistence when configured and no-op/in-memory behavior otherwise
 * [PROTOCOL]: Update this header when changed, then check AGENTS.md
 */

import {
  createNoopChatPersistence,
  type PersistedChatMessage,
  type PersistedToolEvent,
} from "./chat-persistence";
import { createInMemoryToolStores, type InMemoryToolStores } from "./tools";
import { createPostgresChatPersistence } from "../db/chat-persistence";
import { createPostgresChartPersistence, type ChartPersistence } from "../db/chart-persistence";
import { getDatabaseClient } from "../db/client";

let stores = createInMemoryToolStores();
let persistence = createRuntimePersistence();
let chartPersistence = createRuntimeChartPersistence();

export function getChatRuntimeStores() {
  return stores;
}

export async function persistChatMessage(message: PersistedChatMessage, timeoutMs = 3_000) {
  try {
    await withTimeout(persistence.saveMessage(message), timeoutMs);
  } catch (error) {
    console.warn("Chat message persistence failed", {
      code: error instanceof PersistenceTimeoutError
        ? "CHAT_MESSAGE_PERSISTENCE_TIMEOUT"
        : "CHAT_MESSAGE_PERSISTENCE_FAILED",
      role: message.role,
    });
  }
}

export async function recordRouteToolEvent(
  profileId: string,
  conversationId: string,
  toolName: string,
  input: unknown,
  output: unknown,
  success: boolean,
  latencyMs = 0,
) {
  const event: PersistedToolEvent = {
    profileId,
    conversationId,
    toolName,
    input,
    output,
    success,
    latencyMs,
  };

  stores.toolEvents.push(event);
  persistToolEventBestEffort(event);
}

export function createRequestStores(): InMemoryToolStores {
  const requestStores = createInMemoryToolStores();

  // Charts are deterministic profile state. Copy only chart ownership into a new
  // request store so evidence and tool events remain scoped to this request.
  for (const [chartId, chart] of stores.charts.entries()) {
    requestStores.charts.set(chartId, chart);
  }
  for (const [profileId, chartId] of stores.primaryChartByProfileId.entries()) {
    requestStores.primaryChartByProfileId.set(profileId, chartId);
  }

  return requestStores;
}

export function getChartPersistence(): ChartPersistence | null {
  return chartPersistence;
}

export async function recordRouteToolEventToStores(
  requestStores: InMemoryToolStores,
  profileId: string,
  conversationId: string,
  toolName: string,
  input: unknown,
  output: unknown,
  success: boolean,
  latencyMs = 0,
) {
  const event: PersistedToolEvent = {
    profileId,
    conversationId,
    toolName,
    input,
    output,
    success,
    latencyMs,
  };

  requestStores.toolEvents.push(event);
  persistToolEventBestEffort(event);
}

function persistToolEventBestEffort(event: PersistedToolEvent) {
  try {
    void Promise.resolve(persistence.saveToolEvent(event)).catch(() => {
      reportToolEventPersistenceFailure(event.toolName);
    });
  } catch {
    reportToolEventPersistenceFailure(event.toolName);
  }
}

function reportToolEventPersistenceFailure(toolName: string) {
  console.warn("Agent telemetry persistence failed", {
    code: "TOOL_EVENT_PERSISTENCE_FAILED",
    toolName,
  });
}

class PersistenceTimeoutError extends Error {}

async function withTimeout<T>(operation: Promise<T>, timeoutMs: number): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation,
      new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => reject(new PersistenceTimeoutError()), timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId !== undefined) clearTimeout(timeoutId);
  }
}

export function getChatRuntimeSnapshot() {
  const persisted = persistence.snapshot?.() ?? { messages: [], toolEvents: [] };

  return {
    messages: persisted.messages,
    toolEvents: [...stores.toolEvents],
    persistedToolEvents: persisted.toolEvents,
  };
}

export async function listProfileConversations(profileId: string) {
  return persistence.listConversations?.(profileId) ?? [];
}

export async function listProfileConversationMessages(profileId: string, conversationId: string) {
  return persistence.listMessages?.(profileId, conversationId) ?? [];
}

export async function deleteProfileRuntimeData(profileId: string) {
  await persistence.deleteProfileData?.(profileId);

  const ownedChartIds = new Set<string>();
  for (const [chartId, chart] of stores.charts.entries()) {
    if (chart.profileId === profileId) {
      ownedChartIds.add(chartId);
      stores.charts.delete(chartId);
    }
  }

  stores.primaryChartByProfileId.delete(profileId);
  removeProfileOwnedItems(stores.conversationSummaries, profileId);
  removeProfileOwnedItems(stores.memories, profileId);
  for (let index = stores.toolEvents.length - 1; index >= 0; index -= 1) {
    const event = stores.toolEvents[index];
    if (
      event?.profileId === profileId ||
      (event?.chartId !== undefined && ownedChartIds.has(event.chartId))
    ) {
      stores.toolEvents.splice(index, 1);
    }
  }
}

export function resetChatRuntime() {
  stores = createInMemoryToolStores();
  persistence = createRuntimePersistence();
  chartPersistence = createRuntimeChartPersistence();
}

export function replaceChatRuntimeStores(nextStores: InMemoryToolStores) {
  stores = nextStores;
}

function createRuntimePersistence() {
  if (process.env.DATABASE_URL) {
    return createPostgresChatPersistence(getDatabaseClient());
  }

  return createNoopChatPersistence();
}

function createRuntimeChartPersistence(): ChartPersistence | null {
  if (!process.env.DATABASE_URL) return null;

  return createPostgresChartPersistence(getDatabaseClient());
}

function removeProfileOwnedItems<TItem extends { profileId: string }>(
  items: TItem[],
  profileId: string,
) {
  for (let index = items.length - 1; index >= 0; index -= 1) {
    if (items[index]?.profileId === profileId) {
      items.splice(index, 1);
    }
  }
}
