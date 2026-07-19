import { expect, it } from "vitest";

import { nextRevealLength, revealDelayForContent, revealStepForContent } from "../../src/lib/ui/streaming-reveal";

it("reveals a bounded number of complete Unicode characters per frame", () => {
  expect(nextRevealLength("紫微✨", 0, 2)).toBe(2);
  expect(nextRevealLength("紫微✨", 2, 2)).toBe(3);
  expect(nextRevealLength("紫微✨", 3, 2)).toBe(3);
});

it("paces a complete answer to reveal in roughly three seconds", () => {
  expect(revealStepForContent(120)).toBe(1);
  expect(revealStepForContent(600)).toBe(5);
  expect(revealStepForContent(1_200)).toBe(10);
});

it("keeps reveal frames responsive while pacing short and long answers", () => {
  expect(revealDelayForContent(20)).toBe(32);
  expect(revealDelayForContent(600)).toBe(24);
  expect(revealDelayForContent(1_200)).toBe(20);
});
