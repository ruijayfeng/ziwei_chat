/**
 * [INPUT]: Depends on agent tool contract rules from docs/architecture/tool-contracts.md
 * [OUTPUT]: Provides ToolResult helpers for structured success and recoverable errors
 * [POS]: Shared result boundary for deterministic tools and retrieval tools
 * [PROTOCOL]: Update this header when changed, then check AGENTS.md
 */

export type ToolResult<T> =
  | { ok: true; data: T; meta?: Record<string, unknown> }
  | {
      ok: false;
      error: {
        code: string;
        message: string;
        recoverable: boolean;
      };
    };

export function toolOk<T>(
  data: T,
  meta?: Record<string, unknown>,
): ToolResult<T> {
  return meta ? { ok: true, data, meta } : { ok: true, data };
}

export function toolError<T = never>(
  code: string,
  message: string,
  recoverable = true,
): ToolResult<T> {
  return {
    ok: false,
    error: {
      code,
      message,
      recoverable,
    },
  };
}
