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
  timeoutMs?: number;
};

export type GenerateEmbeddingResult =
  | { ok: true; embedding: number[] }
  | { ok: false; error: string; errorCode?: "EMBEDDING_TIMEOUT" | "EMBEDDING_REQUEST_FAILED" };

export async function generateEmbedding({
  settings,
  input,
  fetchImplementation = fetch,
  timeoutMs = 8_000,
}: GenerateEmbeddingInput): Promise<GenerateEmbeddingResult> {
  if (!settings.enabled) {
    return { ok: false, error: "embedding settings are incomplete" };
  }

  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), timeoutMs);

  try {
    const response = await raceWithAbort(
      fetchImplementation(`${settings.baseUrl}/embeddings`, {
      method: "POST",
      signal: abortController.signal,
      headers: {
        Authorization: `Bearer ${settings.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: settings.model,
        input,
      }),
      }),
      abortController.signal,
    );

    if (!response.ok) {
      return {
        ok: false,
        error: `embedding request failed with status ${response.status}`,
        errorCode: "EMBEDDING_REQUEST_FAILED",
      };
    }

    const json = (await raceWithAbort(response.json(), abortController.signal)) as {
      data?: Array<{ embedding?: unknown }>;
    };
    const embedding = json.data?.[0]?.embedding;

    if (!isNumberArray(embedding)) {
      return {
        ok: false,
        error: "embedding response is missing a numeric vector",
        errorCode: "EMBEDDING_REQUEST_FAILED",
      };
    }

    return { ok: true, embedding };
  } catch (error) {
    return {
      ok: false,
      error: abortController.signal.aborted
        ? `embedding request timed out after ${timeoutMs}ms`
        : error instanceof Error
          ? error.message
          : "embedding request failed",
      errorCode: abortController.signal.aborted
        ? "EMBEDDING_TIMEOUT"
        : "EMBEDDING_REQUEST_FAILED",
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

function raceWithAbort<T>(operation: Promise<T>, signal: AbortSignal): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    if (signal.aborted) {
      reject(new Error("embedding request aborted"));
      return;
    }

    const rejectForAbort = () => reject(new Error("embedding request aborted"));
    signal.addEventListener("abort", rejectForAbort, { once: true });
    operation.then(
      (value) => {
        signal.removeEventListener("abort", rejectForAbort);
        resolve(value);
      },
      (error) => {
        signal.removeEventListener("abort", rejectForAbort);
        reject(error);
      },
    );
  });
}

function isNumberArray(value: unknown): value is number[] {
  return Array.isArray(value) && value.length > 0 && value.every((item) => typeof item === "number");
}
