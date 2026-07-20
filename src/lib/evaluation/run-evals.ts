/**
 * [INPUT]: Depends on real deterministic routing, planning, chart, skill, RAG, composer, and critic modules
 * [OUTPUT]: Provides provider-free pipeline evaluation with stage evidence and diagnostics
 * [POS]: Deterministic CI gate; provider quality remains a separate acceptance gate
 * [PROTOCOL]: Update this header when changed, then check AGENTS.md
 */

import { pathToFileURL } from "node:url";

import { analysisTopicForIntent } from "../agent/analysis-topic";
import { runResponseCritic } from "../agent/critic";
import { routeIntent } from "../agent/intent-router";
import { buildAnalysisPlan } from "../agent/planner";
import { composeResponse } from "../agent/response-composer";
import { createAgentTools, createInMemoryToolStores } from "../agent/tools";
import type { ToolResult } from "../agent/tool-result";
import type { CritiqueResult } from "../domain/analysis";
import type { ChartFact, CreateChartInput } from "../domain/chart";
import { loadSkill, type ParsedSkill } from "../knowledge/skill-loader";
import { searchKnowledge, type KnowledgeSource } from "../knowledge/search";
import { type EvalCase, seedEvalCases } from "./cases";

export type EvalRun = {
  caseId: string;
  model: string;
  response: string;
  toolEvents: string[];
  criticResult: CritiqueResult;
  outcome: "accepted" | "setup_required" | "expected_rejection" | "failed";
  stages: {
    route: ReturnType<typeof routeIntent>;
    plan: ReturnType<typeof buildAnalysisPlan>;
    facts: ChartFact[];
    supplementalEvidence: string[];
    requiredFacts: { satisfied: string[]; missing: string[] };
    skill: { executed: boolean; success: boolean; skillId: ParsedSkill["skillId"] | null; version: string | null };
    retrieval: { executed: boolean; success: boolean; mode: "local"; sources: string[] };
    critic: CritiqueResult & { executed: boolean; success: boolean };
  };
  passed: boolean;
  failures: string[];
};

const profileId = "00000000-0000-4000-8000-000000000001";

export async function runEvaluationCases(cases: EvalCase[]): Promise<EvalRun[]> {
  const runs: EvalRun[] = [];
  for (const evalCase of cases) {
    try {
      runs.push(await runSingleCase(evalCase));
    } catch (error) {
      runs.push(failedRun(evalCase, error));
    }
  }
  return runs;
}

async function runSingleCase(evalCase: EvalCase): Promise<EvalRun> {
  const route = routeIntent(evalCase.userPrompt);
  const plan = buildAnalysisPlan(route);
  const stages = { route, plan };

  if (evalCase.topic === "invalid_birth_time") return runInvalidChartCase(evalCase, stages);
  if (!evalCase.chartFixture && plan.requiredChartFacts.length > 0) {
    const response = "\u8bf7\u5148\u521b\u5efa\u4e00\u5f20\u547d\u76d8\uff0c\u6211\u624d\u80fd\u57fa\u4e8e\u786e\u5b9a\u6027\u6392\u76d8\u7ee7\u7eed\u5206\u6790\u3002\u4f60\u613f\u610f\u5148\u8865\u5145\u51fa\u751f\u8d44\u6599\u5417\uff1f";
    const critique = critiqueResponse(stages, response, [], [], []);
    return finish(evalCase, stages, {
      response, toolEvents: [], chartFacts: [], skill: null, sources: [], critique,
    });
  }
  if (plan.requiredChartFacts.length === 0) return runRefusalCase(evalCase, stages);
  return runSeriousCase(evalCase, stages);
}

function runRefusalCase(evalCase: EvalCase, stages: StageBase) {
  const response = "\u8fd9\u4e2a\u95ee\u9898\u4e0d\u9002\u5408\u7528\u7d2b\u5fae\u6597\u6570\u7ed9\u5177\u4f53\u6307\u4ee4\u3002\u6211\u53ef\u4ee5\u5e2e\u4f60\u6574\u7406\u73b0\u5b9e\u98ce\u9669\uff0c\u4f46\u4e0d\u80fd\u66ff\u4ee3\u4e13\u4e1a\u5224\u65ad\uff1b\u4f60\u60f3\u628a\u95ee\u9898\u6539\u6210\u53ef\u89c2\u5bdf\u7684\u73b0\u5b9e\u5904\u5883\u5417\uff1f";
  const critique = runResponseCritic({
    intent: stages.route.intent, draft: response, toolsUsed: ["runResponseCritic"],
    chartFacts: [], knowledgeSources: [], safetyLevel: stages.plan.safetyLevel,
  });
  return finish(evalCase, stages, {
    response, toolEvents: [], chartFacts: [], skill: null, sources: [], critique,
  });
}

