/**
 * [INPUT]: Depends on viewport width
 * [OUTPUT]: Provides the responsive inspector presentation policy
 * [POS]: Pure layout policy shared by workspace tests and responsive chrome
 * [PROTOCOL]: Update this header when changed, then check AGENTS.md
 */

export type InspectorPresentation = "sheet" | "rail";

export function inspectorPresentationForWidth(width: number): InspectorPresentation {
  return width >= 1280 ? "rail" : "sheet";
}
