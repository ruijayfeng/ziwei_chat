import Link from "next/link";

import type { ChartDisplayModel } from "@/lib/domain/chart-display";

export function HomeChartRing({ model }: { model: ChartDisplayModel | null }) {
  if (!model) {
    return (
      <div className="flex aspect-square w-full max-w-[25rem] flex-col items-center justify-center rounded-full border border-dashed border-border px-12 text-center">
        <p className="font-serif text-2xl font-bold">先建立你的命盘</p>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">出生资料完成确定性排盘后，对话才会引用真实宫位与星曜。</p>
        <Link className="mt-5 min-h-11 rounded-xl bg-cinnabar px-4 py-3 text-sm font-bold text-white" href="/chart">创建命盘</Link>
      </div>
    );
  }

  const lifePalace = model.palaces.find((palace) => palace.name === "命宫");

  return (
    <Link
      aria-label="查看完整命盘"
      className="relative block aspect-square w-full max-w-[25rem] rounded-full border border-border/80 transition-colors hover:border-primary/50"
      href="/chart"
    >
      <div className="absolute inset-[25%] flex flex-col items-center justify-center rounded-full border border-border/65 bg-card/70 px-5 text-center">
        <p className="text-xs text-muted-foreground">{model.displayName}</p>
        <p className="mt-2 font-serif text-2xl font-bold">{lifePalace?.name ?? "命盘"}</p>
        <p className="mt-2 text-xs leading-5 text-muted-foreground">
          {lifePalace?.majorStars.map((star) => star.name).join("、") || "本宫无主星"}
        </p>
      </div>
      {model.palaces.map((palace) => {
        const position = polarPercent(palace.index);
        return (
          <span
            className="absolute flex size-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background text-xs text-muted-foreground"
            key={palace.id}
            style={{ left: `${position.left}%`, top: `${position.top}%` }}
          >
            {palace.name.replace("宫", "")}
          </span>
        );
      })}
    </Link>
  );
}

function polarPercent(index: number) {
  const radians = ((index * 30 - 90) * Math.PI) / 180;
  return { left: 50 + Math.cos(radians) * 43, top: 50 + Math.sin(radians) * 43 };
}
