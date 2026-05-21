import { useEffect, useRef } from 'react'

export default function TeleportOverlay({ teleportPhase, teleportTargets, dispatch }) {
  const dispatchedRef = useRef('idle')

  useEffect(() => {
    if (teleportPhase === 'fade_out' && dispatchedRef.current !== 'fade_out') {
      dispatchedRef.current = 'fade_out'
      const t = setTimeout(() => {
        dispatch({ type: 'TELEPORT_FADE_OUT_COMPLETE' })
      }, 450)
      return () => clearTimeout(t)
    }
    if (teleportPhase === 'fade_in' && dispatchedRef.current !== 'fade_in') {
      dispatchedRef.current = 'fade_in'
      const t = setTimeout(() => {
        dispatch({ type: 'TELEPORT_FADE_IN_COMPLETE' })
        dispatchedRef.current = 'idle'
      }, 450)
      return () => clearTimeout(t)
    }
  }, [teleportPhase, dispatch])

  if (teleportPhase === 'idle' || !teleportTargets.length) return null

  return (
    <div className="teleport-overlay">
      {teleportTargets.map(t => {
        const pos = teleportPhase === 'fade_out' ? t.fromPos : t.toPos
        return (
          <div
            key={t.playerIdx}
            className={`teleport-marker ${teleportPhase === 'fade_out' ? 'teleport-marker-out' : 'teleport-marker-in'}`}
            style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
          />
        )
      })}
      {/* Sparkle at origin during fade_out */}
      {teleportPhase === 'fade_out' && teleportTargets.map(t => (
        <div
          key={`sparkle-out-${t.playerIdx}`}
          className="teleport-sparkle"
          style={{ left: `${t.fromPos.x}%`, top: `${t.fromPos.y}%` }}
        />
      ))}
      {/* Sparkle at destination during fade_in */}
      {teleportPhase === 'fade_in' && teleportTargets.map(t => (
        <div
          key={`sparkle-in-${t.playerIdx}`}
          className="teleport-sparkle"
          style={{ left: `${t.toPos.x}%`, top: `${t.toPos.y}%` }}
        />
      ))}
    </div>
  )
}
