/**
 * [INPUT]: Depends on completed or progressively received assistant content
 * [OUTPUT]: Provides Unicode-safe reveal progress helpers
 * [POS]: Pure pacing helper used by the chat answer presentation layer
 * [PROTOCOL]: Update this header when changed, then check AGENTS.md
 */

export function nextRevealLength(content: string, visibleLength: number, step = 1) {
  const length = Array.from(content).length;
  return Math.min(length, Math.max(visibleLength, 0) + Math.max(step, 1));
}

export function revealStepForContent(contentLength: number) {
  const targetFrames = 120;
  return Math.max(1, Math.ceil(Math.max(contentLength, 0) / targetFrames));
}

export function revealDelayForContent(contentLength: number) {
  if (contentLength < 120) return 32;
  if (contentLength < 900) return 24;
  return 20;
}

export function sliceByCharacters(content: string, length: number) {
  return Array.from(content).slice(0, Math.max(length, 0)).join("");
}