async function runSeriousCase(evalCase: EvalCase, stages: StageBase) {
  const stores = createInMemoryToolStores();
  const tools = createAgentTools({ stores });
  if (!evalCase.chartFixture) throw new Error(`Eval ${evalCase.id} requires a chart fixture.`);
  const created = requireToolSuccess(
    "chart.create",
    await tools.createChart(evalCase.chartFixture),
  );
  const chartId = created.chartId;
  requireToolSuccess("chart.current", await tools.getCurrentChart({ profileId }));
  const topic = analysisTopicForIntent(stages.route.intent);
  const summary = requireToolSuccess(
    "facts.summary",
    await tools.summarizeChartFacts({ chartId, topics: [topic] }),
  );
  const chartFacts = summary.facts;
  const firstFact = chartFacts[0];
  const supplementalEvidence = await runSupplementalTools(
    tools,
    chartId,
    topic,
    stages.plan.requiredTools,
    firstFact,
  );

  const requestedSkill = stages.plan.requiredSkills[0];
  const skill = requestedSkill ? await loadSkill(requestedSkill as ParsedSkill["skillId"]) : null;
  const sources = await searchKnowledge({
    query: stages.plan.knowledgeQueries[0] ?? topic,
    topic,
    chartTerms: firstFact ? [firstFact.palace, ...firstFact.stars] : [],
    limit: 3,
    retrievalMode: "local",
  });

  const response = composeEvalResponse(chartFacts, supplementalEvidence, skill, sources);
  const beforeCritic = actualToolNames(stores);
  const critique = runResponseCritic({
    intent: stages.route.intent,
    draft: response,
    toolsUsed: beforeCritic,
    chartFacts,
    knowledgeSources: sources,
    safetyLevel: stages.plan.safetyLevel,
    prohibitionIds: skill?.prohibitionIds ?? [],
  });
  return finish(evalCase, stages, {
    response,
    toolEvents: actualToolNames(stores),
    chartFacts,
    supplementalEvidence,
    skill,
    sources,
    critique,
  });
}

async function runInvalidChartCase(evalCase: EvalCase, stages: StageBase) {
  const stores = createInMemoryToolStores();
  const created = await createAgentTools({ stores }).createChart({ ...validChartInput(), birthTime: "25:00" });
  const response = created.ok
    ? "\u547d\u76d8\u5df2\u521b\u5efa\u3002"
    : `\u51fa\u751f\u65f6\u95f4\u65e0\u6548\uff1a${created.error.message} \u4f60\u80fd\u63d0\u4f9b 00:00 \u5230 23:59 \u4e4b\u95f4\u7684\u65f6\u95f4\u5417\uff1f`;
  const toolEvents = stores.toolEvents.map((item) => item.toolName);
  const critique = critiqueResponse(stages, response, toolEvents, [], []);
  return finish(evalCase, stages, {
    response, toolEvents,
    chartFacts: [], skill: null, sources: [], critique,
  });
}

async function runSupplementalTools(
  tools: ReturnType<typeof createAgentTools>, chartId: string,
  topic: ReturnType<typeof analysisTopicForIntent>, requiredTools: string[], firstFact?: ChartFact,
) {
  const evidence: string[] = [];
  if (requiredTools.includes("getPalaceAnalysis") && firstFact) {
    requireToolSuccess(
      "facts.palace",
      await tools.getPalaceAnalysis({ chartId, palace: firstFact.palace, topic }),
    );
  }
  if (requiredTools.includes("getStarAnalysis") && firstFact?.stars.length) {
    requireToolSuccess(
      "facts.star",
      await tools.getStarAnalysis({ chartId, stars: firstFact.stars.slice(0, 3), palace: firstFact.palace, topic }),
    );
  }
  if (requiredTools.includes("getLuckCycle")) {
    const result = requireToolSuccess(
      "facts.luck_cycle",
      await tools.getLuckCycle({
        chartId,
        date: "2026-07-17",
        range: topic === "recent_fortune" ? "three_months" : "current",
        topic,
      }),
    );
    evidence.push(
      `运限范围：${result.range}；活跃周期：${result.activePeriods.join("、")}`,
    );
  }
  return evidence;
}

