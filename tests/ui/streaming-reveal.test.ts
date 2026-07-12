import { expect, it } from "vitest";

import { nextRevealLength } from "../../src/lib/ui/streaming-reveal";

it("reveals a bounded number of complete Unicode characters per frame", () => {
  expect(nextRevealLength("紫微✨", 0, 2)).toBe(2);
  expect(nextRevealLength("紫微✨", 2, 2)).toBe(3);
  expect(nextRevealLength("紫微✨", 3, 2)).toBe(3);
});
