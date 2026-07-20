/**
 * [INPUT]: Depends only on the accepted reference-chart presentation vocabulary
 * [OUTPUT]: Provides palace view types, four-transform tones, and deterministic geometry helpers
 * [POS]: Data-free visual contract shared by the real chart adapter and active chart renderers
 * [PROTOCOL]: Update this header when changed, then check AGENTS.md
 */

export type SihuaType = "化禄" | "化权" | "化科" | "化忌";

export type MainStar = {
  name: string;
  sihua?: SihuaType;
  brightness?: string;
};

export type Palace = {
  id: string;
  sourceIndex: number;
  name: string;
  branch: string;
  mainStars: MainStar[];
  minorStars: string[];
  keywords: string[];
  rating: number | null;
  summary: string;
  aiTraits: string[];
  basis: string[];
  related: string[];
};

export const SIHUA_TONE: Record<SihuaType, string> = {
  化禄: "var(--emerald)",
  化权: "var(--violet)",
  化科: "var(--blue)",
  化忌: "var(--gold)",
};

export function getRelatedIndices(index: number) {
  const trineA = (index + 4) % 12;
  const trineB = (index + 8) % 12;
  const opposite = (index + 6) % 12;
  return { trine: [index, trineA, trineB], opposite };
}
