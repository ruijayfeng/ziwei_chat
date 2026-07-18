import { randomUUID } from "node:crypto";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { afterAll, describe, expect, test } from "vitest";

import { GET as getConversations } from "../../src/app/api/conversations/route";
import { createChart } from "../../src/lib/chart/create-chart";
import { createPostgresChatPersistence } from "../../src/lib/db/chat-persistence";
import { createPostgresChartPersistence } from "../../src/lib/db/chart-persistence";
import { schema } from "../../src/lib/db/schema";
import { aggregateInsightSources, insightEligibility } from "../../src/lib/insights/source";
import { loadInsightSourceBundle } from "../../src/lib/ui/insight-sources";

const databaseUrl = process.env.DATABASE_URL;
const describePostgres = databaseUrl ? describe : describe.skip;

describePostgres("Final V1+ Postgres release lifecycle", () => {
  const client = postgres(databaseUrl!, { max: 2 });
  const database = drizzle(client, { schema });
  const chartPersistence = createPostgresChartPersistence(database);
  const chatPersistence = createPostgresChatPersistence(database);

  afterAll(async () => client.end({ timeout: 5 }));

  test("persists chart and eligible insight sources, then cascades anonymous deletion", async () => {
    const profileId = randomUUID();
    const firstConversationId = randomUUID();
    const secondConversationId = randomUUID();
    const input = {
      profileId,
      name: "Release lifecycle fixture",
      gender: "male" as const,
      birthDate: "1990-05-17",
      birthTime: "12:00",
      calendarType: "solar" as const,
      isPrimary: true,
    };
    const chart = createChart(input);
    expect(chart.ok).toBe(true);
    if (!chart.ok) return;

    try {
      await chartPersistence.savePrimaryChart(input, chart.data);
      const persistedChart = JSON.parse(JSON.stringify(chart.data));
      await expect(chartPersistence.getPrimaryChart(profileId)).resolves.toEqual(persistedChart);

      await chatPersistence.saveMessage({
        profileId,
        conversationId: firstConversationId,
        role: "user",
        content: "最近工作选择让我反复犹豫。",
      });
      await chatPersistence.saveMessage({
        profileId,
        conversationId: firstConversationId,
        role: "assistant",
        content: "先把可逆的小范围尝试列出来。",
      });
      await chatPersistence.saveMessage({
        profileId,
        conversationId: secondConversationId,
        role: "user",
        content: "关系里我也常常先退后进。",
      });
      await chatPersistence.saveMessage({
        profileId,
        conversationId: secondConversationId,
        role: "user",
        content: "我想观察这种模式，而不是把它当结论。",
      });

      // The public persistence contract owns message creation; this fixture-only
      // adjustment supplies the second activity day required by Insights eligibility.
      await client`
        update messages
        set created_at = now() - interval '1 day'
        where conversation_id = ${firstConversationId}
      `;
      await client`
        update conversations
        set last_message_at = now() - interval '1 day', updated_at = now() - interval '1 day'
        where id = ${firstConversationId}
      `;

      const summaries = await chatPersistence.listConversations?.(profileId);
      const details = await chatPersistence.listMessages?.(profileId, firstConversationId);
      expect(summaries).toHaveLength(2);
      expect(details).toHaveLength(2);

      const routeFetch: typeof fetch = async (input) => {
        const url = new URL(String(input), "http://localhost");
        return getConversations(new Request(url));
      };
      const sourceBundle = await loadInsightSourceBundle(profileId, null, routeFetch);
      expect(sourceBundle.conversations).toHaveLength(2);
      expect(sourceBundle.conversations.flatMap((item) => item.messages)).toHaveLength(4);
      expect(insightEligibility(await aggregateInsightSources(sourceBundle)).eligible).toBe(true);

      await chatPersistence.deleteProfileData?.(profileId);

      await expect(chartPersistence.getPrimaryChart(profileId)).resolves.toBeNull();
      await expect(chatPersistence.listConversations?.(profileId)).resolves.toEqual([]);
      const remainingMessages = await client`
        select count(*)::int as count
        from messages
        where conversation_id in (${firstConversationId}, ${secondConversationId})
      `;
      expect(remainingMessages[0]?.count).toBe(0);
      const tombstone = await client`
        select profile_id::text as "profileId"
        from profile_deletions
        where profile_id = ${profileId}
      `;
      expect(tombstone[0]?.profileId).toBe(profileId);
    } finally {
      await client`delete from profiles where id = ${profileId}`;
      await client`delete from profile_deletions where profile_id = ${profileId}`;
    }
  }, 120_000);
});
