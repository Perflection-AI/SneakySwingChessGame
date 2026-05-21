export default function BallLayer({ balls, ydToPct, ballEffect, weatherActive, penaltyPlayerIdxs }) {
  const penaltySet = penaltyPlayerIdxs?.length ? new Set(penaltyPlayerIdxs) : null

  return (
    <svg className="ball-layer" viewBox="0 0 100 100" preserveAspectRatio="none">
      {balls.map(b => {
        const opacity = b.phase === 'fading' ? 1 - b.fade : 1
        const cx = b.sx + (b.ex - b.sx) * b.progress
        const cy = b.sy + (b.ey - b.sy) * b.progress
        const r = 0.6 + Math.sin(b.progress * Math.PI) * 0.3
        const traveledYd = Math.round(Math.sqrt((cx - b.sx) ** 2 + (cy - b.sy) ** 2) / ydToPct)
        const midX = (b.sx + cx) / 2
        const midY = (b.sy + cy) / 2

        const isPenalty = penaltySet?.has(b.playerIdx)
        const isGolden = ballEffect === 'golden' && !isPenalty
        const trailClass = isGolden ? 'ball-trail ball-trail-golden'
          : isPenalty ? 'ball-trail ball-trail-penalty'
          : weatherActive ? 'ball-trail ball-trail-weather'
          : 'ball-trail'
        const dotClass = isGolden ? 'ball-dot ball-dot-golden'
          : isPenalty ? 'ball-dot ball-dot-penalty'
          : 'ball-dot'
        const glowClass = isGolden ? 'ball-glow ball-glow-golden'
          : isPenalty ? 'ball-glow ball-glow-penalty'
          : 'ball-glow'

        return (
          <g key={b.id} opacity={opacity}>
            <line className={trailClass} x1={b.sx} y1={b.sy} x2={cx} y2={cy} />
            {b.progress > 0.05 && (
              <text x={midX} y={midY} className="ball-dist-text" textAnchor="middle" dominantBaseline="central">
                {traveledYd} yd
              </text>
            )}
            {b.phase === 'flying' && (
              <>
                <circle className={dotClass} cx={cx} cy={cy} r={r} />
                <circle className={glowClass} cx={cx} cy={cy} r={r + 0.5} />
              </>
            )}
            {b.phase === 'fading' && b.outcome !== 'holed' && (
              <circle className="ball-landed" cx={b.ex} cy={b.ey} r="0.6" />
            )}
          </g>
        )
      })}
    </svg>
  )
}
