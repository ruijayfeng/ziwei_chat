import { describe, expect, test } from "vitest";

import { routeIntent } from "../../src/lib/agent/intent-router";
import { ACTIVE_TOPICS } from "../../src/lib/ui/active-topics";

describe("routeIntent", () => {
  test("routes ordinary career questions to the career intent", () => {
    expect(routeIntent("我最近想换工作，适合动吗？")).toMatchObject({
      intent: "career",
      confidence: expect.any(Number),
      requiresChart: true,
    });
  });

  test("routes graduate exam and study-decision fortune questions to career", () => {
    expect(routeIntent("我不知道该不该考研，考研到底运势怎么样")).toMatchObject({
      intent: "career",
      confidence: expect.any(Number),
      requiresChart: true,
    });
  });

  test("routes out-of-scope divination systems away from Ziwei analysis", () => {
    expect(routeIntent("帮我用八字看看今年运势。")).toMatchObject({
      intent: "out_of_scope",
      requiresChart: false,
    });
  });

  test("routes medical, legal, or investment instructions as safety sensitive", () => {
    expect(routeIntent("我应该买哪只股票才能发财？")).toMatchObject({
      intent: "safety_sensitive",
      safetyLevel: "refusal",
    });
  });

  test("routes every canonical starter question to its declared chart-backed intent", () => {
    for (const topic of ACTIVE_TOPICS) {
      expect(routeIntent(topic.question), topic.id).toMatchObject({
        intent: topic.intent,
        requiresChart: true,
      });
    }
  });
});
