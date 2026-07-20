/**
 * [INPUT]: Depends on natural-language user messages
 * [OUTPUT]: Provides deterministic intent routing for the six active Ziwei workflows and safety boundaries
 * [POS]: First agent-core step before planning and tool selection
 * [PROTOCOL]: Update this header when changed, then check AGENTS.md
 */

import type { Intent, IntentRoute, SafetyLevel } from "../domain/analysis";

const keywordRules: Array<{
  intent: Intent;
  keywords: string[];
  requiresChart: boolean;
  safetyLevel: SafetyLevel;
}> = [
  {
    intent: "safety_sensitive",
    keywords: ["股票", "买入", "卖出", "诊断", "治疗", "律师", "起诉", "自杀"],
    requiresChart: false,
    safetyLevel: "refusal",
  },
  {
    intent: "out_of_scope",
    keywords: ["八字", "塔罗", "风水", "占星", "起名"],
    requiresChart: false,
    safetyLevel: "refusal",
  },
  {
    intent: "career",
    keywords: ["工作", "事业", "职业", "跳槽", "换工作", "上司", "岗位"],
    requiresChart: true,
    safetyLevel: "caution",
  },
  {
    intent: "relationship",
    keywords: ["感情", "关系", "恋爱", "结婚", "伴侣", "复合", "对方", "继续发展"],
    requiresChart: true,
    safetyLevel: "caution",
  },
  {
    intent: "wealth",
    keywords: ["财富", "财运", "赚钱", "收入", "金钱", "发财"],
    requiresChart: true,
    safetyLevel: "caution",
  },
  {
    intent: "personality",
    keywords: ["性格", "个性", "人格", "命宫", "我是怎样"],
    requiresChart: true,
    safetyLevel: "normal",
  },
  {
    intent: "recent_fortune",
    keywords: ["最近", "近期", "今年", "这个月", "运势", "流年"],
    requiresChart: true,
    safetyLevel: "normal",
  },
  {
    intent: "chart_management",
    keywords: ["创建命盘", "删除命盘", "出生", "生日", "排盘"],
    requiresChart: false,
    safetyLevel: "normal",
  },
  {
    intent: "memory_management",
    keywords: ["忘记", "记住", "删除记忆", "偏好"],
    requiresChart: false,
    safetyLevel: "normal",
  },
  {
    intent: "chart_explanation",
    keywords: ["怎么看", "解释", "什么意思", "宫位", "星曜"],
    requiresChart: true,
    safetyLevel: "normal",
  },
];

export function routeIntent(message: string): IntentRoute {
  const normalized = message.trim().toLowerCase();
  if (matchesStudyCareerIntent(normalized)) {
    return {
      intent: "career",
      confidence: 0.86,
      requiresChart: true,
      safetyLevel: "caution",
      rationale: "Matched study and exam career keyword rule.",
    };
  }

  const matched = keywordRules.find((rule) =>
    rule.keywords.some((keyword) => normalized.includes(keyword.toLowerCase())),
  );

  if (!matched) {
    return {
      intent: "general_chat",
      confidence: 0.45,
      requiresChart: false,
      safetyLevel: "normal",
      rationale: "No Ziwei topic keyword matched.",
    };
  }

  return {
    intent: matched.intent,
    confidence: 0.82,
    requiresChart: matched.requiresChart,
    safetyLevel: matched.safetyLevel,
    rationale: `Matched ${matched.intent} keyword rule.`,
  };
}

function matchesStudyCareerIntent(message: string) {
  return ["考研", "读研", "升学", "考试", "备考", "学业", "读书"].some((keyword) =>
    message.includes(keyword),
  );
}
