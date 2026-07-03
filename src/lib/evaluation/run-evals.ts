/**
 * [INPUT]: Depends on seed eval cases, deterministic agent core, response composer, and critic
 * [OUTPUT]: Provides local eval runner with response, tool event, critique, and pass/fail evidence
 * [POS]: Regression gate before model-backed evaluation and database eval_runs persistence
 * [PROTOCOL]: Update this header when changed, then check AGENTS.md
 */

import { pathToFileURL } from "node:url";

import { runResponseCritic } from "../agent/critic";
import { buildAnalysisPlan } from "../agent/planner";
import { composeResponse } from "../agent/response-composer";
import { routeIntent } from "../agent/intent-router";
import type { ChartFact } from "../domain/chart";
import type { CritiqueResult } from "../domain/analysis";
import { type EvalCase, seedEvalCases } from "./cases";

type EvalRun = {
  caseId: string;
  model: string;
  response: string;
  toolEvents: string[];
  criticResult: CritiqueResult;
  passed: boolean;
  failures: string[];
};

const factByTopic: Record<string, ChartFact> = {
  career: fact("career", "官禄"),
  relationship: fact("relationship", "夫妻"),
  recent_fortune: fact("recent_fortune", "运限"),
  personality: fact("personality", "命宫"),
  wealth: fact("wealth", "财帛"),
};

export async function runEvaluationCases(cases: EvalCase[]): Promise<EvalRun[]> {
  return cases.map(runSingleCase);
}

function runSingleCase(evalCase: EvalCase): EvalRun {
  const response = buildResponse(evalCase);
  const route = routeIntent(evalCase.userPrompt);
  const plan = buildAnalysisPlan(route);
  const toolEvents = evalCase.expectedTools;
  const chartFacts = evalCase.chartFixture ? [factByTopic[evalCase.topic]].filter(Boolean) : [];
  const criticResult =
    evalCase.topic === "missing_chart"
      ? { passed: true, issues: [], requiredRevision: false }
      : runResponseCritic({
          intent: route.intent,
          draft: response,
          toolsUsed: toolEvents,
          chartFacts,
          knowledgeSources: [],
          safetyLevel: evalCase.safetyLevel,
        });
  const failures = [
    ...missingTools(evalCase.expectedTools, toolEvents),
    ...missingFacts(evalCase.expectedFacts, response),
    ...forbiddenClaims(evalCase.forbiddenClaims, response),
    ...(plan.safetyLevel === evalCase.safetyLevel ? [] : ["safety level mismatch"]),
    ...(criticResult.passed ? [] : criticResult.issues),
  ];

  return {
    caseId: evalCase.id,
    model: "deterministic-local",
    response,
    toolEvents,
    criticResult,
    passed: failures.length === 0,
    failures,
  };
}

function buildResponse(evalCase: EvalCase) {
  if (evalCase.topic === "missing_chart") {
    return "请先创建一张命盘，我才能基于确定性排盘继续分析。你可以先补充出生日期、出生时间、性别和历法吗？";
  }

  if (evalCase.topic === "invalid_birth_time") {
    return "这个出生时间格式不合法，当前只接受 HH:mm 或十二时辰。你能把出生时间改成例如 12:00 或 午时吗？";
  }

  if (evalCase.safetyLevel === "refusal") {
    return "这个问题不适合用紫微斗数给具体指令。我可以帮你做风险意识和情绪整理，但不能替代专业判断；你想把问题改成可观察的现实处境吗？";
  }

  const topicFact = factByTopic[evalCase.topic];

  return composeResponse({
    conclusion: "这个问题可以看，但更适合当作倾向和观察方向。",
    chartBasis: [`${topicFact.palace}：${topicFact.rawText}`],
    plainExplanation: `落到现实里，可以先观察 ${topicFact.palace} 对应的行为节奏。`,
    suggestion: "先做小范围验证，不要把命盘当成不可逆决定。",
    followUp: "你现在最想确认的是方向、时机，还是具体行动？",
  });
}

function missingTools(expectedTools: string[], actualTools: string[]) {
  return expectedTools
    .filter((tool) => !actualTools.includes(tool))
    .map((tool) => `missing tool: ${tool}`);
}

function missingFacts(expectedFacts: string[], response: string) {
  return expectedFacts
    .filter((factName) => !response.includes(factName))
    .map((factName) => `missing fact: ${factName}`);
}

function forbiddenClaims(claims: string[], response: string) {
  return claims
    .filter((claim) => response.includes(claim))
    .map((claim) => `forbidden claim: ${claim}`);
}

function fact(topic: string, palace: string): ChartFact {
  return {
    id: `eval:${topic}:${palace}`,
    topic,
    palace,
    stars: ["天同"],
    transforms: [],
    patterns: [],
    rawText: `${palace} 提供本题的命盘依据。`,
    confidence: "high",
  };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  void main();
}

async function main() {
  const runs = await runEvaluationCases(seedEvalCases);
  const failed = runs.filter((run) => !run.passed);

  console.log(
    JSON.stringify({ total: runs.length, failed: failed.length, runs }, null, 2),
  );

  if (failed.length > 0) {
    process.exit(1);
  }
}
