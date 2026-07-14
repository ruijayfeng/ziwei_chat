import { describe, expect, test } from "vitest";

import { topicEntryGridClassName } from "../../src/lib/ui/topic-entry-layout";

describe("topic entry layout", () => {
  test("uses equal two-column and three-column grids without desktop spans", () => {
    expect(topicEntryGridClassName).toBe("grid grid-cols-2 gap-2 lg:grid-cols-3");
  });
});
