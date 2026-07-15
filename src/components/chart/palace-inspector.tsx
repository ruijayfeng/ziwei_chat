"use client";

import { getRelatedPalaceIds } from "@/lib/ui/chart-display";
import { useChartDisplay } from "./chart-provider";

export function PalaceInspector() {
  const { model, selectedId } = useChartDisplay();
  const palace = model.palaces.find((item) => item.id === selectedId);
  const relations = getRelatedPalaceIds(model, selectedId);
  if (!palace) return null;

  const relatedNames = relations
    ? [...relations.trines, relations.opposite]
        .map((id) => model.palaces.find((item) => item.id === id)?.name)
        .filter(Boolean)
        .join("、")
    : "";

  return (
    <aside className="rounded-2xl border border-border bg-card/70 p-5">
      <p className="text-xs text-cinnabar">确定性排盘事实</p>
      <div className="mt-3 flex items-end justify-between gap-4">
        <h2 className="font-serif text-3xl font-bold">{palace.name}</h2>
        <span className="text-sm text-muted-foreground">{palace.heavenlyStem}{palace.earthlyBranch}</span>
      </div>
      <FactGroup title="主星" values={palace.majorStars.map(formatStar)} empty="本宫无主星" />
      <FactGroup title="辅星" values={palace.minorStars.map(formatStar)} />
      <FactGroup title="杂曜" values={palace.adjectiveStars.map(formatStar)} />
      <FactGroup title="三方四正" values={relatedNames ? [relatedNames] : []} />
      {(palace.isBodyPalace || palace.isLaiyinPalace) && (
        <div className="mt-5 flex flex-wrap gap-2 text-xs">
          {palace.isBodyPalace ? <span className="rounded-full border border-primary/40 px-3 py-1 text-primary">身宫</span> : null}
          {palace.isLaiyinPalace ? <span className="rounded-full border border-cinnabar/40 px-3 py-1 text-cinnabar">来因宫</span> : null}
        </div>
      )}
    </aside>
  );
}

function FactGroup({ title, values, empty }: { title: string; values: string[]; empty?: string }) {
  if (values.length === 0 && !empty) return null;
  return (
    <div className="mt-5 border-t border-border/70 pt-4">
      <p className="text-xs text-muted-foreground">{title}</p>
      <p className="mt-2 text-sm leading-7 text-foreground">{values.join("、") || empty}</p>
    </div>
  );
}

function formatStar(star: { name: string; brightness: string; mutagen: string }) {
  return [star.name, star.brightness, star.mutagen].filter(Boolean).join(" · ");
}
