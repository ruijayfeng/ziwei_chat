'use client'

import { createContext, useContext, useMemo, useState } from 'react'
import type { Palace } from '@/lib/reference-chart-contract'

type ChartContextValue = {
  palaces: Palace[]
  selected: number
  setSelected: (index: number) => void
  hovered: number | null
  setHovered: (index: number | null) => void
}

const ChartContext = createContext<ChartContextValue | null>(null)

export function ChartProvider({ palaces, children }: { palaces: Palace[]; children: React.ReactNode }) {
  const initialSelected = Math.max(0, palaces.findIndex((palace) => palace.name === '命宫'))
  const [requestedSelected, setSelected] = useState(initialSelected)
  const [hovered, setHovered] = useState<number | null>(null)
  const selected = palaces[requestedSelected] ? requestedSelected : initialSelected

  const value = useMemo(
    () => ({ palaces, selected, setSelected, hovered, setHovered }),
    [palaces, selected, hovered],
  )

  return <ChartContext.Provider value={value}>{children}</ChartContext.Provider>
}

export function useChart() {
  const ctx = useContext(ChartContext)
  if (!ctx) throw new Error('useChart must be used within a ChartProvider')
  return ctx
}
