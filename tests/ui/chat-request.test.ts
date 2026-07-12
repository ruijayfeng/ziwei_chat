import { expect, test } from "vitest";

import { chartInputForChatRequest } from "../../src/lib/ui/chat-request";

test("keeps the current chart in every chat request", () => {
  const chart = {
    profileId: "profile-1",
    name: "我的命盘",
    gender: "female" as const,
    birthDate: "1990-05-17",
    birthTime: "12:00",
    calendarType: "solar" as const,
    isPrimary: true,
  };

  expect(chartInputForChatRequest(chart)).toEqual(chart);
  expect(chartInputForChatRequest(null)).toBeUndefined();
});
