import { useEffect, useRef } from 'react'
import { FLIGHT_DURATION, FADE_DURATION } from '../utils/shotPhysics'

export function useIllustrateAnimation(ballsRef, pausedRef, syncBalls) {
  const rafId = useRef(null)

  useEffect(() => {
    let last = null

    const tick = (time) => {
      if (pausedRef.current) {
        last = null
        rafId.current = requestAnimationFrame(tick)
        return
      }

      if (last === null) last = time
      const dt = (time - last) / 1000
      last = time

      const cur = ballsRef.current
      let changed = false
      const next = []

      for (const b of cur) {
        if (b.phase === 'flying') {
          const p = Math.min(b.progress + dt / FLIGHT_DURATION, 1)
          changed = true
          next.push({ ...b, progress: p, phase: p >= 1 ? 'fading' : 'flying' })
        } else if (b.phase === 'fading') {
          const f = b.fade + dt / (FADE_DURATION * 0.4)
          if (f >= 1) { changed = true; continue }
          changed = true
          next.push({ ...b, fade: f })
        } else {
          next.push(b)
        }
      }

      if (changed) {
        ballsRef.current = next
        syncBalls?.()
      }

      rafId.current = requestAnimationFrame(tick)
    }

    rafId.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId.current)
  }, [ballsRef, pausedRef, syncBalls])
}
