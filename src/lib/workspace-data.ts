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

export type Theme = {
  id: string
  label: string
  question: string
  icon: LucideIcon
  accent: string
}

export const THEMES: Theme[] = [
  { id: 'career', label: '事业', question: '未来三年，我的事业会往哪里走？', icon: Briefcase, accent: 'var(--violet)' },
  { id: 'wealth', label: '财富', question: '我的财富机会藏在什么地方？', icon: TrendingUp, accent: 'var(--gold)' },
  { id: 'relationship', label: '关系', question: '我和重要的人，关系会如何发展？', icon: Heart, accent: 'var(--blue)' },
  { id: 'growth', label: '成长', question: '此刻，我最该突破的是什么？', icon: Sprout, accent: 'var(--emerald)' },
  { id: 'marriage', label: '婚姻', question: '我的婚姻缘分与关系质量如何？', icon: Heart, accent: 'var(--blue)' },
  { id: 'family', label: '家庭', question: '我和家人的关系正走向何方？', icon: Home, accent: 'var(--gold)' },
  { id: 'startup', label: '创业', question: '现在是适合我创业的时机吗？', icon: Rocket, accent: 'var(--violet)' },
  { id: 'year', label: '流年', question: '今年整体的运势节奏是什么？', icon: Compass, accent: 'var(--blue)' },
  { id: 'study', label: '学习', question: '我的学习与考试运势怎么样？', icon: GraduationCap, accent: 'var(--violet)' },
  { id: 'health', label: '健康', question: '身心状态，有什么值得我留意？', icon: Activity, accent: 'var(--blue)' },
  { id: 'character', label: '性格', question: '我的天赋与优势究竟是什么？', icon: Sparkles, accent: 'var(--violet)' },
  { id: 'future', label: '未来规划', question: '未来三年，我该如何布局人生？', icon: Users, accent: 'var(--emerald)' },
]
