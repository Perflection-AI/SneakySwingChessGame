import { useRef, useState, useCallback, useEffect } from 'react'
import { useAppConfig } from '../AppProvider'
import appConfig from '../appConfig'
import Player from './Player'
import Scorecard from './Scorecard'
import './Board.css'

const G = appConfig.game

const YD_TO_PCT = G.ydToPct
const CLUTCH_THRESHOLD_YD = G.clutchThresholdYd
const POWER_TO_RANGE = G.powerToRange
const AIM_TO_OFFSET_RATE = G.aimToOffsetRate
const PAR_LAYOUT = G.parLayout
const { distBounds, burstRate, clutchBaseChance, clutchMissDistance, outcomeThresholds, holeDistance } = G

const FLIGHT_DURATION = 1.2
const FADE_DURATION = 2.0

// --- Utilities ---

function distPct(a, b) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2)
}

function generateHoleForPar(par, count) {
  const range = holeDistance[par]
  const targetDistYd = range.min + Math.random() * (range.max - range.min)
  const holeX = 30 + Math.random() * 40
  const holeY = 8 + Math.random() * 8
  const playerY = Math.min(94, holeY + targetDistYd * YD_TO_PCT)
  const positions = Array.from({ length: count }, (_, i) => ({
    x: holeX + (i - (count - 1) / 2) * (4 + Math.random() * 4) + (Math.random() - 0.5) * 3,
    y: playerY + (Math.random() - 0.5) * 4,
  }))
  positions.forEach((p, i) => {
    const actualYd = Math.sqrt((p.x - holeX) ** 2 + (p.y - holeY) ** 2) / YD_TO_PCT
    console.log(`[generateHoleForPar] Par ${par}, player ${i}: target=${Math.round(targetDistYd)}yd, actual=${Math.round(actualYd)}yd, YD_TO_PCT=${YD_TO_PCT}, hole=(${holeX.toFixed(1)},${holeY.toFixed(1)}), player=(${p.x.toFixed(1)},${p.y.toFixed(1)})`)
  })
  return { hole: { x: holeX, y: holeY }, positions, distYd: targetDistYd }
}

// --- Test mode: original mechanics ---

function calculateTestLanding(sx, sy, tx, ty, stats) {
  const { power, aim, nerve } = stats
  const dx = tx - sx, dy = ty - sy
  const clickDist = Math.sqrt(dx * dx + dy * dy)
  if (clickDist < 1) return null

  const maxPushPct = POWER_TO_RANGE[power] * YD_TO_PCT
  const clickDistYd = clickDist / YD_TO_PCT
  const idealDistYd = Math.min(clickDistYd, POWER_TO_RANGE[power])
  const minDistYd = idealDistYd * distBounds.min
  const softCapYd = Math.min(idealDistYd * distBounds.softCap, POWER_TO_RANGE[power] * distBounds.maxPushSoftCap)
  const actualDistYd = sampleAroundIdeal(idealDistYd, minDistYd, softCapYd, nerve)

  const br = nerve >= 8 ? burstRate.high : nerve >= 5 ? burstRate.mid : burstRate.low
  const hardCapYd = POWER_TO_RANGE[power] * br
  const clampedDistYd = Math.min(actualDistYd, hardCapYd)

  const maxOffsetYd = clampedDistYd * AIM_TO_OFFSET_RATE[aim]
  const offsetYd = sampleAroundIdeal(0, -maxOffsetYd, maxOffsetYd, nerve)

  const clampedDistPct = clampedDistYd * YD_TO_PCT
  const offsetPct = offsetYd * YD_TO_PCT

  const dirX = dx / clickDist, dirY = dy / clickDist
  const perpX = -dirY, perpY = dirX

  return {
    endX: sx + dirX * clampedDistPct + perpX * offsetPct,
    endY: sy + dirY * clampedDistPct + perpY * offsetPct,
  }
}

// --- Game mode: sample-first field shot + clutch ---

function sampleAroundIdeal(ideal, min, max, stability) {
  const t = stability / 10
  const rolls = Math.round(1 + t * 5)
  let sum = 0
  for (let i = 0; i < rolls; i++) sum += Math.random()
  const normalized = sum / rolls
  let value = min + normalized * (max - min)
  value = value * (1 - t * 0.45) + ideal * (t * 0.45)
  return value
}

