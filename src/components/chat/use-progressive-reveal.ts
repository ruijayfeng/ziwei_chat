'use client'

import { useEffect, useRef, useState } from 'react'

import {
  nextRevealLength,
  revealDelayForContent,
  revealStepForContent,
  sliceByCharacters,
} from '@/lib/ui/streaming-reveal'

export function useProgressiveReveal(content: string, reducedMotion: boolean) {
  const [visibleLength, setVisibleLength] = useState(() =>
    reducedMotion ? Array.from(content).length : 0,
  )
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const contentLength = Array.from(content).length

  useEffect(() => {
    if (reducedMotion) {
      setVisibleLength(contentLength)
      return
    }

    if (visibleLength >= contentLength) return
    timerRef.current = setTimeout(() => {
      setVisibleLength((current) =>
        nextRevealLength(content, current, revealStepForContent(contentLength)),
      )
    }, revealDelayForContent(contentLength))

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [content, contentLength, reducedMotion, visibleLength])

  return {
    visibleContent: reducedMotion ? content : sliceByCharacters(content, visibleLength),
    revealing: !reducedMotion && visibleLength < contentLength,
  }
}
