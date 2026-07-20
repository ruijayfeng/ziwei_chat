import {
  Compass,
  History,
  type LucideIcon,
  MessagesSquare,
  Settings,
  Telescope,
} from 'lucide-react'

export type NavItem = {
  id: string
  label: string
  icon: LucideIcon
  href: string
}

export const NAV_ITEMS: NavItem[] = [
  { id: 'chat', label: '对话', icon: MessagesSquare, href: '/' },
  { id: 'chart', label: '命盘', icon: Compass, href: '/chart' },
  { id: 'records', label: '记录', icon: History, href: '/records' },
  { id: 'insights', label: '洞见', icon: Telescope, href: '/insights' },
  { id: 'settings', label: '设置', icon: Settings, href: '/settings' },
]
