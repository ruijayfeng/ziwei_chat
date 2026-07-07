/**
 * [INPUT]: Depends on OpenAI-compatible embedding settings and fetch
 * [OUTPUT]: Provides embedding generation with structured success/failure results
 * [POS]: Knowledge retrieval support used by local index and future pgvector ingestion
 * [PROTOCOL]: Update this header when changed, then check AGENTS.md
 */

import type { ResolvedProviderSettings } from "../agent/model-provider";

export type GenerateEmbeddingInput = {
  settings: ResolvedProviderSettings;
  input: string;
  fetchImplementation?: typeof fetch;
};

export type GenerateEmbeddingResult =
  | { ok: true; embedding: number[] }
  | { ok: false; error: string };

export async function generateEmbedding({
  settings,
  input,
  fetchImplementation = fetch,
}: GenerateEmbeddingInput): Promise<GenerateEmbeddingResult> {
  if (!settings.enabled) {
    return { ok: false, error: "embedding settings are incomplete" };
  }

  try {
    const response = await fetchImplementation(`${settings.baseUrl}/embeddings`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${settings.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: settings.model,
        input,
      }),
    });

    if (!response.ok) {
      return { ok: false, error: `embedding request failed with status ${response.status}` };
    }

    const json = (await response.json()) as {
      data?: Array<{ embedding?: unknown }>;
    };
    const embedding = json.data?.[0]?.embedding;

    if (!isNumberArray(embedding)) {
      return { ok: false, error: "embedding response is missing a numeric vector" };
    }

    return { ok: true, embedding };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "embedding request failed",
    };
  }
}

function isNumberArray(value: unknown): value is number[] {
  return Array.isArray(value) && value.length > 0 && value.every((item) => typeof item === "number");
}
