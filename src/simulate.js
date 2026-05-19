import {
  calculateGameLanding,
  generateHoleForPar,
  PAR_LAYOUT,
} from './utils/shotPhysics.js'

// ─── Core simulation ────────────────────────────────────────────────────────

export function simulateHole(stats, par) {
  const hole = generateHoleForPar(par, 1)
  let { x: px, y: py } = hole.positions[0]
  const { x: hx, y: hy } = hole.hole
  let strokes = 0

  while (strokes < 20) {
    strokes++
    const landing = calculateGameLanding(
      { x: px, y: py }, { x: hx, y: hy }, hx, hy, stats,
    )
    if (landing.outcome === 'holed' || landing.outcome === 'miracle') break
    px = landing.endX
    py = landing.endY
  }

  return { strokes, par, scoreToPar: strokes - par }
}

export function simulateRound(stats) {
  let totalStrokes = 0
  for (let i = 0; i < 18; i++) {
    totalStrokes += simulateHole(stats, PAR_LAYOUT[i]).strokes
  }
  const totalPar = PAR_LAYOUT.reduce((a, b) => a + b, 0)
  return { totalStrokes, vsPar: totalStrokes - totalPar }
}

// ─── Single-threaded batch (for browser console) ────────────────────────────

export function runBatch(roles, pars, runsPerConfig) {
  const allResults = []
  for (const { name, stats } of roles) {
    for (const par of pars) {
      const results = []
      for (let i = 0; i < runsPerConfig; i++) {
        results.push(simulateHole(stats, par))
      }
      allResults.push({ name, par, results })
    }
  }
  return allResults
}

export function analyzeResults(results) {
  const n = results.length
  const strokes = results.map(r => r.strokes)
  const sum = strokes.reduce((a, b) => a + b, 0)
  const sumSq = strokes.reduce((a, b) => a + b * b, 0)
  const avg = sum / n
  const std = Math.sqrt(Math.max(0, sumSq / n - avg * avg))

  const distribution = {}
  let birdie = 0, parCount = 0, bogey = 0, blowup = 0
  for (const r of results) {
    distribution[r.strokes] = (distribution[r.strokes] || 0) + 1
    if (r.scoreToPar <= -1) birdie++
    if (r.scoreToPar === 0) parCount++
    if (r.scoreToPar >= 1) bogey++
    if (r.scoreToPar >= 2) blowup++
  }

  return {
    runs: n,
    avg: Math.round(avg * 100) / 100,
    std: Math.round(std * 100) / 100,
    birdiePct: Math.round(birdie / n * 1000) / 10,
    parPct: Math.round(parCount / n * 1000) / 10,
    bogeyPct: Math.round(bogey / n * 1000) / 10,
    blowupPct: Math.round(blowup / n * 1000) / 10,
    distribution,
  }
}

// ─── Partial aggregation (for worker → main thread merge) ───────────────────

export function buildPartialAggregate(results, id, name, par) {
  let sumStrokes = 0, sumSqStrokes = 0
  const distribution = {}
  const scoreToParCounts = {}

  for (const r of results) {
    sumStrokes += r.strokes
    sumSqStrokes += r.strokes * r.strokes
    distribution[r.strokes] = (distribution[r.strokes] || 0) + 1
    scoreToParCounts[r.scoreToPar] = (scoreToParCounts[r.scoreToPar] || 0) + 1
  }

  return { id, name, par, runs: results.length, sumStrokes, sumSqStrokes, distribution, scoreToParCounts }
}

export function buildPartialRoundAggregate(results, id, name) {
  let sumStrokes = 0, sumSqStrokes = 0
  const distribution = {}
  const scoreToParCounts = {}

  for (const r of results) {
    sumStrokes += r.totalStrokes
    sumSqStrokes += r.totalStrokes ** 2
    distribution[r.totalStrokes] = (distribution[r.totalStrokes] || 0) + 1
    scoreToParCounts[r.vsPar] = (scoreToParCounts[r.vsPar] || 0) + 1
  }

  return { id, name, runs: results.length, sumStrokes, sumSqStrokes, distribution, scoreToParCounts }
}

export function mergePartials(partials) {
  const merged = {
    id: partials[0].id,
    name: partials[0].name,
    par: partials[0].par,
    runs: 0,
    sumStrokes: 0,
    sumSqStrokes: 0,
    distribution: {},
    scoreToParCounts: {},
  }

  for (const p of partials) {
    merged.runs += p.runs
    merged.sumStrokes += p.sumStrokes
    merged.sumSqStrokes += p.sumSqStrokes
    for (const [k, v] of Object.entries(p.distribution)) {
      merged.distribution[k] = (merged.distribution[k] || 0) + v
    }
    for (const [k, v] of Object.entries(p.scoreToParCounts)) {
      merged.scoreToParCounts[k] = (merged.scoreToParCounts[k] || 0) + v
    }
  }

  return merged
}

export function finalizeAggregate(m) {
  const avg = m.sumStrokes / m.runs
  const std = Math.sqrt(Math.max(0, m.sumSqStrokes / m.runs - avg * avg))

  let birdie = 0, parCount = 0, bogey = 0, blowup = 0
  for (const [k, v] of Object.entries(m.scoreToParCounts)) {
    const val = Number(k)
    if (val <= -1) birdie += v
    if (val === 0) parCount += v
    if (val >= 1) bogey += v
    if (val >= 2) blowup += v
  }

  return {
    name: m.name,
    par: m.par,
    runs: m.runs,
    avg: Math.round(avg * 100) / 100,
    std: Math.round(std * 100) / 100,
    birdiePct: Math.round(birdie / m.runs * 1000) / 10,
    parPct: Math.round(parCount / m.runs * 1000) / 10,
    bogeyPct: Math.round(bogey / m.runs * 1000) / 10,
    blowupPct: Math.round(blowup / m.runs * 1000) / 10,
    distribution: m.distribution,
  }
}
