import { useRef, useEffect } from 'react'
import { FLIGHT_DURATION, FADE_DURATION, LAND_DELAY } from '../utils/shotPhysics'

export function useBallAnimation({ gameRef, dispatch, modeRef, players }) {
  const moveTimer = useRef(null)
  const prevHoleNumber = useRef(gameRef.current.holeNumber)

  useEffect(() => {
    let last = null, frameId

    const tick = (time) => {
      const gs = gameRef.current

      // Detect hole transition: clear pending moveTimer
      if (gs.holeNumber !== prevHoleNumber.current) {
        prevHoleNumber.current = gs.holeNumber
        if (moveTimer.current) { clearTimeout(moveTimer.current); moveTimer.current = null }
      }

      if (gs.primaryStatus === 'pause' || gs.primaryStatus === 'off') {
        last = null
        frameId = requestAnimationFrame(tick)
        return
      }

      if (last === null) last = time
      const dt = (time - last) / 1000
      last = time

      const cur = gs.balls
      let changed = false
      const next = []

      for (const b of cur) {
        if (b.phase === 'flying') {
          const p = Math.min(b.progress + dt / FLIGHT_DURATION, 1)
          changed = true

          if (p >= 1 && modeRef.current === 'game' && !moveTimer.current) {
            const bx = b.ex, by = b.ey
            const bpi = b.playerIdx ?? gs.turnIdx
            moveTimer.current = setTimeout(() => {
              dispatch({
                type: 'BALL_LANDED',
                payload: {
                  playerIdx: bpi,
                  endX: bx,
                  endY: by,
                  isHoled: b.outcome === 'holed' || b.outcome === 'miracle',
                },
              })
              moveTimer.current = null
            }, LAND_DELAY)
          }

          next.push({ ...b, progress: p, phase: p >= 1 ? 'fading' : 'flying' })
        } else if (b.phase === 'fading') {
          const f = b.fade + dt / FADE_DURATION
          if (f >= 1) { changed = true; continue }
          changed = true
          next.push({ ...b, fade: f })
        } else {
          next.push(b)
        }
      }

      if (changed) {
        dispatch({ type: 'TICK_ANIMATION', payload: { balls: next } })
      }
      frameId = requestAnimationFrame(tick)
    }

    frameId = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(frameId)
      if (moveTimer.current) clearTimeout(moveTimer.current)
    }
  }, [gameRef, dispatch, modeRef, players])
}
