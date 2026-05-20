export default function BallLayer({ balls, ydToPct }) {
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
        return (
          <g key={b.id} opacity={opacity}>
            <line className="ball-trail" x1={b.sx} y1={b.sy} x2={cx} y2={cy} />
            {b.progress > 0.05 && (
              <text x={midX} y={midY} className="ball-dist-text" textAnchor="middle" dominantBaseline="central">
                {traveledYd} yd
              </text>
            )}
            {b.phase === 'flying' && (
              <>
                <circle className="ball-dot" cx={cx} cy={cy} r={r} />
                <circle className="ball-glow" cx={cx} cy={cy} r={r + 0.5} />
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
