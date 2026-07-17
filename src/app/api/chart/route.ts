/**
 * [INPUT]: Depends on CreateChartInput, deterministic chart tools, and runtime chart persistence
 * [OUTPUT]: Provides backward-compatible chart summary plus sanitized twelve-palace display data
 * [POS]: Explicit chart-save boundary, separate from chat streaming and model execution
 * [PROTOCOL]: Update this header when changed, then check AGENTS.md
 */

import { createRequestStores, getChartPersistence } from "../../../lib/agent/chat-runtime";
import { createAgentTools } from "../../../lib/agent/tools";
import { buildChartDisplayModel } from "../../../lib/chart/chart-display";
import type { ChartPersistence } from "../../../lib/db/chart-persistence";
import type { CreateChartInput } from "../../../lib/domain/chart";

export async function POST(request: Request) {
  const body = (await request.json()) as { profileId?: string; chart?: CreateChartInput };
  const profileId = body.profileId ?? body.chart?.profileId;
  if (!profileId || !body.chart) {
    return Response.json({ error: "profileId and chart are required" }, { status: 400 });
  }

  const stores = createRequestStores();
  const tools = createAgentTools({ stores, chartPersistence: getChartPersistence() });
  const result = await tools.createChart({ ...body.chart, profileId, isPrimary: true });
  if (!result.ok) {
    return Response.json({ error: result.error }, { status: 422 });
  }

  return Response.json({
    chartId: result.data.chartId,
    displayName: result.data.displayName,
    summary: result.data.summary,
    display: buildChartDisplayModel({
      chartId: result.data.chartId,
      displayName: result.data.displayName,
      chartJson: result.data.chartJson,
    }),
  });
}

export async function GET(request: Request) {
  const profileId = new URL(request.url).searchParams.get("profileId");
  if (!profileId) {
    return Response.json({ error: "profileId is required" }, { status: 400 });
  }

  const stores = createRequestStores();
  const chartId = stores.primaryChartByProfileId.get(profileId);
  const chart = chartId ? stores.charts.get(chartId) : undefined;
  if (chart?.input) {
    return Response.json({
      chart: chart.input,
      chartId: chart.chartId,
      displayName: chart.displayName,
      summary: chart.summary,
      display: buildChartDisplayModel({
        chartId: chart.chartId,
        displayName: chart.displayName,
        chartJson: chart.chartJson,
      }),
    });
  }

  let persisted;
  try {
    persisted = await readPrimaryChartWithTimeout(getChartPersistence(), profileId);
  } catch {
    return Response.json({ error: "primary chart restore is temporarily unavailable", canRetry: true }, { status: 503 });
  }
  if (!persisted) return Response.json({ error: "primary chart not found" }, { status: 404 });

  return Response.json({
    chart: persisted.input,
    chartId: persisted.output.chartId,
    displayName: persisted.output.displayName,
    summary: persisted.output.summary,
    display: buildChartDisplayModel({
      chartId: persisted.output.chartId,
      displayName: persisted.output.displayName,
      chartJson: persisted.output.chartJson,
    }),
  });
}

export async function readPrimaryChartWithTimeout(
  persistence: ChartPersistence | null,
  profileId: string,
  timeoutMs = 3_000,
) {
  if (!persistence?.getPrimaryChartRecord) return null;

  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      persistence.getPrimaryChartRecord(profileId),
      new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error("chart restore timeout")), timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId !== undefined) clearTimeout(timeoutId);
  }
}
