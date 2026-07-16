import { describe, expect, test } from "vitest";
import {
  currentCalendarDisplay,
  millisecondsUntilNextShanghaiDay,
} from "../../src/lib/ui/current-calendar";

describe("current calendar display", () => {
  test("formats an injected instant in Asia/Shanghai", () => {
    expect(currentCalendarDisplay(new Date("2026-07-16T16:30:00.000Z"))).toEqual({
      dateLabel: "2026\u5e74\u0037\u6708\u0031\u0037\u65e5\u0020\u00b7\u0020\u5468\u4e94",
    });
  });

  test("returns one second before the next Shanghai day", () => {
    expect(
      millisecondsUntilNextShanghaiDay(new Date("2026-07-16T15:59:59.000Z")),
    ).toBe(1000);
  });

  test("returns one full day at Shanghai midnight", () => {
    expect(
      millisecondsUntilNextShanghaiDay(new Date("2026-07-16T16:00:00.000Z")),
    ).toBe(86400000);
  });
});