function labelShot(remainingYd, originalDistYd, offsetYd) {
  const ot = outcomeThresholds
  if (remainingYd <= ot.holedYd) return 'holed'
  if (remainingYd <= ot.pinseekerYd) return 'pinseeker'
  const progress = 1 - remainingYd / originalDistYd
  const absOff = Math.abs(offsetYd)
  if (progress >= ot.great.minProgress && absOff <= ot.great.maxOffset) return 'great'
  if (progress >= ot.good.minProgress && absOff <= ot.good.maxOffset) return 'good'
  if (progress >= ot.okay.minProgress) return 'okay'
  return 'bad'
}

function rollBreakthrough(controlScore, distYd, canReach) {
  let clean, pin, miracle
  if (controlScore >= 8) { clean = 0.20; pin = 0.08; miracle = 0.008 }
  else if (controlScore >= 6) { clean = 0.12; pin = 0.04; miracle = 0.003 }
  else if (controlScore >= 4) { clean = 0.06; pin = 0.015; miracle = 0.001 }
  else { clean = 0.02; pin = 0.005; miracle = 0.0002 }

  if (!canReach) pin = 0, miracle = 0
  if (canReach) {
    if (distYd > 180) miracle *= 0.25
    else if (distYd > 80) miracle *= 0.5
  }

  const roll = Math.random()
  if (roll < miracle) return 'miracle'
  if (roll < miracle + pin) return 'pinseeker'
  if (roll < miracle + pin + clean) return 'clean'
  return null
}

function calculateGameLanding(pp, hole, mx, my, stats) {
  const { power, aim, nerve } = stats
  const distP = distPct(pp, hole)
  const distYd = distP / YD_TO_PCT

  // Clutch roll (unchanged)
  if (distYd <= CLUTCH_THRESHOLD_YD) {
    const tier = clutchBaseChance.find(t => distYd <= t.maxDist)
    let baseChance = tier ? tier.chance : 0.28
    const finishScore = nerve * 0.7 + aim * 0.3
    const finalChance = Math.min(0.97, Math.max(0.08, baseChance * (0.75 + finishScore / 10)))

    if (Math.random() < finalChance) {
      return { endX: hole.x, endY: hole.y, outcome: 'holed', remainingYd: 0, isClutch: true }
    }

    const missTier = clutchMissDistance.find(t => distYd <= t.maxDist) || clutchMissDistance[clutchMissDistance.length - 1]
    let newDistYd = missTier.min + Math.random() * missTier.range
    if (nerve >= 7) newDistYd *= 0.7
    else if (nerve <= 3) newDistYd *= 1.3

    const dx = pp.x - hole.x, dy = pp.y - hole.y
    const d = Math.sqrt(dx * dx + dy * dy)
    const dirX = dx / d, dirY = dy / d
    const angle = (Math.random() - 0.5)
    const ndx = dirX * Math.cos(angle) - dirY * Math.sin(angle)
    const ndy = dirX * Math.sin(angle) + dirY * Math.cos(angle)
    const np = newDistYd * YD_TO_PCT

    return {
      endX: hole.x + ndx * np, endY: hole.y + ndy * np,
      outcome: 'missed', remainingYd: newDistYd, isClutch: true,
    }
  }

  // --- Field Shot: sample-first ---
  const controlScore = aim * 0.6 + nerve * 0.4
  const maxPushYd = POWER_TO_RANGE[power]
  const canReach = distYd <= maxPushYd
  let effectiveNerve = nerve

  // Breakthrough roll
  const bt = rollBreakthrough(controlScore, distYd, canReach)
  if (bt === 'miracle') {
    return { endX: hole.x, endY: hole.y, outcome: 'miracle', remainingYd: 0, isClutch: false }
  }
  if (bt === 'pinseeker') {
    const pinDistYd = 2 + Math.random() * 6
    const pinDistPct = pinDistYd * YD_TO_PCT
    const dx = hole.x - pp.x, dy = hole.y - pp.y
    const d = Math.sqrt(dx * dx + dy * dy)
    if (d < 1) return { endX: hole.x, endY: hole.y, outcome: 'pinseeker', remainingYd: pinDistYd, isClutch: false }
    const dirX = dx / d, dirY = dy / d
    const perpX = -dirY, perpY = dirX
    const cdx = mx - pp.x, cdy = my - pp.y
    const cd = Math.sqrt(cdx * cdx + cdy * cdy)
    let side = 0
    if (cd > 1) side = (cdx * perpX + cdy * perpY) / cd * pinDistPct * 0.3
    return {
      endX: hole.x - dirX * pinDistPct + perpX * side,
      endY: hole.y - dirY * pinDistPct + perpY * side,
      outcome: 'pinseeker', remainingYd: pinDistYd, isClutch: false,
    }
  }
  if (bt === 'clean') effectiveNerve = Math.min(10, nerve + 2)

  // Distance sampling
  const idealDistYd = Math.min(distYd, maxPushYd)
  const minDistYd = idealDistYd * distBounds.min
  const softCapYd = Math.min(idealDistYd * distBounds.softCap, maxPushYd * distBounds.maxPushSoftCap)
  const actualDistYd = sampleAroundIdeal(idealDistYd, minDistYd, softCapYd, effectiveNerve)

  // Hard cap: character can only exceed maxPush by 3-6%, scaled by nerve
  const br = effectiveNerve >= 8 ? burstRate.high : effectiveNerve >= 5 ? burstRate.mid : burstRate.low
  const hardCapYd = maxPushYd * br
  const clampedDistYd = Math.min(actualDistYd, hardCapYd)

  // Offset sampling
  const maxOffsetYd = clampedDistYd * AIM_TO_OFFSET_RATE[aim]
  const offsetYd = sampleAroundIdeal(0, -maxOffsetYd, maxOffsetYd, effectiveNerve)

  // Convert to board coords
  const dx = hole.x - pp.x, dy = hole.y - pp.y
  const d = Math.sqrt(dx * dx + dy * dy)
  if (d < 1) return { endX: hole.x, endY: hole.y, outcome: 'great', remainingYd: 0, isClutch: false }
  const dirX = dx / d, dirY = dy / d
  const perpX = -dirY, perpY = dirX
  const distancePct = clampedDistYd * YD_TO_PCT
  const offsetPct = offsetYd * YD_TO_PCT

  const endX = pp.x + dirX * distancePct + perpX * offsetPct
  const endY = pp.y + dirY * distancePct + perpY * offsetPct

  // Auto-hole
  const landingDistYd = distPct({ x: endX, y: endY }, hole) / YD_TO_PCT
  if (landingDistYd <= 1) {
    return { endX: hole.x, endY: hole.y, outcome: 'holed', remainingYd: 0, isClutch: false }
  }

  // Derive outcome label from result
  const remainingYd = Math.abs(distYd - clampedDistYd)
  const outcome = labelShot(remainingYd, distYd, offsetYd)

  return { endX, endY, outcome, remainingYd, isClutch: false }
}

