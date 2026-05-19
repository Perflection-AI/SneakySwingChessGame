export default function BallLayer({ balls, ydToPct }) {
  return (
    <svg className="ball-layer" viewBox="0 0 100 100" preserveAspectRatio="none">
      {balls.map(b => {
        const opacity = b.phase === 'fading' ? 1 - b.fade : 1
        const cx = b.sx + (b.ex - b.sx) * b.progress
        const cy = b.sy + (b.ey - b.sy) * b.progress
        const lift = Math.sin(b.progress * Math.PI)
        const r = 0.4 + lift * 0.2
        const traveledYd = Math.round(Math.sqrt((cx - b.sx) ** 2 + (cy - b.sy) ** 2) / ydToPct)
        const midX = (b.sx + cx) / 2
        const midY = (b.sy + cy) / 2
        return (
          <g key={b.id} opacity={opacity}>
            <line x1={b.sx} y1={b.sy} x2={cx} y2={cy}
              stroke="#000" strokeWidth="0.12" strokeDasharray="0.6,0.4" opacity={0.25} />
            {b.progress > 0.05 && (
              <text x={midX} y={midY} className="ball-dist-text" textAnchor="middle" dominantBaseline="central">
                {traveledYd} yd
              </text>
            )}
            {b.phase === 'flying' && (
              <>
                <circle cx={cx} cy={cy} r={r} fill="#000" />
                <circle cx={cx} cy={cy} r={r + 0.3} fill="none" stroke="#000" strokeWidth="0.08" opacity={0.15 + lift * 0.1} />
              </>
            )}
            {b.phase === 'fading' && b.outcome !== 'holed' && (
              <circle cx={b.ex} cy={b.ey} r="0.4" fill="#000" opacity={0.5} />
            )}
          </g>
        )
      })}
    </svg>
  )
}
