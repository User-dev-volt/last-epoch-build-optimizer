import { useState, useEffect } from 'react'

export function useReducedMotion(): boolean {
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
  const [reducedMotion, setReducedMotion] = useState(mq.matches)
  useEffect(() => {
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  return reducedMotion
}
