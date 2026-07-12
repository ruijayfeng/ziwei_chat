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
import { createPostgresChartPersistence, type ChartPersistence } from "../db/chart-persistence";
import { getDatabaseClient } from "../db/client";

let stores = createInMemoryToolStores();
let persistence = createRuntimePersistence();
let chartPersistence = createRuntimeChartPersistence();

export function getChatRuntimeStores() {
  return stores;
}

export async function persistChatMessage(message: PersistedChatMessage) {
  await persistence.saveMessage(message);
}

export async function recordRouteToolEvent(
  profileId: string,
  conversationId: string,
  toolName: string,
  input: unknown,
  output: unknown,
  success: boolean,
) {
  const event: PersistedToolEvent = {
    profileId,
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

export function mergeRequestStoresToSnapshot(requestStores: InMemoryToolStores) {
  for (const [chartId, chart] of requestStores.charts.entries()) {
    stores.charts.set(chartId, chart);
  }
  for (const [profileId, chartId] of requestStores.primaryChartByProfileId.entries()) {
    stores.primaryChartByProfileId.set(profileId, chartId);
  }
  for (const event of requestStores.toolEvents) {
    stores.toolEvents.push(event);
  }
  for (const summary of requestStores.conversationSummaries) {
    stores.conversationSummaries.push(summary);
  }
  for (const memory of requestStores.memories) {
    stores.memories.push(memory);
  }
}

export async function recordRouteToolEventToStores(
  requestStores: InMemoryToolStores,
  profileId: string,
  conversationId: string,
  toolName: string,
  input: unknown,
  output: unknown,
  success: boolean,
) {
  const event: PersistedToolEvent = {
    profileId,
    conversationId,
    toolName,
    input,
    output,
    success,
    latencyMs: 0,
  };

  requestStores.toolEvents.push(event);
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
  await persistence.deleteProfileData?.(profileId);
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

  return createInMemoryChatPersistence();
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