function composeEvalResponse(
  chartFacts: ChartFact[],
  supplementalEvidence: string[],
  skill: ParsedSkill | null,
  sources: KnowledgeSource[],
) {
  return composeResponse({
    conclusion: "\u8fd9\u4e2a\u95ee\u9898\u53ef\u4ee5\u770b\uff0c\u4f46\u66f4\u9002\u5408\u4f5c\u4e3a\u503e\u5411\u548c\u89c2\u5bdf\u65b9\u5411\u3002",
    chartBasis: [
      ...(chartFacts[0] ? [chartFacts[0].rawText] : []),
      ...supplementalEvidence,
    ],
    plainExplanation: "\u843d\u5230\u73b0\u5b9e\u91cc\uff0c\u53ef\u4ee5\u5148\u89c2\u5bdf\u547d\u76d8\u4e8b\u5b9e\u5bf9\u5e94\u7684\u884c\u4e3a\u8282\u594f\uff0c\u4e0d\u628a\u503e\u5411\u5f53\u6210\u5b9a\u8bba\u3002",
    suggestion: "\u5148\u505a\u5c0f\u8303\u56f4\u3001\u53ef\u9006\u7684\u73b0\u5b9e\u9a8c\u8bc1\u3002",
    followUp: "\u4f60\u73b0\u5728\u6700\u60f3\u786e\u8ba4\u7684\u662f\u65b9\u5411\u3001\u65f6\u673a\uff0c\u8fd8\u662f\u5177\u4f53\u884c\u52a8\uff1f",
    analysisSteps: skill?.analysisSteps,
    knowledgeSources: sources.map((source) => source.title),
  });
}

type StageBase = Pick<EvalRun["stages"], "route" | "plan">;
type ActualRun = {
  response: string; toolEvents: string[]; chartFacts: ChartFact[];
  supplementalEvidence?: string[];
  skill: ParsedSkill | null; sources: KnowledgeSource[]; critique: CritiqueResult;
};

function finish(evalCase: EvalCase, stages: StageBase, actual: ActualRun): EvalRun {
  const factEvidence = [...actual.chartFacts.flatMap((fact) => [
    fact.palace,
    fact.rawText,
    ...fact.stars,
    ...fact.transforms,
    ...fact.patterns,
  ]), ...(actual.supplementalEvidence ?? [])].join("\n");
  const expectedCriticPassed = evalCase.expectedCriticPassed ?? true;
  const setupRequired = !evalCase.chartFixture && stages.plan.requiredChartFacts.length > 0;
  const requiredFacts = evaluateRequiredFacts(
    stages.plan.requiredChartFacts,
    actual.chartFacts,
    actual.supplementalEvidence ?? [],
  );
  const stageEvidence = {
    skill: { executed: stages.plan.requiredSkills.length > 0, success: actual.skill !== null },
    retrieval: { executed: stages.plan.knowledgeQueries.length > 0, success: stages.plan.knowledgeQueries.length === 0 || actual.sources.length > 0 },
    critic: { executed: true, success: actual.critique.passed },
  };
  const failures = [
    ...(stages.route.intent === evalCase.expectedIntent ? [] : [`route: expected ${evalCase.expectedIntent}, got ${stages.route.intent}`]),
    ...((actual.skill?.skillId ?? null) === evalCase.expectedSkill ? [] : [`skill: expected ${evalCase.expectedSkill ?? "none"}, got ${actual.skill?.skillId ?? "none"}`]),
    ...evalCase.expectedTools.filter((tool) => !actual.toolEvents.includes(tool)).map((tool) => `tools: missing ${tool}`),
    ...evalCase.expectedStages
      .filter((stage) => !stageEvidence[stage].executed || !stageEvidence[stage].success)
      .map((stage) => `${stage}: ${stageEvidence[stage].executed ? "failed" : "not executed"}`),
    ...(actual.sources.length >= (evalCase.expectedSourcesMin ?? 0)
      ? []
      : [`retrieval: expected at least ${evalCase.expectedSourcesMin} sources, got ${actual.sources.length}`]),
    ...(expectedCriticPassed && !setupRequired
      ? requiredFacts.missing.map((fact) => `facts: required ${fact}`)
      : []),
    ...evalCase.expectedFacts
      .filter((fact) => !actual.response.includes(fact) || !factEvidence.includes(fact))
      .map((fact) => `facts: missing ${fact}`),
    ...evalCase.forbiddenClaims.filter((claim) => actual.response.includes(claim)).map((claim) => `response: forbidden ${claim}`),
    ...(stages.plan.safetyLevel === evalCase.safetyLevel ? [] : ["route: safety level mismatch"]),
    ...(actual.critique.passed === expectedCriticPassed
      ? []
      : [`critic: expected passed=${expectedCriticPassed}, got ${actual.critique.passed}`]),
  ];
  return {
    caseId: evalCase.id,
    model: "deterministic-local",
    response: actual.response,
    toolEvents: actual.toolEvents,
    criticResult: actual.critique,
    outcome: failures.length > 0
      ? "failed"
      : setupRequired
        ? "setup_required"
        : expectedCriticPassed
        ? "accepted"
        : "expected_rejection",
    stages: {
      ...stages,
      facts: actual.chartFacts,
      supplementalEvidence: actual.supplementalEvidence ?? [],
      requiredFacts,
      skill: {
        executed: stageEvidence.skill.executed,
        success: actual.skill !== null,
        skillId: actual.skill?.skillId ?? null,
        version: actual.skill?.version ?? null,
      },
      retrieval: {
        executed: stageEvidence.retrieval.executed,
        success: stageEvidence.retrieval.success,
        mode: "local",
        sources: actual.sources.map((source) => source.chunkId),
      },
      critic: { ...actual.critique, executed: true, success: actual.critique.passed },
    },
    passed: failures.length === 0,
    failures,
  };
}

