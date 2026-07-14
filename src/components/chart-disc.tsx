"use client";

/**
 * [INPUT]: Depends on ChartVisualModel and ChartDiscMotionPhase
 * [OUTPUT]: Provides compact and full truthful SVG chart-disc variants
 * [POS]: Shared product-specific chart visualization for sidebar and chart workspace
 * [PROTOCOL]: Update this header when changed, then check AGENTS.md
 */

import { useRef } from "react";
import type { ChartVisualModel } from "@/lib/ui/chart-visual";
import { useChartDiscMotion, type ChartDiscMotionPhase } from "./chart-disc-motion";

type ChartDiscProps = {
  model: ChartVisualModel | null;
  phase: ChartDiscMotionPhase;
  compact?: boolean;
};

export function ChartDisc({ model, phase, compact = false }: ChartDiscProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  useChartDiscMotion(rootRef, phase);
  const palaces = model?.palaces ?? [];
  const label = model ? `${model.displayName}的十二宫位命盘，实际星曜依据分析结果展示` : "等待创建命盘";

  return (
    <div ref={rootRef} aria-label={label} className={`chart-disc ${compact ? "chart-disc-compact" : "chart-disc-full"}`}>
      <svg aria-hidden="true" className="size-full overflow-visible" role="img" viewBox="0 0 240 240">
        <circle className="chart-disc-guide" cx="120" cy="120" r="107" />
        <circle className="chart-disc-guide" cx="120" cy="120" r="82" />
        <circle className="chart-disc-guide chart-disc-guide-strong" cx="120" cy="120" r="58" />
        <g className="chart-disc-ring" transform="rotate(0 120 120)">
          {palaces.map((palace, index) => {
            const angle = (index / 12) * Math.PI * 2 - Math.PI / 2;
            const x = 120 + Math.cos(angle) * 95;
            const y = 120 + Math.sin(angle) * 95;
            const lineX = 120 + Math.cos(angle) * 58;
            const lineY = 120 + Math.sin(angle) * 58;
            return <g className={`chart-disc-node ${palace.active ? "chart-disc-node-active" : ""}`} key={palace.name} transform={`translate(${x} ${y})`}>
              <line className="chart-disc-spoke" x1={120 - x} y1={120 - y} x2={lineX - x} y2={lineY - y} />
              <g className="chart-disc-node-content"><circle className="chart-disc-node-dot" r={palace.active ? 4 : 2.5} /><text className="chart-disc-palace" dy="-8" textAnchor="middle">{palace.name}</text>{!compact && palace.stars.length > 0 ? <text className="chart-disc-stars" dy="5" textAnchor="middle">{palace.stars.slice(0, 2).join(" · ")}</text> : null}</g>
            </g>;
          })}
        </g>
        <g className="chart-disc-core"><circle className="chart-disc-core-halo" cx="120" cy="120" r="31" /><circle className="chart-disc-core-dot" cx="120" cy="120" r="21" /><path className="chart-disc-star" d="M120 107l3.8 9.2 9.2 3.8-9.2 3.8-3.8 9.2-3.8-9.2-9.2-3.8 9.2-3.8z" /></g>
      </svg>
    </div>
  );
}
