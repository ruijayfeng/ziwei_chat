import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("reference workspace pages", () => {
  test("keeps the reference records composition", () => {
    const page = source("src/app/(workspace)/records/page.tsx");

    expect(page).toContain("你的人生，");
    expect(page).toContain("<LifeTimeline />");
  });

  test("keeps the reference insights composition", () => {
    const page = source("src/app/(workspace)/insights/page.tsx");

    expect(page).toContain("过去的你，");
    expect(page).toContain("<WeeklyLetter />");
    expect(page).toContain("<PatternList />");
  });
});