function validChartInput(): CreateChartInput {
  return { profileId, name: "Eval chart", gender: "male", birthDate: "1990-05-17", birthTime: "12:00", calendarType: "solar", isPrimary: true };
}

function actualToolNames(stores: ReturnType<typeof createInMemoryToolStores>) {
  return stores.toolEvents.map((item) => item.toolName).filter((name) => name !== "createChart");
}

function requireToolSuccess<T>(stage: string, result: ToolResult<T>): T {
  if (result.ok) return result.data;
  throw new Error(`${stage}: ${result.error.message}`);
}

function evaluateRequiredFacts(
  requirements: string[],
  chartFacts: ChartFact[],
  supplementalEvidence: string[],
) {
  const satisfied = requirements.filter((requirement) =>
    requirementSatisfied(requirement, chartFacts, supplementalEvidence),
  );
  return {
    satisfied,
    missing: requirements.filter((requirement) => !satisfied.includes(requirement)),
  };
}

const requiredPalaces: Record<string, string> = {
  "career palace": "官禄",
  "life palace": "命宫",
  "wealth palace": "财帛",
  "relationship palace": "夫妻",
  "body palace": "身宫落点",
};

function requirementSatisfied(
  requirement: string,
  chartFacts: ChartFact[],
  supplementalEvidence: string[],
) {
  if (requirement === "current luck cycle") {
    return supplementalEvidence.some((item) => item.includes("大限：") || item.includes("流年：") || item.includes("流月："));
  }
  if (requirement === "major stars") return chartFacts.some((fact) => fact.stars.length > 0);
  if (requirement === "key palaces") return new Set(chartFacts.map((fact) => fact.palace)).size > 1;
  const expected = requiredPalaces[requirement];
  if (!expected) return false;
  return expected === "身宫落点"
    ? chartFacts.some((fact) => fact.patterns.includes(expected))
    : chartFacts.some((fact) => fact.palace === expected);
}

function failedRun(evalCase: EvalCase, error: unknown): EvalRun {
  const route = routeIntent(evalCase.userPrompt);
  const plan = buildAnalysisPlan(route);
  const failure = error instanceof Error ? error.message : "unknown: evaluation failed";
  const critique = { passed: false, issues: [], requiredRevision: false };
  return {
    caseId: evalCase.id,
    model: "deterministic-local",
    response: "",
    toolEvents: [],
    criticResult: critique,
    outcome: "failed",
    stages: {
      route,
      plan,
      facts: [],
      supplementalEvidence: [],
      requiredFacts: { satisfied: [], missing: plan.requiredChartFacts },
      skill: { executed: false, success: false, skillId: null, version: null },
      retrieval: { executed: false, success: false, mode: "local", sources: [] },
      critic: { ...critique, executed: false, success: false },
    },
    passed: false,
    failures: [failure],
  };
}

function critiqueResponse(
  stages: StageBase,
  response: string,
  toolsUsed: string[],
  chartFacts: ChartFact[],
  sources: KnowledgeSource[],
) {
  return runResponseCritic({
    intent: stages.route.intent,
    draft: response,
    toolsUsed,
    chartFacts,
    knowledgeSources: sources,
    safetyLevel: stages.plan.safetyLevel,
  });
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) void main();

async function main() {
  const runs = await runEvaluationCases(seedEvalCases);
  const failed = runs.filter((run) => !run.passed);
  const expectedRejections = runs.filter((run) => run.outcome === "expected_rejection").length;
  const setupRequired = runs.filter((run) => run.outcome === "setup_required").length;
  console.log(JSON.stringify({ total: runs.length, failed: failed.length, setupRequired, expectedRejections, runs }, null, 2));
  if (failed.length > 0) process.exit(1);
}
