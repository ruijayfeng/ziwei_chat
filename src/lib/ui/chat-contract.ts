/**
 * [INPUT]: Depends on chart input, browser-owned model settings, and normalized evidence contracts
 * [OUTPUT]: Provides the shared browser-to-/api/chat wire types without changing the existing protocol
 * [POS]: Stable type boundary shared by the chat route, transport, and session UI
 * [PROTOCOL]: Update this header when changed, then check AGENTS.md
 */

import type { CreateChartInput } from "../domain/chart";
import type { EvidenceState } from "./chat-evidence";
import type { ModelSettingsRequest } from "./model-settings";

export type ChatRequestMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

export type ChatRequestBody = {
  profileId?: string;
  conversationId?: string;
  messages?: ChatRequestMessage[];
  message?: string;
  chartInput?: CreateChartInput;
  modelSettings?: ModelSettingsRequest;
  evidenceRunId?: string;
};

export type ChatEvidence = EvidenceState;
