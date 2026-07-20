'use client'

import { createContext, useContext } from 'react'

export type InspectorToggle = {
  open: boolean
  toggle: () => void
}

/** Non-null only when the current layout renders a collapsible inspector. */
export const InspectorToggleContext = createContext<InspectorToggle | null>(null)

export function useInspectorToggle() {
  return useContext(InspectorToggleContext)
}
