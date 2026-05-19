import { useState, useEffect, useRef, useCallback } from 'react'
import { calculateGameLanding, YD_TO_PCT } from '../utils/shotPhysics'

const STAT_VALUES = [1, 3, 5, 7, 9]
const DISTANCES = [
  { label: 'Far', sub: 'Par 5 ~200yd', yd: 200 },
  { label: 'Mid', sub: 'Par 3 ~100yd', yd: 100 },
  { label: 'Near', sub: 'Clutch ~15yd', yd: 15 },
]

export { STAT_VALUES, DISTANCES }

function computeCellLayout() {
  const margin = { left: 12, right: 2, top: 9, bottom: 2 }
  const usableW = 100 - margin.left - margin.right
  const colCount = DISTANCES.length   // 3 columns = distances
  const rowCount = STAT_VALUES.length // 5 rows = stat values
  const colGap = 1.5
  const rowGap = 1.5

  const colW = (usableW - colGap * (colCount - 1)) / colCount
  const rowH = (100 - margin.top - margin.bottom - rowGap * (rowCount - 1)) / rowCount

  let curY = margin.top
  const cells = []

  for (let row = 0; row < rowCount; row++) {
    for (let col = 0; col < colCount; col++) {
      const cellLeft = margin.left + col * (colW + colGap)
      const cellTop = curY
      const cx = cellLeft + colW / 2
      cells.push({
        row, col,
        statValue: STAT_VALUES[row],
        distance: DISTANCES[col].yd,
        distanceLabel: DISTANCES[col].label,
        hole: { x: cx, y: cellTop + 1 },
        tee: { x: cx, y: cellTop + rowH - 1 },
        bounds: { x: cellLeft, y: cellTop, w: colW, h: rowH },
      })
    }
    curY += rowH + rowGap
  }

  return cells
}

export const ILLUSTRATE_CELLS = computeCellLayout()

export function useIllustrateState(config) {
  const ballsRef = useRef([])
  const [balls, setBalls] = useState([])
  const nextId = useRef(0)
  const configRef = useRef(config)
  configRef.current = config

  const fireShots = useCallback(() => {
    const { varyStat, baseStats, paused } = configRef.current
    if (paused) return

    const newBalls = ILLUSTRATE_CELLS.map(cell => {
      const stats = { ...baseStats, [varyStat]: cell.statValue }

      // Virtual tee/hole at correct yardage distance for physics
      const vDist = cell.distance * YD_TO_PCT
      const vTee = { x: 50, y: vDist }
      const vHole = { x: 50, y: 0 }
      const landing = calculateGameLanding(vTee, vHole, vHole.x, vHole.y, stats)
      if (!landing) return null

      // Map virtual coords → cell bounds
      const cellH = cell.tee.y - cell.hole.y
      const s = cellH / vDist
      const cx = cell.hole.x

      return {
        id: nextId.current++,
        cellRow: cell.row,
        cellCol: cell.col,
        sx: cx,
        sy: cell.tee.y,
        ex: cx + (landing.endX - 50) * s,
        ey: cell.hole.y + landing.endY * s,
        progress: 0,
        phase: 'flying',
        fade: 0,
        outcome: landing.outcome || null,
      }
    }).filter(Boolean)

    ballsRef.current = [...ballsRef.current, ...newBalls]
  }, [])

  useEffect(() => {
    if (config.paused) return
    const id = setInterval(fireShots, 500)
    return () => clearInterval(id)
  }, [config.paused, fireShots])

  useEffect(() => {
    const raf = () => {
      if (ballsRef.current.length > 0) {
        setBalls([...ballsRef.current])
      }
    }
    const id = setInterval(raf, 50)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    ballsRef.current = []
    setBalls([])
  }, [config.varyStat, config.baseStats])

  return { balls, ballsRef }
}
