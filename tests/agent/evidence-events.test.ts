import { describe, expect, test } from "vitest";

import {
  encodeChatStreamEvent,
  readChatStreamEvent,
  readChatStreamEvents,
} from "../../src/lib/agent/evidence-events";

describe("chat evidence stream events", () => {
  test("round-trips evidence, token, and done events", () => {
    const text = [
      encodeChatStreamEvent({ event: "evidence", data: { step: "模型分析" } }),
      encodeChatStreamEvent({ event: "token", data: "hello" }),
      encodeChatStreamEvent({ event: "done", data: null }),
    ].join("");

    expect(readChatStreamEvents(text)).toEqual({
      events: [
        { event: "evidence", data: { step: "模型分析" } },
        { event: "token", data: "hello" },
        { event: "done", data: null },
      ],
      rest: "",
    });
  });

  test("keeps partial trailing lines buffered", () => {
    expect(readChatStreamEvents('{"event":"token","data":"hel')).toEqual({
      events: [],
      rest: '{"event":"token","data":"hel',
    });
  });

  test("ignores invalid event shapes", () => {
    expect(readChatStreamEvent('{"event":"token","data":1}')).toBeNull();
  });
});
