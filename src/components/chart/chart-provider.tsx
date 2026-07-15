"use client";

import { createContext, useContext, useMemo, useState } from "react";

import type { ChartDisplayModel } from "@/lib/domain/chart-display";

type ChartContextValue = {
  model: ChartDisplayModel;
  selectedId: string;
  setSelectedId: (id: string) => void;
  hoveredId: string | null;
  setHoveredId: (id: string | null) => void;
};

const ChartContext = createContext<ChartContextValue | null>(null);

export function ChartProvider({ model, children }: { model: ChartDisplayModel; children: React.ReactNode }) {
  const initialId = model.palaces.find((palace) => palace.name === "命宫")?.id ?? model.palaces[0]?.id ?? "";
  const [requestedSelectedId, setSelectedId] = useState(initialId);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const selectedId = model.palaces.some((palace) => palace.id === requestedSelectedId)
    ? requestedSelectedId
    : initialId;

  const value = useMemo(() => ({ model, selectedId, setSelectedId, hoveredId, setHoveredId }), [model, selectedId, hoveredId]);
  return <ChartContext.Provider value={value}>{children}</ChartContext.Provider>;
}

export function useChartDisplay() {
  const value = useContext(ChartContext);
  if (!value) throw new Error("useChartDisplay must be used within ChartProvider");
  return value;
}
