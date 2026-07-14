/**
 * [INPUT]: Depends on routed intent and documented MVP tool contracts
 * [OUTPUT]: Provides explicit analysis plans with required tools, skills, knowledge queries, and safety level
 * [POS]: Agent-core planner between intent routing and tool execution
 * [PROTOCOL]: Update this header when changed, then check AGENTS.md
 */

import type { AnalysisPlan, IntentRoute } from "../domain/analysis";

const responseShape: AnalysisPlan["expectedResponseShape"] = [
  "conclusion",
  "chart_basis",
  "plain_explanation",
  "suggestion",
  "follow_up",
];

const topicPlans: Partial<Record<AnalysisPlan["topic"], Omit<AnalysisPlan, "safetyLevel">>> = {
  career: {
    topic: "career",
    requiredChartFacts: ["career palace", "life palace", "wealth palace", "current luck cycle"],
    requiredTools: [
      "getCurrentChart",
      "summarizeChartFacts",
      "getPalaceAnalysis",
      "getLuckCycle",
      "loadSkill",
      "searchKnowledge",
      "runResponseCritic",
    ],
    requiredSkills: ["career"],
    knowledgeQueries: ["career palace", "官禄"],
    expectedResponseShape: responseShape,
  },
  relationship: {
    topic: "relationship",
    requiredChartFacts: ["relationship palace", "life palace"],
    requiredTools: [
      "getCurrentChart",
      "summarizeChartFacts",
      "getPalaceAnalysis",
      "loadSkill",
      "searchKnowledge",
      "runResponseCritic",
    ],
    requiredSkills: ["relationship"],
    knowledgeQueries: ["relationship palace", "夫妻"],
    expectedResponseShape: responseShape,
  },
  wealth: {
    topic: "wealth",
    requiredChartFacts: ["wealth palace", "career palace", "current luck cycle"],
    requiredTools: [
      "getCurrentChart",
      "summarizeChartFacts",
      "getPalaceAnalysis",
      "getLuckCycle",
      "loadSkill",
      "searchKnowledge",
      "runResponseCritic",
    ],
    requiredSkills: ["wealth"],
    knowledgeQueries: ["wealth palace", "财帛"],
    expectedResponseShape: responseShape,
  },
  personality: {
    topic: "personality",
    requiredChartFacts: ["life palace", "body palace", "major stars"],
    requiredTools: [
      "getCurrentChart",
      "summarizeChartFacts",
      "getPalaceAnalysis",
      "getStarAnalysis",
      "loadSkill",
      "searchKnowledge",
      "runResponseCritic",
    ],
    requiredSkills: ["personality"],
    knowledgeQueries: ["life palace", "命宫"],
    expectedResponseShape: responseShape,
  },
  recent_fortune: {
    topic: "recent_fortune",
    requiredChartFacts: ["life palace", "current luck cycle"],
    requiredTools: [
      "getCurrentChart",
      "summarizeChartFacts",
      "getLuckCycle",
      "loadSkill",
      "searchKnowledge",
      "runResponseCritic",
    ],
    requiredSkills: ["recent_fortune"],
    knowledgeQueries: ["recent fortune timing", "运限"],
    expectedResponseShape: responseShape,
  },
  chart_explanation: {
    topic: "chart_explanation",
    requiredChartFacts: ["life palace", "major stars", "key palaces"],
    requiredTools: [
      "getCurrentChart",
      "summarizeChartFacts",
      "getPalaceAnalysis",
      "getStarAnalysis",
      "loadSkill",
      "searchKnowledge",
      "runResponseCritic",
    ],
    requiredSkills: ["chart_explanation"],
    knowledgeQueries: ["命宫", "宫位"],
    expectedResponseShape: responseShape,
  },
};

export function buildAnalysisPlan(route: IntentRoute): AnalysisPlan {
  const topicPlan = topicPlans[route.intent];

  if (topicPlan) {
    return {
      ...topicPlan,
      safetyLevel: route.safetyLevel,
    };
  }

  if (route.intent === "out_of_scope" || route.intent === "safety_sensitive") {
    return {
      topic: route.intent,
      requiredChartFacts: [],
      requiredTools: ["runResponseCritic"],
      requiredSkills: [],
      knowledgeQueries: [],
      safetyLevel: "refusal",
      expectedResponseShape: responseShape,
    };
  }

  return {
    topic: route.intent,
    requiredChartFacts: [],
    requiredTools: [],
    requiredSkills: [],
    knowledgeQueries: [],
    safetyLevel: route.safetyLevel,
    expectedResponseShape: responseShape,
  };
}
