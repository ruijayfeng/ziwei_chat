import { describe, expect, test } from "vitest";
import { currentCalendarDisplay } from "../../src/lib/ui/current-calendar";

describe("current calendar display", () => {
  test("formats an injected instant in Asia/Shanghai", () => {
    expect(currentCalendarDisplay(new Date("2026-07-16T16:30:00.000Z"))).toEqual({
      dateLabel: "2026\u5e74\u0037\u6708\u0031\u0037\u65e5\u0020\u00b7\u0020\u5468\u4e94",
    });
  });
});