// --- Component ---

export default function Board({ players, activePlayerId, mode }) {
  const { board } = useAppConfig()
  const boardRef = useRef(null)
  const ballsRef = useRef([])
  const [balls, setBalls] = useState([])
  const [playerPos, setPlayerPos] = useState(() => Array.from({ length: players.length }, () => ({ x: 50, y: 88 })))
  const [canShoot, setCanShoot] = useState(true)
  const [holePos, setHolePos] = useState({ x: 50, y: 12 })
  const [strokes, setStrokes] = useState(0)
  const [lastOutcome, setLastOutcome] = useState(null)
  const [shotCount, setShotCount] = useState(0)
  const [holedIn, setHoledIn] = useState(false)
  const [zoom, setZoom] = useState(1.0)
  const [gameState, setGameState] = useState('idle') // idle | playing | paused
  const [turnIdx, setTurnIdx] = useState(0)
  const [turnStrokes, setTurnStrokes] = useState([0, 0])
  const [totalStrokes, setTotalStrokes] = useState(0)
  const [holedSet, setHoledSet] = useState(new Set())
  const [holeNumber, setHoleNumber] = useState(1)
  const [scorecard, setScorecard] = useState(() => ({
    [players[0].id]: Array(18).fill(null),
    [players[1].id]: Array(18).fill(null),
  }))
  const [gameFinished, setGameFinished] = useState(false)

  const modeRef = useRef(mode)
  modeRef.current = mode
  const aIdx = players.findIndex(p => p.id === activePlayerId)
  const aIdxRef = useRef(aIdx)
  aIdxRef.current = aIdx
  const stats = players[aIdx].stats
  const moveTimer = useRef(null)

  const turnRef = useRef(turnIdx)
  turnRef.current = turnIdx
  const gameStateRef = useRef(gameState)
  gameStateRef.current = gameState
  const totalStrokesRef = useRef(totalStrokes)
  totalStrokesRef.current = totalStrokes
  const playerPosRef = useRef(playerPos)
  playerPosRef.current = playerPos
  const holePosRef = useRef(holePos)
  holePosRef.current = holePos
  const turnStrokesRef = useRef(turnStrokes)
  turnStrokesRef.current = turnStrokes
  const holeNumberRef = useRef(holeNumber)
  holeNumberRef.current = holeNumber

  const startGame = useCallback(() => {
    if (moveTimer.current) { clearTimeout(moveTimer.current); moveTimer.current = null }
    const firstHole = generateHoleForPar(PAR_LAYOUT[0], players.length)
    setGameState('playing')
    setHoleNumber(1); holeNumberRef.current = 1
    setTurnIdx(0); turnRef.current = 0
    setTurnStrokes([0, 0])
    setTotalStrokes(0); totalStrokesRef.current = 0
    setHoledSet(new Set())
    setHolePos(firstHole.hole)
    setPlayerPos(firstHole.positions)
    setCanShoot(true)
    setStrokes(0); setLastOutcome(null); setHoledIn(false)
    setGameFinished(false)
    setScorecard({
      [players[0].id]: Array(18).fill(null),
      [players[1].id]: Array(18).fill(null),
    })
    calcAutoZoom(firstHole.positions, firstHole.hole)
    ballsRef.current = []; setBalls([])
  }, [players])

  const pauseGame = useCallback(() => {
    setGameState(s => s === 'playing' ? 'paused' : 'playing')
  }, [])

  const resetGame = useCallback(() => {
    startGame()
  }, [startGame])

  useEffect(() => {
    if (mode === 'game' && gameState === 'idle') startGame()
  }, [mode])

  const handleWheel = useCallback((e) => {
    e.preventDefault()
    setZoom(z => Math.min(3, Math.max(0.5, z - e.deltaY * 0.0008)))
  }, [])

  useEffect(() => {
    const el = boardRef.current
    if (!el) return
    const handler = (e) => { e.preventDefault(); handleWheel(e) }
    el.addEventListener('wheel', handler, { passive: false })
    return () => el.removeEventListener('wheel', handler)
  }, [handleWheel])

  // --- Auto-zoom to fit all players + hole ---
  const calcAutoZoom = useCallback((positions, hole) => {
    const el = boardRef.current
    if (!el) return
    const W = el.offsetWidth, H = el.offsetHeight
    if (!W || !H) return

    const allX = [...positions.map(p => p.x), hole.x]
    const allY = [...positions.map(p => p.y), hole.y]
    const minX = Math.min(...allX), maxX = Math.max(...allX)
    const minY = Math.min(...allY), maxY = Math.max(...allY)
    const spanX = Math.max(maxX - minX, 4)
    const spanY = Math.max(maxY - minY, 4)

    // Spread fills ~55% of viewport
    const fill = 0.55
    const zFromX = (100 * fill) / spanX
    const zFromY = (100 * fill) / spanY
    let z = Math.min(zFromX, zFromY, 3.0)
    z = Math.max(z, 0.5)

    // Pan to center the bounding box midpoint in viewport
    const cx = (minX + maxX) / 2
    const cy = (minY + maxY) / 2
    const px = -z * (cx - 50) / 100 * W
    const py = -z * (cy - 50) / 100 * H

    setZoom(z)
    setPan({ x: px, y: py })
    panRef.current = { x: px, y: py }
  }, [])

  // --- Right-click pan ---
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const panRef = useRef({ x: 0, y: 0 })
  const panAnchor = useRef(null)

  useEffect(() => {
    const el = boardRef.current
    if (!el) return

    const onCtx = (e) => e.preventDefault()
    const onDown = (e) => {
      if (e.button !== 2) return
      e.preventDefault()
      panAnchor.current = { mx: e.clientX, my: e.clientY, px: panRef.current.x, py: panRef.current.y }
      el.classList.add('panning')
    }
    const onMove = (e) => {
      if (!panAnchor.current) return
      const dx = e.clientX - panAnchor.current.mx
      const dy = e.clientY - panAnchor.current.my
      const next = { x: panAnchor.current.px + dx, y: panAnchor.current.py + dy }
      panRef.current = next
      setPan(next)
    }
    const onUp = () => {
      panAnchor.current = null
      el.classList.remove('panning')
    }

    el.addEventListener('contextmenu', onCtx)
    el.addEventListener('mousedown', onDown)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      el.removeEventListener('contextmenu', onCtx)
      el.removeEventListener('mousedown', onDown)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [])

  const activePos = mode === 'game' ? playerPos[turnIdx] : playerPos[aIdx]
  const distYd = Math.round(distPct(activePos, holePos) / YD_TO_PCT)
  const isClutch = distYd <= CLUTCH_THRESHOLD_YD
  const currentPar = PAR_LAYOUT[holeNumber - 1]

  const handleClick = useCallback((e) => {
    if (modeRef.current !== 'test') return
    const el = boardRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const mx = ((e.clientX - rect.left) / rect.width) * 100
    const my = ((e.clientY - rect.top) / rect.height) * 100

    const pp = playerPos[aIdxRef.current]
    const landing = calculateTestLanding(pp.x, pp.y, mx, my, stats)
    if (!landing) return

    const ball = {
      id: Date.now() + Math.random(),
      sx: pp.x, sy: pp.y,
      ex: landing.endX, ey: landing.endY,
      progress: 0, phase: 'flying', fade: 0,
      outcome: null,
    }
    ballsRef.current = [...ballsRef.current, ball]
    setBalls([...ballsRef.current])
  }, [playerPos, stats])

  // --- Game mode: auto-fire ---
  const fireGameShot = useCallback(() => {
    if (gameStateRef.current !== 'playing') return
    const ti = turnRef.current
    if (holedSet.has(ti)) return

    const pp = playerPosRef.current[ti]
    const hole = holePosRef.current
    const pStats = players[ti].stats
    const landing = calculateGameLanding(pp, hole, hole.x, hole.y, pStats)
    if (!landing) return

    setCanShoot(false)
    setStrokes(s => s + 1)
    setLastOutcome(landing.outcome)
    setShotCount(c => c + 1)

    const ball = {
      id: Date.now() + Math.random(),
      sx: pp.x, sy: pp.y,
      ex: landing.endX, ey: landing.endY,
      progress: 0, phase: 'flying', fade: 0,
      outcome: landing.outcome || null,
      playerIdx: ti,
    }
    ballsRef.current = [...ballsRef.current, ball]
    setBalls([...ballsRef.current])

    if (landing.outcome === 'holed') {
      setHoledIn(true)
      setHoledSet(prev => new Set([...prev, ti]))
      setTurnStrokes(prev => { const n = [...prev]; n[ti] = n[ti] + 1; return n })
      setTotalStrokes(prev => prev + 1)
    }
  }, [players, holedSet])

  useEffect(() => {
    if (mode !== 'game' || gameState !== 'playing' || !canShoot || holedIn || gameFinished) return
    const ti = turnIdx
    if (holedSet.has(ti)) {
      const next = players.findIndex((_, i) => !holedSet.has(i))
      if (next >= 0) { setTurnIdx(next); turnRef.current = next }
      return
    }
    const t = setTimeout(fireGameShot, 600)
    return () => clearTimeout(t)
  }, [mode, gameState, canShoot, holedIn, turnIdx, fireGameShot, holedSet, players, gameFinished])

  // Animation loop
  useEffect(() => {
    let last = null, frameId
    const tick = (time) => {
      if (gameStateRef.current === 'paused') { last = null; frameId = requestAnimationFrame(tick); return }
      if (last === null) last = time
      const dt = (time - last) / 1000
      last = time

      const cur = ballsRef.current
      let changed = false
      const next = []

      for (const b of cur) {
        if (b.phase === 'flying') {
          const p = Math.min(b.progress + dt / FLIGHT_DURATION, 1)
          changed = true

          if (p >= 1 && modeRef.current === 'game' && !moveTimer.current) {
            const bx = b.ex, by = b.ey
            const bpi = b.playerIdx ?? turnRef.current
            moveTimer.current = setTimeout(() => {
              setPlayerPos(prev => {
                const n = [...prev]
                n[bpi] = { x: bx, y: by }
                return n
              })
              if (b.outcome !== 'holed') {
                setTurnStrokes(prev => { const n = [...prev]; n[bpi] = n[bpi] + 1; return n })
                setTotalStrokes(prev => prev + 1)
                const nextTi = (bpi + 1) % players.length
                setTurnIdx(nextTi); turnRef.current = nextTi
                setCanShoot(true)
              }
              moveTimer.current = null
            }, 500)
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

      if (changed) { ballsRef.current = next; setBalls(next) }
      frameId = requestAnimationFrame(tick)
    }

    frameId = requestAnimationFrame(tick)
    return () => { cancelAnimationFrame(frameId); if (moveTimer.current) clearTimeout(moveTimer.current) }
  }, [])

  // Reset after holed
  useEffect(() => {
    if (!holedIn) return
    if (mode === 'game') {
      const allHoled = holedSet.size >= players.length
      if (allHoled) {
        const hn = holeNumberRef.current
        const ts = turnStrokesRef.current
        players.forEach((p, i) => {
          setScorecard(prev => {
            const n = { ...prev }
            n[p.id] = [...n[p.id]]
            n[p.id][hn - 1] = ts[i]
            return n
          })
        })
        const isLastHole = hn >= 18
        const delay = isLastHole ? 3000 : 2500
        const t = setTimeout(() => {
          if (isLastHole) {
            setGameFinished(true)
            setGameState('idle')
            setHoledIn(false); setCanShoot(false)
            ballsRef.current = []; setBalls([])
            return
          }
          const nextHoleNum = hn + 1
          const nextPar = PAR_LAYOUT[nextHoleNum - 1]
          const newHole = generateHoleForPar(nextPar, players.length)
          setHoleNumber(nextHoleNum); holeNumberRef.current = nextHoleNum
          setHolePos(newHole.hole)
          setPlayerPos(newHole.positions)
          calcAutoZoom(newHole.positions, newHole.hole)
          setStrokes(0); setLastOutcome(null)
          setHoledSet(new Set())
          setTurnStrokes([0, 0])
          setTurnIdx(0); turnRef.current = 0
          setHoledIn(false); setCanShoot(true)
          ballsRef.current = []; setBalls([])
        }, delay)
        return () => clearTimeout(t)
      }
      const t = setTimeout(() => {
        setHoledIn(false); setCanShoot(true)
        ballsRef.current = []; setBalls([])
      }, 2000)
      return () => clearTimeout(t)
    }
    const t = setTimeout(() => {
      const h = generateHoleForPar(PAR_LAYOUT[holeNumber - 1], players.length)
      setHolePos(h.hole)
      setPlayerPos(h.positions)
      setStrokes(0); setLastOutcome(null); setHoledIn(false); setCanShoot(true)
      ballsRef.current = []; setBalls([])
    }, 2500)
    return () => clearTimeout(t)
  }, [holedIn, players.length, mode, holedSet, players])

  return (
    <div className="board">
      <div className="board-clip">
        {/* Broadcast ticker — dark overlay at bottom of board */}
        {mode === 'game' && !gameFinished && gameState !== 'idle' && (
          <div className="broadcast-ticker">
            <span className="bp-live"><span className="bp-live-dot" />LIVE</span>
            <span className="bp-sep" />
            <span className="bp-info">Hole {holeNumber}<span className="bp-dim">/18</span> · Par {currentPar}</span>
            <span className="bp-sep" />
            <span className="bp-active">
              <span className="bp-active-dot" style={{ background: players[turnIdx].color }} />
              {players[turnIdx].name.split(' ')[0]}
              <span className="bp-dim">&thinsp;{distYd}yd</span>
              {isClutch && <span className="bp-clutch-badge">CLUTCH</span>}
            </span>
            {lastOutcome && (
              <span className={`bp-outcome bp-out-${lastOutcome}`}>
                {lastOutcome === 'miracle' ? 'MIRACLE!' : lastOutcome === 'holed' ? 'HOLED!' : lastOutcome === 'pinseeker' ? 'PIN SEEKER!' : lastOutcome.toUpperCase()}
              </span>
            )}
          </div>
        )}

        {/* Shot result banner */}
        {mode === 'game' && lastOutcome && gameState === 'playing' && (
          <div key={shotCount} className={`shot-banner shot-${lastOutcome}`}>
            {lastOutcome === 'miracle' ? 'MIRACLE!' : lastOutcome === 'holed' ? 'HOLED!' : lastOutcome === 'pinseeker' ? 'PIN SEEKER!' : lastOutcome.toUpperCase()}
          </div>
        )}

        <div
          className={`board-area${zoom > 1 ? ' zoomed' : ''}`}
          ref={boardRef}
          style={{
            aspectRatio: `${board.aspectRatio} / 1`,
            transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
          }}
          onClick={handleClick}
          onWheel={undefined}
        >
          <div className="board-center-dot" />

          {/* Hole */}
          <div className="hole-marker" style={{ left: `${holePos.x}%`, top: `${holePos.y}%` }}>
            <div className="hole-flag" />
            <div className="hole-ring" />
          </div>

          {/* Distance guide line (game mode) */}
          {mode === 'game' && (
            <svg className="distance-layer" viewBox="0 0 100 100" preserveAspectRatio="none">
              <line
                x1={activePos.x} y1={activePos.y}
                x2={holePos.x} y2={holePos.y}
                stroke={isClutch ? '#719342' : '#CDCDCD'}
                strokeWidth="0.15"
                strokeDasharray="0.8,0.5"
                opacity={0.4}
              />
              <circle
                cx={holePos.x} cy={holePos.y}
                r={CLUTCH_THRESHOLD_YD * YD_TO_PCT}
                fill={isClutch ? 'rgba(113,147,65,0.06)' : 'none'}
                stroke={isClutch ? '#719342' : '#CDCDCD'}
                strokeWidth="0.12"
                strokeDasharray="0.5,0.5"
                opacity={isClutch ? 0.5 : 0.25}
              />
            </svg>
          )}

          {/* Balls */}
          <svg className="ball-layer" viewBox="0 0 100 100" preserveAspectRatio="none">
            {balls.map(b => {
              const opacity = b.phase === 'fading' ? 1 - b.fade : 1
              const cx = b.sx + (b.ex - b.sx) * b.progress
              const cy = b.sy + (b.ey - b.sy) * b.progress
              const lift = Math.sin(b.progress * Math.PI)
              const r = 0.4 + lift * 0.2
              return (
                <g key={b.id} opacity={opacity}>
                  <line x1={b.sx} y1={b.sy} x2={cx} y2={cy}
                    stroke="#000" strokeWidth="0.12" strokeDasharray="0.6,0.4" opacity={0.25} />
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

          {/* Holed effect */}
          {holedIn && (
            <div className="holed-effect" style={{ left: `${holePos.x}%`, top: `${holePos.y}%` }} />
          )}

          {/* Players */}
          {players.map((player, i) => (
            <div
              key={player.id}
              className={`board-player-slot${(mode === 'game' ? i === turnIdx : i === aIdx) ? ' active-shooter' : ''}`}
              style={{
                left: `${playerPos[i].x}%`,
                top: `${playerPos[i].y}%`,
                transition: mode === 'game' ? 'left 0.5s ease, top 0.5s ease' : 'none',
              }}
            >
              <Player player={player} />
            </div>
          ))}
        </div>
      </div>

      {/* Below board: scorecard + controls */}
      {mode === 'game' && (
        <>
          {gameFinished ? (
            <>
              <div className="broadcast-finished">
                <span className="bf-badge">FINAL</span>
                <span className="bf-text">18 Holes Complete</span>
              </div>
              <Scorecard players={players} scorecard={scorecard} holePars={PAR_LAYOUT} holeNumber={holeNumber} gameFinished={gameFinished} />
              <div className="board-controls">
                <button className="control-btn control-start" onClick={startGame}>New Game</button>
              </div>
            </>
          ) : (
            <>
              <Scorecard players={players} scorecard={scorecard} holePars={PAR_LAYOUT} holeNumber={holeNumber} gameFinished={gameFinished} />
              <div className="board-controls">
                {gameState !== 'playing' && (
                  <button className="control-btn control-start" onClick={startGame}>
                    {gameState === 'paused' ? 'Resume' : 'Start'}
                  </button>
                )}
                {gameState === 'playing' && (
                  <button className="control-btn control-pause" onClick={pauseGame}>Pause</button>
                )}
                {gameState !== 'idle' && (
                  <button className="control-btn control-stop" onClick={resetGame}>Reset</button>
                )}
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
