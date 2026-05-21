import { useRef, useEffect } from 'react'
import { FLIGHT_DURATION, FADE_DURATION, LAND_DELAY, resolveAnimalEventPositions } from '../utils/shotPhysics'
import { getCardDef } from '../cards'

export function useBallAnimation({ gameRef, dispatch, modeRef, players }) {
  const pendingTimers = useRef(new Map())
  const prevHoleNumber = useRef(gameRef.current.holeNumber)

  useEffect(() => {
    const ballMap = new Map()
    let last = null, frameId

    const tick = (time) => {
      const gs = gameRef.current

      // Detect hole transition: clear all pending timers and ball state
      if (gs.holeNumber !== prevHoleNumber.current) {
        prevHoleNumber.current = gs.holeNumber
        for (const timer of pendingTimers.current.values()) clearTimeout(timer)
        pendingTimers.current.clear()
        ballMap.clear()
      }

      // Pause for both 'pause' and 'off' (but not 'off' in test mode)
      if (gs.primaryStatus === 'pause' || (gs.primaryStatus === 'off' && modeRef.current !== 'test')) {
        last = null
        frameId = requestAnimationFrame(tick)
        return
      }

      if (last === null) last = time
      const dt = (time - last) / 1000
      last = time

      // Sync ballMap with current game state balls
      const currentIds = new Set(gs.balls.map(b => b.id))
      for (const b of gs.balls) {
        if (!ballMap.has(b.id)) ballMap.set(b.id, { ...b })
      }
      // Remove balls that are no longer in game state
      for (const [id] of ballMap) {
        if (!currentIds.has(id)) ballMap.delete(id)
      }

      const updated = []
      const removed = []

      for (const [ballId, ball] of ballMap) {
        if (ball.phase === 'flying') {
          const p = Math.min(ball.progress + dt / FLIGHT_DURATION, 1)
          ball.progress = p
          if (p >= 1) ball.phase = 'fading'

          if (p >= 1 && modeRef.current === 'game' && !pendingTimers.current.has(ballId)) {
            const bx = ball.ex, by = ball.ey
            const bPlayerIdx = ball.playerIdx ?? gs.turnIdx
            const activeCardId = gs.activeCard?.id
            const holeNum = gs.holeNumber

            const timer = setTimeout(() => {
              const currentState = gameRef.current
              // Bail if hole changed since timer was set
              if (currentState.holeNumber !== holeNum) {
                pendingTimers.current.delete(ballId)
                return
              }
              // Resolve animal event card effects at landing time
              const card = activeCardId ? getCardDef(activeCardId) : null
              const landingPos = { x: bx, y: by }
              const animalResult = resolveAnimalEventPositions(card, bPlayerIdx, currentState.playerPos, currentState.holePos, landingPos)

              dispatch({
                type: 'BALL_LANDED',
                payload: {
                  playerIdx: bPlayerIdx,
                  endX: bx,
                  endY: by,
                  isHoled: ball.outcome === 'holed' || ball.outcome === 'miracle',
                  animalUpdates: animalResult.updates,
                  swapPositions: animalResult.swapPositions,
                },
              })
              pendingTimers.current.delete(ballId)
            }, LAND_DELAY)
            pendingTimers.current.set(ballId, timer)
          }

          updated.push({ ...ball })
        } else if (ball.phase === 'fading') {
          const fadeDur = modeRef.current === 'test' ? 0.5 : FADE_DURATION
          const f = ball.fade + dt / fadeDur
          ball.fade = f
          if (f >= 1) {
            ballMap.delete(ballId)
            removed.push(ballId)
            continue
          }
          updated.push({ ...ball })
        }
      }

      if (updated.length > 0 || removed.length > 0) {
        dispatch({ type: 'TICK_ANIMATION', payload: { balls: updated, removed } })
      }
      frameId = requestAnimationFrame(tick)
    }

    frameId = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(frameId)
      for (const timer of pendingTimers.current.values()) clearTimeout(timer)
      pendingTimers.current.clear()
    }
  }, [gameRef, dispatch, modeRef, players])
}
