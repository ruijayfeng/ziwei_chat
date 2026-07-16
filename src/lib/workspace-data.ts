import {
  Activity,
  Briefcase,
  Compass,
  GraduationCap,
  Heart,
  Home,
  type LucideIcon,
  Rocket,
  Sparkles,
  Sprout,
  TrendingUp,
  Users,
} from 'lucide-react'

/* ------------------------------------------------------------------ */
/* 主题分析 — the page's only job is CHOOSING a theme                  */
/* ------------------------------------------------------------------ */

export type Theme = {
  id: string
  label: string
  question: string
  icon: LucideIcon
  accent: string
}

/**
 * A curated, human-sized set. No vanity "analyzed N times" counters, no
 * search box — twelve legible choices don't need to be searched.
 */
export const THEMES: Theme[] = [
  {
    id: 'career',
    label: '事业',
    question: '未来三年，我的事业会往哪里走？',
    icon: Briefcase,
    accent: 'var(--violet)',
  },
  {
    id: 'wealth',
    label: '财富',
    question: '我的财富机会藏在什么地方？',
    icon: TrendingUp,
    accent: 'var(--gold)',
  },
  {
    id: 'relationship',
    label: '关系',
    question: '我和重要的人，关系会如何发展？',
    icon: Heart,
    accent: 'var(--blue)',
  },
  {
    id: 'growth',
    label: '成长',
    question: '此刻，我最该突破的是什么？',
    icon: Sprout,
    accent: 'var(--emerald)',
  },
  {
    id: 'marriage',
    label: '婚姻',
    question: '我的婚姻缘分与关系质量如何？',
    icon: Heart,
    accent: 'var(--blue)',
  },
  {
    id: 'family',
    label: '家庭',
    question: '我和家人的关系正走向何方？',
    icon: Home,
    accent: 'var(--gold)',
  },
  {
    id: 'startup',
    label: '创业',
    question: '现在是适合我创业的时机吗？',
    icon: Rocket,
    accent: 'var(--violet)',
  },
  {
    id: 'year',
    label: '流年',
    question: '今年整体的运势节奏是什么？',
    icon: Compass,
    accent: 'var(--blue)',
  },
  {
    id: 'study',
    label: '学习',
    question: '我的学习与考试运势怎么样？',
    icon: GraduationCap,
    accent: 'var(--violet)',
  },
  {
    id: 'health',
    label: '健康',
    question: '身心状态，有什么值得我留意？',
    icon: Activity,
    accent: 'var(--blue)',
  },
  {
    id: 'character',
    label: '性格',
    question: '我的天赋与优势究竟是什么？',
    icon: Sparkles,
    accent: 'var(--violet)',
  },
  {
    id: 'future',
    label: '未来规划',
    question: '未来三年，我该如何布局人生？',
    icon: Users,
    accent: 'var(--emerald)',
  },
]

/* ------------------------------------------------------------------ */
/* 记忆 — one honest timeline of a life being recorded                 */
/* ------------------------------------------------------------------ */

export type RecordKind = 'insight' | 'wealth' | 'chart' | 'career' | 'relationship'

export type LifeRecord = {
  id: string
  kind: RecordKind
  kindLabel: string
  title: string
  body: string
  date: string
  time: string
  tags: string[]
  accent: string
}

export const RECORDS: LifeRecord[] = [
  {
    id: 'r1',
    kind: 'insight',
    kindLabel: 'AI 洞见',
    title: '你开始更关注长期成长',
    body: '近期的对话里，你多次提到「长期」与「积累」，这代表你的人生重心，正在悄然转变。',
    date: '7月22日',
    time: '20:45',
    tags: ['成长', '心态转变'],
    accent: 'var(--violet)',
  },
  {
    id: 'r2',
    kind: 'wealth',
    kindLabel: '财富分析',
    title: '稳中求进的一年',
    body: '今年你的财富运势整体稳定，适合优化结构，而不是追求高风险高回报。',
    date: '7月18日',
    time: '16:32',
    tags: ['财富', '流年'],
    accent: 'var(--gold)',
  },
  {
    id: 'r3',
    kind: 'chart',
    kindLabel: '命盘建立',
    title: '建立了你的专属命盘',
    body: 'AI 已根据你的出生信息建立命盘，这是我们一起探索的起点。',
    date: '7月15日',
    time: '11:08',
    tags: ['命盘', '起点'],
    accent: 'var(--blue)',
  },
  {
    id: 'r4',
    kind: 'career',
    kindLabel: '事业分析',
    title: '适合长期积累',
    body: '未来三年更适合稳步提升能力，而不是主动跳槽或快速转换赛道。',
    date: '7月14日',
    time: '09:27',
    tags: ['事业', '发展'],
    accent: 'var(--violet)',
  },
  {
    id: 'r5',
    kind: 'relationship',
    kindLabel: '关系分析',
    title: '需要更多沟通与理解',
    body: '近期你在关系中更渴望安全感，适合坦诚表达自己的真实想法。',
    date: '7月7日',
    time: '21:14',
    tags: ['关系', '沟通'],
    accent: 'var(--blue)',
  },
]

/** A single, quiet monthly reflection — not a chart, a sentence. */
export const MONTHLY_REFLECTION = {
  period: '2026年7月',
  body: '这个月，你更关注事业与成长，也更愿意与自己对话。',
}

/* ------------------------------------------------------------------ */
/* 洞见 — the soul of the product: a calm letter, then a few patterns  */
/* ------------------------------------------------------------------ */

/** The weekly letter is the hero. Honest, personal, no numbers. */
export const WEEKLY_LETTER = {
  greeting: '这一周，我看到的你',
  paragraphs: [
    '你在思考问题时，比过去更冷静，也更清晰了。你不再急于寻找答案，而是学会与自己对话。',
    '这是成长里最不容易、也最重要的一步。继续保持，你正在成为你想成为的那个人。',
  ],
  signoff: '— 紫微知道',
}

export type Pattern = {
  id: string
  title: string
  detail: string
  icon: LucideIcon
  accent: string
}

/**
 * The most valuable capability: surfacing patterns the user hasn't noticed.
 * Framed as observations, never as scored "confidence".
 */
export const PATTERNS: Pattern[] = [
  {
    id: 'p1',
    title: '你开始把注意力，从结果转向长期成长',
    detail: '最近三个月，你提出的问题越来越指向「长期规划」与「人生方向」，而非短期得失。',
    icon: Sprout,
    accent: 'var(--emerald)',
  },
  {
    id: 'p2',
    title: '压力增大时，你会重新思考职业方向',
    detail: '每当感到紧迫，你的咨询会更集中在「要不要换工作」上——这是一个值得留意的模式。',
    icon: Briefcase,
    accent: 'var(--violet)',
  },
  {
    id: 'p3',
    title: '你很少谈到身体与家庭',
    detail: '这可能是被你忽略的领域。最近的话题几乎没有触及休息、健康与亲密关系。',
    icon: Heart,
    accent: 'var(--blue)',
  },
]
