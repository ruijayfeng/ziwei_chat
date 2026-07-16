import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("reference chat presentation", () => {
  test("uses the reference hero composition", () => {
    const experience = source("src/components/chat/chat-experience.tsx");

    expect(experience).toContain("<HeroHeader />");
    expect(experience).toContain("<DestinyRing />");
    expect(experience).toContain('<ChatComposer variant="hero"');
  });

  test("keeps the reference conversation transition and thinking state", () => {
    const experience = source("src/components/chat/chat-experience.tsx");
    const bubble = source("src/components/chat/message-bubble.tsx");

    expect(experience).toContain("<DestinyRing hideCenter");
    expect(experience).toContain("<ThinkingIndicator />");
    expect(bubble).toContain("ziwei-shimmer");
  });

  test("calls reduced-motion hooks before role-specific returns", () => {
    const bubble = source("src/components/chat/message-bubble.tsx");

    expect(bubble.indexOf("const reduceMotion = useReducedMotion()"))
      .toBeLessThan(bubble.indexOf("if (isUser)"));
  });
});
