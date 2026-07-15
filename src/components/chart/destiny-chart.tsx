"use client";

import { motion } from "motion/react";

import { cn } from "@/lib/utils";
import { getRelatedPalaceIds } from "@/lib/ui/chart-display";
import { useChartDisplay } from "./chart-provider";

function polarPercent(index: number) {
  const radians = ((index * 30 - 90) * Math.PI) / 180;
  return { left: 50 + Math.cos(radians) * 41, top: 50 + Math.sin(radians) * 41 };
}

export function DestinyChart() {
  const { model, selectedId, setSelectedId, hoveredId, setHoveredId } = useChartDisplay();
  const activeId = hoveredId ?? selectedId;
  const relations = getRelatedPalaceIds(model, activeId);
  const selected = model.palaces.find((palace) => palace.id === selectedId) ?? model.palaces[0];
  const relatedIds = new Set([
    ...(relations?.trines ?? []),
    ...(relations?.opposite ? [relations.opposite] : []),
  ]);

  if (!selected) return null;

  return (
    <>
      <div className="grid grid-cols-3 gap-2 sm:hidden" role="group" aria-label="十二宫命盘">
        {model.palaces.map((palace) => {
          const active = palace.id === selectedId;
          const related = relatedIds.has(palace.id);
          return (
            <button
              aria-pressed={active}
              className={cn(
                "flex min-h-16 min-w-0 flex-col items-center justify-center rounded-xl border px-1.5 text-center transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
                palaceToneClass(active, related),
              )}
              key={palace.id}
              onClick={() => setSelectedId(palace.id)}
              type="button"
            >
              <span className="text-sm font-bold">{palace.name}</span>
              <span className="mt-1 max-w-full truncate text-[10px] opacity-75">{palace.earthlyBranch} · {palace.majorStars[0]?.name ?? "空宫"}</span>
            </button>
          );
        })}
      </div>

      <div className="relative mx-auto hidden aspect-square w-full max-w-[680px] sm:block" role="group" aria-label="十二宫命盘">
        <div className="absolute inset-[13%] rounded-full border border-border/80" />
        <div className="absolute inset-[27%] rounded-full border border-border/60" />
        <motion.div
          animate={{ opacity: 1, scale: 1 }}
          className="absolute inset-[31%] flex flex-col items-center justify-center rounded-full border border-border bg-card/90 px-5 text-center"
          initial={{ opacity: 0.7, scale: 0.98 }}
          key={selected.id}
        >
          <p className="text-xs text-muted-foreground">{selected.heavenlyStem}{selected.earthlyBranch}</p>
          <h2 className="mt-2 font-serif text-3xl font-bold">{selected.name}</h2>
          <p className="mt-3 max-w-44 text-sm leading-6 text-muted-foreground">
            {selected.majorStars.map((star) => star.name).join("、") || "本宫无主星"}
          </p>
        </motion.div>

        {model.palaces.map((palace) => {
          const position = polarPercent(palace.index);
          const active = palace.id === activeId;
          const related = relatedIds.has(palace.id);
          return (
            <button
              aria-pressed={palace.id === selectedId}
              className={cn(
                "absolute z-10 flex min-h-16 w-24 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-xl border px-2 text-center transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
                palaceToneClass(active, related),
              )}
              key={palace.id}
              onBlur={() => setHoveredId(null)}
              onClick={() => setSelectedId(palace.id)}
              onFocus={() => setHoveredId(palace.id)}
              onMouseEnter={() => setHoveredId(palace.id)}
              onMouseLeave={() => setHoveredId(null)}
              style={{ left: `${position.left}%`, top: `${position.top}%` }}
              type="button"
            >
              <span className="font-bold">{palace.name}</span>
              <span className="mt-1 text-[11px] opacity-75">{palace.earthlyBranch} · {palace.majorStars[0]?.name ?? "空宫"}</span>
            </button>
          );
        })}
      </div>
    </>
  );
}

function palaceToneClass(active: boolean, related: boolean) {
  return active
    ? "border-cinnabar bg-cinnabar text-white"
    : related
      ? "border-primary/55 bg-accent text-foreground"
      : "border-border bg-card text-muted-foreground hover:border-primary/45 hover:text-foreground";
}
