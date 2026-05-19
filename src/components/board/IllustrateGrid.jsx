import { ILLUSTRATE_CELLS, STAT_VALUES, DISTANCES } from '../../hooks/useIllustrateState'

const STAT_LABELS = { power: 'Power', aim: 'Aim', touch: 'Touch', nerve: 'Nerve' }
const STAT_SHORT = { power: 'PWR', aim: 'AIM', touch: 'TCH', nerve: 'NRV' }

function outcomeColor(outcome) {
  if (!outcome) return '#666'
  if (outcome === 'holed' || outcome === 'miracle' || outcome === 'pinseeker') return '#4CAF50'
  if (outcome === 'great' || outcome === 'good' || outcome === 'clean') return '#719342'
  if (outcome === 'okay') return '#C49A2A'
  if (outcome === 'missed') return '#D97706'
  return '#EF4444'
}

export default function IllustrateGrid({ balls, varyStat }) {
  const cells = ILLUSTRATE_CELLS
  const short = STAT_SHORT[varyStat] || varyStat.toUpperCase()

  const ballsByCell = new Map()
  for (const b of balls) {
    const key = `${b.cellRow}-${b.cellCol}`
    if (!ballsByCell.has(key)) ballsByCell.set(key, [])
    ballsByCell.get(key).push(b)
  }

  // Precompute column centers for headers
  const colCenters = DISTANCES.map((_, ci) => {
    const cell = cells.find(c => c.col === ci && c.row === 0)
    return cell ? cell.bounds.x + cell.bounds.w / 2 : 0
  })

  return (
    <svg className="illustrate-grid" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
      <defs>
        {cells.map((cell, i) => (
          <clipPath key={i} id={`cell-clip-${i}`}>
            <rect x={cell.bounds.x + 0.1} y={cell.bounds.y} width={cell.bounds.w - 0.2} height={cell.bounds.h} />
          </clipPath>
        ))}
      </defs>

      {/* Cell backgrounds */}
      {cells.map((cell, i) => (
        <rect key={`bg-${i}`} x={cell.bounds.x} y={cell.bounds.y}
          width={cell.bounds.w} height={cell.bounds.h}
          fill={i % 2 === 0 ? 'rgba(0,0,0,0.08)' : 'rgba(0,0,0,0.04)'}
        />
      ))}

      {/* Grid lines */}
      {cells.map((cell, i) => (
        <rect key={`border-${i}`} x={cell.bounds.x} y={cell.bounds.y}
          width={cell.bounds.w} height={cell.bounds.h}
          fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="0.15" rx="0.5"
        />
      ))}

      {/* Top title */}
      <text x={colCenters[0] + (colCenters[2] - colCenters[0]) / 2}
        y={cells[0].bounds.y - 5} textAnchor="middle"
        fontSize="2.8" fill="white" fontWeight="700">
        {STAT_LABELS[varyStat]} Comparison
      </text>

      {/* Column headers (distances) */}
      {DISTANCES.map((d, ci) => (
        <g key={`col-${ci}`}>
          <text x={colCenters[ci]} y={cells[0].bounds.y - 2.5} textAnchor="middle"
            fontSize="2.2" fill="white" fontWeight="700" opacity="0.9">
            {d.label}
          </text>
          <text x={colCenters[ci]} y={cells[0].bounds.y - 0.8} textAnchor="middle"
            fontSize="1.3" fill="white" opacity="0.5">
            {d.sub}
          </text>
        </g>
      ))}

      {/* Row labels (stat values) */}
      {STAT_VALUES.map((val, row) => {
        const cell = cells.find(c => c.row === row && c.col === 0)
        if (!cell) return null
        const cy = cell.bounds.y + cell.bounds.h / 2
        return (
          <g key={`row-${row}`}>
            <text x={cell.bounds.x - 1} y={cy + 0.5}
              textAnchor="end" fontSize="2.5" fill="white" fontWeight="700" opacity="0.85">
              {short} {val}
            </text>
          </g>
        )
      })}

      {/* Hole markers */}
      {cells.map((cell, i) => (
        <g key={`hole-${i}`}>
          <circle cx={cell.hole.x} cy={cell.hole.y} r="0.4"
            fill="rgba(0,0,0,0.3)" stroke="white" strokeWidth="0.1" opacity="0.6" />
          <line x1={cell.hole.x} y1={cell.hole.y - 0.6}
            x2={cell.hole.x} y2={cell.hole.y - 0.1}
            stroke="white" strokeWidth="0.06" opacity="0.4" />
        </g>
      ))}

      {/* Tee markers */}
      {cells.map((cell, i) => (
        <circle key={`tee-${i}`} cx={cell.tee.x} cy={cell.tee.y} r="0.2"
          fill="white" opacity="0.2" />
      ))}

      {/* Balls */}
      {cells.map((cell, cellIdx) => {
        const key = `${cell.row}-${cell.col}`
        const cellBalls = ballsByCell.get(key) || []
        if (cellBalls.length === 0) return null

        return (
          <g key={`balls-${cellIdx}`} clipPath={`url(#cell-clip-${cellIdx})`}>
            {cellBalls.map(b => {
              const opacity = b.phase === 'fading' ? Math.max(0, 1 - b.fade) * 0.6 : 0.7
              const cx = b.sx + (b.ex - b.sx) * b.progress
              const cy = b.sy + (b.ey - b.sy) * b.progress
              const lift = Math.sin(b.progress * Math.PI)
              const color = outcomeColor(b.outcome)

              return (
                <g key={b.id} opacity={opacity}>
                  <line x1={b.sx} y1={b.sy} x2={cx} y2={cy}
                    stroke={color} strokeWidth="0.06" opacity="0.4" />
                  <circle cx={cx} cy={cy} r={0.15 + lift * 0.06} fill={color} />
                </g>
              )
            })}
          </g>
        )
      })}
    </svg>
  )
}
