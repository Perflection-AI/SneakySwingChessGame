import './Scorecard.css'

function formatScore(strokes, par) {
  if (strokes == null) return ''
  const diff = strokes - par
  if (diff === 0) return 'E'
  return diff > 0 ? `+${diff}` : `${diff}`
}

function scoreColor(strokes, par) {
  if (strokes == null) return null
  const diff = strokes - par
  if (diff <= -2) return 'eagle'
  if (diff === -1) return 'birdie'
  if (diff === 0) return 'par'
  if (diff === 1) return 'bogey'
  return 'double'
}

function formatTotal(value) {
  if (value === 0) return 'E'
  return value > 0 ? `+${value}` : `${value}`
}

function totalColorClass(value, completed) {
  if (!completed) return null
  if (value < 0) return 'birdie'
  if (value === 0) return 'par'
  if (value === 1) return 'bogey'
  return 'double'
}

export default function Scorecard({ players, scorecard, holePars, holeNumber, gameFinished }) {
  const totals = players.map(p => {
    const scores = scorecard[p.id] || []
    let total = 0
    for (let i = 0; i < 18; i++) {
      if (scores[i] != null) total += scores[i] - holePars[i]
    }
    return total
  })

  const completedHoles = (scorecard[players[0].id] || []).filter(s => s != null).length

  function holeLeader(i) {
    let bestIdx = -1
    let bestDiff = Infinity
    let allDone = true
    for (let pi = 0; pi < players.length; pi++) {
      const s = scorecard[players[pi].id]?.[i]
      if (s == null) { allDone = false; continue }
      const d = s - holePars[i]
      if (d < bestDiff) { bestDiff = d; bestIdx = pi }
    }
    if (!allDone) return -1
    // Check for tie
    let count = 0
    for (let pi = 0; pi < players.length; pi++) {
      const s = scorecard[players[pi].id]?.[i]
      if (s != null && s - holePars[i] === bestDiff) count++
    }
    return count > 1 ? -1 : bestIdx
  }

  const leaderIdx = (() => {
    if (completedHoles === 0) return -1
    let bestIdx = -1
    let bestTotal = Infinity
    let tied = false
    for (let pi = 0; pi < players.length; pi++) {
      if (totals[pi] < bestTotal) { bestTotal = totals[pi]; bestIdx = pi; tied = false }
      else if (totals[pi] === bestTotal) { tied = true }
    }
    return tied ? -1 : bestIdx
  })()

  return (
    <div className="sc">
      {/* Header row: hole numbers + par */}
      <div className="sc-header">
        <div className="sc-label-col" />
        <div className="sc-scroll">
          <div className="sc-row">
            {holePars.map((_, i) => {
              const isCurrent = i + 1 === holeNumber && !gameFinished
              const isDone = scorecard[players[0].id]?.[i] != null
              return (
                <div key={i} className={`sc-hole${isCurrent ? ' sc-hole-current' : ''}${isDone ? ' sc-hole-done' : ''}`}>
                  {i + 1}
                </div>
              )
            })}
          </div>
          <div className="sc-row sc-row-par">
            {holePars.map((par, i) => {
              const isCurrent = i + 1 === holeNumber && !gameFinished
              return (
                <div key={i} className={`sc-par${isCurrent ? ' sc-hole-current' : ''}`}>
                  {par}
                </div>
              )
            })}
          </div>
        </div>
        <div className="sc-total-col">
          <div className="sc-hole sc-total-hdr">T</div>
          <div className="sc-par sc-total-hdr" />
        </div>
      </div>

      {/* Player rows */}
      {players.map((player, pi) => (
        <div key={player.id} className={`sc-player-row${leaderIdx === pi ? ' sc-leading' : ''}`}>
          <div className="sc-label-col">
            <span className="sc-pdot" style={{ background: player.color }} />
            <span className="sc-pname" style={{ color: player.color }}>{player.name.split(' ')[0]}</span>
          </div>
          <div className="sc-scroll">
            <div className="sc-row sc-row-scores">
              {(scorecard[player.id] || []).map((strokes, i) => {
                const isLeader = holeLeader(i) === pi
                const colorCls = scoreColor(strokes, holePars[i])
                const isCurrent = i + 1 === holeNumber && !gameFinished
                return (
                  <div
                    key={i}
                    className={`sc-score${colorCls ? ` sc-${colorCls}` : ''}${isCurrent ? ' sc-score-current' : ''}${isLeader ? ' sc-score-leader' : ''}`}
                  >
                    {isLeader && <span className="sc-leader-dot" style={{ background: player.color }} />}
                    {formatScore(strokes, holePars[i])}
                  </div>
                )
              })}
            </div>
          </div>
          <div className="sc-total-col">
            <div className={`sc-total${leaderIdx === pi ? ' sc-total-leader' : ''}${totalColorClass(totals[pi], completedHoles > 0) ? ` sc-${totalColorClass(totals[pi], completedHoles > 0)}` : ''}`}>
              {completedHoles > 0 ? formatTotal(totals[pi]) : ''}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
