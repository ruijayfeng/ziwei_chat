'use client'

import { createContext, useContext, useMemo, useState } from 'react'

type ChartContextValue = {
  selected: number
  setSelected: (index: number) => void
  hovered: number | null
  setHovered: (index: number | null) => void
}

const ChartContext = createContext<ChartContextValue | null>(null)

export function ChartProvider({ children }: { children: React.ReactNode }) {
  const [selected, setSelected] = useState(0)
  const [hovered, setHovered] = useState<number | null>(null)

  const value = useMemo(
    () => ({ selected, setSelected, hovered, setHovered }),
    [selected, hovered],
  )

  return <ChartContext.Provider value={value}>{children}</ChartContext.Provider>
}

export function useChart() {
  const ctx = useContext(ChartContext)
  if (!ctx) throw new Error('useChart must be used within a ChartProvider')
  return ctx
}
