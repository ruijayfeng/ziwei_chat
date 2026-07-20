/**
 * [INPUT]: Depends on a sanitized full chart display model and stable palace id
 * [OUTPUT]: Provides real-index three-way/four-direction relationships
 * [POS]: Pure chart geometry helper used by the redesigned chart UI
 * [PROTOCOL]: Update this header when changed, then check AGENTS.md
 */

import type { ChartDisplayModel } from "../domain/chart-display";

export function getRelatedPalaceIds(model: ChartDisplayModel, selectedId: string) {
  const selected = model.palaces.find((palace) => palace.id === selectedId);
  if (!selected) return null;

  const byIndex = new Map(model.palaces.map((palace) => [palace.index, palace.id]));
  const trines = [4, 8]
    .map((offset) => byIndex.get((selected.index + offset) % 12))
    .filter((id): id is string => Boolean(id));
  const opposite = byIndex.get((selected.index + 6) % 12);
  if (trines.length !== 2 || !opposite) return null;

  return { selected: selected.id, trines, opposite };
}
