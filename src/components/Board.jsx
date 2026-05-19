import { useRef, useCallback, useEffect, useState, useMemo } from 'react'

const STAT_MAPPING_DESC = [
  'PWR ← Rotation + Sequencing',
  'AIM ← Plane Control + Impact Control',
  'TCH ← Balance + Stability',
]

const ILLUST_DESC = {
  power: 'Controls how far the ball can fly. Higher power reaches farther holes, but doesn\'t help once you\'re close.',
  aim: 'Controls left/right deviation. Higher aim keeps the ball on target line — misses get amplified at distance.',
  touch: 'Controls distance precision, consistency, and clutch putting. Higher touch means tighter shot distribution and more made putts.',
}
import appConfig from '../appConfig'
import { useAppConfig } from '../AppProvider'
import {
  YD_TO_PCT, CLUTCH_THRESHOLD_YD, PAR_LAYOUT,
  SHOT_DELAY, distPct, generateHoleForPar, generateHoleFromMap,
  calculateTestLanding, calculateGameLanding, timing,
  SWING_ISSUES,
} from '../utils/shotPhysics'
import { getCardDef } from '../cards'
import { checkOverflow } from '../utils/overflowCheck'
import { selectCommentary, selectHoleOpenCommentary } from '../commentaryEngine'
import { useGameReducer, computeEffectiveStats } from '../hooks/useGameReducer'
import { useBallAnimation } from '../hooks/useBallAnimation'
import { useBoardZoom, calcAutoZoom, calcFollowUpZoom } from '../hooks/useBoardZoom'
import { useBoardPan } from '../hooks/useBoardPan'
import Scorecard from './Scorecard'
import CommentaryFeed from './board/CommentaryFeed'
import GameControls from './board/GameControls'
import CardPicker from './board/CardPicker'
import DeckPicker from './board/DeckPicker'
import BoardArea from './board/BoardArea'
import HoleMarker from './board/HoleMarker'
import DistanceGuide from './board/DistanceGuide'
import FieldCardMarker from './board/FieldCardMarker'
import BallLayer from './board/BallLayer'
import HoledEffect from './board/HoledEffect'
import PlayerSlot from './board/PlayerSlot'
import BroadcastTicker from './board/BroadcastTicker'
import ShotBanner from './board/ShotBanner'
import GameFinished from './board/GameFinished'
import FireAnimation, { precachePlayers } from './board/FireAnimation'
import IllustrateGrid from './board/IllustrateGrid'
import { useIllustrateState } from '../hooks/useIllustrateState'
import { useIllustrateAnimation } from '../hooks/useIllustrateAnimation'
import Palette from '../Palette'
import './Board.css'

function scopeLabel(card) {
  if (card.target === 'all') return 'All players'
  if (card.target === 'opponent') return 'Opponents'
  return 'Self'
}

function ActiveEffects({ activeCard, activeWeather, cardPenalties, players, turnIdx, stageIndex }) {
  const tags = []

  // Active card being played (animal_event persists through flight)
  if (activeCard && activeCard.system === 'animal_event') {
    const s = Palette.effect.animal_event
    tags.push(
      <div key="active-card" className="ae-tag" style={{ background: s.bg, borderColor: s.border, color: s.text }}>
        <span className="ae-tag-type">{s.label}</span>
        <span className="ae-tag-name">{activeCard.name}</span>
        <span className="ae-tag-scope">{scopeLabel(activeCard)}</span>
      </div>
    )
  }

  // Active weather (persists across all players in round)
  if (activeWeather) {
    const s = Palette.effect.weather
    tags.push(
      <div key="weather" className="ae-tag" style={{ background: s.bg, borderColor: s.border, color: s.text }}>
        <span className="ae-tag-type">{s.label}</span>
        <span className="ae-tag-name">{activeWeather.name}</span>
        <span className="ae-tag-scope">All players · Stage {stageIndex + 1}</span>
      </div>
    )
  }

  // Card penalties (e.g. Angry Goose touch -2, Sly Fox aim -2)
  for (const pen of cardPenalties) {
    if (pen.remainingSwings <= 0) continue
    const targetPlayer = players[pen.targetPlayerIdx]
    if (!targetPlayer) continue
    const statLabel = pen.stat.toUpperCase().slice(0, 3)
    const mod = pen.mod > 0 ? `+${pen.mod}` : `${pen.mod}`
    tags.push(
      <div key={`${pen.stat}-${pen.targetPlayerIdx}`} className="ae-tag ae-tag-penalty" style={{ borderColor: targetPlayer.color }}>
        <span className="ae-tag-dot" style={{ background: targetPlayer.color }} />
        <span className="ae-tag-name">{targetPlayer.abbr} {statLabel} {mod}</span>
        <span className="ae-tag-scope">{pen.remainingSwings} swing left</span>
      </div>
    )
  }

  if (tags.length === 0) return null

  return (
    <div className="active-effects">
      <span className="ae-label">ACTIVE</span>
      {tags}
    </div>
  )
}

export default function Board({ players, activePlayerId, mode, onControls, illustrateConfig, testConfig, mapImageUrl, onShotResult }) {
  const { board } = useAppConfig()
  const boardRef = useRef(null)
  const [state, dispatch, gameRef] = useGameReducer(players)
  const { zoom, setZoom } = useBoardZoom(boardRef)
  const { pan, panRef, setPan } = useBoardPan(boardRef)
  const isFullscreen = mode === 'game'
  const [introPlayer, setIntroPlayer] = useState(null)

  // Reactive map state — synced from appConfig.map whenever holeNumber changes
  const [mapTransform, setMapTransform] = useState(null)
  const [activeMapImageUrl, setActiveMapImageUrl] = useState(mapImageUrl)
  useEffect(() => {
    if (state.primaryStatus === 'run' || state.primaryStatus === 'off') {
      setMapTransform(appConfig.map.transform || null)
      setActiveMapImageUrl(appConfig.map.imageUrl || null)
    }
  }, [state.holeNumber, state.primaryStatus])

  // Map-aware hole generation
  const makeHole = useCallback((holeIndex, playerCount) => {
    const map = appConfig.map
    if (map?.holePlan?.length > 0) {
      return generateHoleFromMap(holeIndex, playerCount)
    }
    const par = PAR_LAYOUT[holeIndex]
    return generateHoleForPar(par, playerCount)
  }, [])

  // Illustrate mode hooks
  const illustPausedRef = useRef(illustrateConfig?.paused ?? false)
  illustPausedRef.current = illustrateConfig?.paused ?? false
  const { balls: illustBalls, ballsRef: illustBallsRef, syncBalls: illustSyncBalls } = useIllustrateState(illustrateConfig)
  useIllustrateAnimation(illustBallsRef, illustPausedRef, illustSyncBalls)

  const modeRef = useRef(mode)
  modeRef.current = mode
  const aIdx = players.findIndex(p => p.id === activePlayerId)
  const aIdxRef = useRef(aIdx)
  aIdxRef.current = aIdx
  const recentTemplateIds = useRef([])

  useBallAnimation({ gameRef, dispatch, modeRef, players })

  // --- Game control callbacks ---

  const applyAutoZoom = useCallback((positions, hole) => {
    const el = boardRef.current
    if (!el) return
    const { zoom: z, pan: p } = calcAutoZoom(positions, hole, el.offsetWidth, el.offsetHeight)
    setZoom(z)
    setPan(p)
    panRef.current = p
  }, [setZoom, setPan, panRef])

  const applyFollowUpZoom = useCallback((activePos, hole) => {
    const el = boardRef.current
    if (!el) return
    const { zoom: z, pan: p } = calcFollowUpZoom(activePos, hole, el.offsetWidth, el.offsetHeight)
    setZoom(z)
    setPan(p)
    panRef.current = p
  }, [setZoom, setPan, panRef])

  const startGame = useCallback(() => {
    recentTemplateIds.current = []
    precachePlayers(players)
    dispatch({ type: 'START_GAME', payload: { players } })
    setTimeout(() => {
      const gs = gameRef.current
      applyAutoZoom(gs.playerPos, gs.holePos)
      // After auto-zoom settles, focus on the first player before their shot
      setTimeout(() => {
        const gs2 = gameRef.current
        applyFollowUpZoom(gs2.playerPos[gs2.turnIdx], gs2.holePos)
      }, 1100)
      dispatch({ type: 'SPAWN_FIELD_CARDS' })
    }, 0)
  }, [players, dispatch, gameRef, applyAutoZoom, applyFollowUpZoom])

  // --- Auto-start: 0.5s after entering game mode ---

  useEffect(() => {
    if (mode !== 'game') return
    if (state.primaryStatus !== 'off') return
    if (state.gameFinished) return
    const t = setTimeout(startGame, 500)
    return () => clearTimeout(t)
  }, [mode, state.primaryStatus, state.gameFinished, startGame])

  const pauseGame = useCallback(() => {
    const gs = gameRef.current
    if (gs.primaryStatus === 'run') {
      dispatch({ type: 'PAUSE_GAME' })
    } else if (gs.primaryStatus === 'pause') {
      dispatch({ type: 'RESUME_GAME' })
    }
  }, [dispatch, gameRef])

  const resetGame = useCallback(() => {
    dispatch({ type: 'RESET_GAME' })
    setZoom(1.0)
    setPan({ x: 0, y: 0 })
    panRef.current = { x: 0, y: 0 }
  }, [dispatch, setZoom, setPan, panRef])

  // --- Card action callbacks (shared between floating layers) ---

  const handleUseCard = useCallback((id) => dispatch({ type: 'USE_CARD', payload: { cardId: id } }), [dispatch])
  const handleSkipCard = useCallback(() => dispatch({ type: 'SKIP_CARD' }), [dispatch])
  const handleExchangeCards = useCallback((cardIds) => dispatch({ type: 'EXCHANGE_CARDS', payload: { cardIds } }), [dispatch])
  const handleSelectDeck = useCallback((deckType) => dispatch({ type: 'SELECT_DECK', payload: { deckType } }), [dispatch])

  // --- Mode switch: reset zoom & apply auto-zoom ---

  const prevModeRef = useRef(mode)
  useEffect(() => {
    if (mode === prevModeRef.current) return
    prevModeRef.current = mode
    setZoom(1.0)
    setPan({ x: 0, y: 0 })
    panRef.current = { x: 0, y: 0 }
    // Reset to initial positions when entering test mode
    if (mode === 'test') {
      const initPos = Array.from({ length: players.length }, () => ({ x: 50, y: 50 }))
      dispatch({ type: 'TRANSITION_HOLE', payload: { nextHoleNum: 1, hole: { x: 50, y: 12 }, positions: initPos } })
      setTimeout(() => {
        applyAutoZoom(initPos, { x: 50, y: 12 })
      }, 0)
    }
  }, [mode, players, dispatch, setZoom, setPan, panRef, applyAutoZoom])

  // --- Computed values ---

  const activePos = mode === 'game' ? state.playerPos[state.turnIdx] : state.playerPos[aIdx]
  const distYd = Math.round(distPct(activePos, state.holePos) / YD_TO_PCT)
  const isClutch = distYd <= CLUTCH_THRESHOLD_YD
  const currentPar = PAR_LAYOUT[state.holeNumber - 1]

  // --- Test mode click handler ---

  const testConfigRef = useRef(testConfig)
  testConfigRef.current = testConfig

  const handleClick = useCallback((e) => {
    if (modeRef.current !== 'test') return
    const el = boardRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const mx = ((e.clientX - rect.left) / rect.width) * 100
    const my = ((e.clientY - rect.top) / rect.height) * 100

    const pp = gameRef.current.playerPos[aIdxRef.current]
    const tc = testConfigRef.current
    const landing = calculateTestLanding(pp.x, pp.y, mx, my, tc.stats, tc.issue)
    if (!landing) return

    onShotResult?.({
      endX: landing.endX, endY: landing.endY,
      holeX: gameRef.current?.hole?.x, holeY: gameRef.current?.hole?.y,
      outcome: landing.outcome
    })

    const ball = {
      id: Date.now() + Math.random(),
      sx: pp.x, sy: pp.y,
      ex: landing.endX, ey: landing.endY,
      progress: 0, phase: 'flying', fade: 0,
      outcome: null,
    }
    dispatch({ type: 'TICK_ANIMATION', payload: { balls: [...gameRef.current.balls, ball] } })
  }, [dispatch, gameRef])

  // --- Game mode: fire shot ---

  const fireGameShot = useCallback(() => {
    const gs = gameRef.current
    if (gs.primaryStatus !== 'run') return
    const ti = gs.turnIdx
    if (gs.holedSet.includes(ti)) return

    const pp = gs.playerPos[ti]
    const hole = gs.holePos
    const card = gs.activeCard
    const pStats = computeEffectiveStats(gs, ti, players)

    let landing = calculateGameLanding(pp, hole, hole.x, hole.y, pStats)
    if (!landing) return

    // Brainrot: overflow detection (Power > 10)
    if (pStats.power > 10) {
      const ov = checkOverflow(pStats.power)
      if (ov) {
        const dx = landing.endX - pp.x, dy = landing.endY - pp.y
        landing = {
          ...landing,
          endX: pp.x + dx * ov.distMultiplier,
          endY: pp.y + dy * ov.distMultiplier,
        }
        const wobblePct = (Math.random() - 0.5) * 2 * ov.wobbleYd * YD_TO_PCT
        landing = { ...landing, endX: landing.endX + wobblePct }
      }
    }

    // ② Weather Modifier — applies to ALL players' shots
    const weather = gs.activeWeather
    if (weather && weather.effect) {
      if (weather.effect.offsetXRange) {
        const [min, max] = weather.effect.offsetXRange
        const offsetYd = min + Math.random() * (max - min)
        const offsetPct = offsetYd * YD_TO_PCT
        landing = { ...landing, endX: landing.endX + offsetPct }
      }
      if (weather.effect.pushMultiplier && weather.effect.pushMultiplier !== 1.0) {
        // Reduce push: move ball back toward player by the lost distance
        const dx = landing.endX - pp.x, dy = landing.endY - pp.y
        const lostRatio = 1 - weather.effect.pushMultiplier
        landing = {
          ...landing,
          endX: landing.endX - dx * lostRatio,
          endY: landing.endY - dy * lostRatio,
        }
      }
      // Recalculate remainingYd after weather moved the ball
      const weatheredDistYd = distPct({ x: landing.endX, y: landing.endY }, hole) / YD_TO_PCT
      landing = { ...landing, remainingYd: weatheredDistYd }
      // Weather may have pushed ball into the hole (≤1yd)
      if (weatheredDistYd <= 1 && landing.outcome !== 'holed' && landing.outcome !== 'miracle') {
        landing = { ...landing, endX: hole.x, endY: hole.y, remainingYd: 0, outcome: 'holed' }
      }
    }

    const distBefore = distPct(pp, hole) / YD_TO_PCT
    const enteredClutch = distBefore > CLUTCH_THRESHOLD_YD && landing.remainingYd <= CLUTCH_THRESHOLD_YD

    const currentStrokeCount = gs.turnStrokes[ti] + 1
    const cmtCtx = {
      hole: gs.holeNumber,
      par: PAR_LAYOUT[gs.holeNumber - 1],
      stroke: currentStrokeCount,
      playerName: players[ti].name.split(' ')[0],
      distanceBefore: Math.round(distBefore),
      distanceAfter: Math.round(landing.remainingYd),
      progressYd: Math.round(distBefore - landing.remainingYd),
      outcome: landing.outcome,
      isClutch: landing.isClutch,
      enteredClutch,
      cardUsed: card ? card.id : null,
      cardName: card ? card.name : '',
      cardFlavor: card ? card.flavorText : '',
    }
    const cmt = selectCommentary(cmtCtx, recentTemplateIds.current)
    recentTemplateIds.current = [...recentTemplateIds.current, cmt.templateId]

    const isHoled = landing.outcome === 'holed' || landing.outcome === 'miracle'
    let updatedTurnStrokes = gs.turnStrokes
    let updatedTotalStrokes = gs.totalStrokes
    if (isHoled) {
      updatedTurnStrokes = [...gs.turnStrokes]
      updatedTurnStrokes[ti] += 1
      updatedTotalStrokes = gs.totalStrokes + 1
    }

    const ball = {
      id: Date.now() + Math.random(),
      sx: pp.x, sy: pp.y,
      ex: landing.endX, ey: landing.endY,
      progress: 0, phase: 'flying', fade: 0,
      outcome: landing.outcome || null,
      playerIdx: ti,
    }

    dispatch({
      type: 'FIRE_SHOT',
      payload: {
        ball,
        lastOutcome: landing.outcome,
        isHoled,
        holedPlayerIdx: ti,
        commentary: [{
          id: Date.now(),
          text: cmt.text,
          stroke: currentStrokeCount,
          playerName: players[ti].name.split(' ')[0],
        }],
        updatedTurnStrokes,
        updatedTotalStrokes,
      },
    })
  }, [players, dispatch, gameRef])

  // --- Per-shot auto-zoom & camera followup ---

  useEffect(() => {
    if (mode !== 'game') return
    if (state.primaryStatus !== 'run') return
    if (state.gameFinished) return
    if (state.secondaryStatus !== 'camera_followup') return
    const settleTimer = setTimeout(() => {
      dispatch({ type: 'CAMERA_SETTLED' })
    }, timing.cameraFollowUp)
    // Skip camera move when someone holed — just wait for settle
    if (!state.holedIn) {
      const moveTimer = setTimeout(() => {
        const ti = state.turnIdx
        applyFollowUpZoom(state.playerPos[ti], state.holePos)
      }, 250)
      return () => { clearTimeout(settleTimer); clearTimeout(moveTimer) }
    }
    return () => clearTimeout(settleTimer)
  }, [mode, state.primaryStatus, state.secondaryStatus, state.turnIdx,
      state.playerPos, state.holePos, state.gameFinished, state.holedIn,
      applyFollowUpZoom, dispatch])

  // --- Auto-skip cards for AI (Sofia) ---

  useEffect(() => {
    if (!appConfig.cards?.enabled) return
    if (mode !== 'game') return
    if (state.primaryStatus !== 'run') return
    if (state.secondaryStatus !== 'card_picking') return
    if (!state.cardPending) return
    if (state.turnIdx === 0) return
    const t = setTimeout(() => dispatch({ type: 'SKIP_CARD' }), 300)
    return () => clearTimeout(t)
  }, [mode, state.primaryStatus, state.secondaryStatus, state.turnIdx,
      state.cardPending, state.gameFinished, dispatch])

  // --- Auto-fire effect → triggers player intro first ---

  useEffect(() => {
    if (mode !== 'game') return
    if (state.primaryStatus !== 'run') return
    if (state.secondaryStatus !== 'card_picking') return
    if (state.gameFinished) return
    if (state.holedIn) return
    if (state.cardPending) return
    if (introPlayer !== null) return
    const ti = state.turnIdx
    if (state.holedSet.includes(ti)) {
      const next = players.findIndex((_, i) => !state.holedSet.includes(i))
      if (next >= 0) dispatch({ type: 'SWITCH_TURN', payload: { nextTurnIdx: next } })
      return
    }
    // Show player intro (1s photos), then fire
    setIntroPlayer(ti)
  }, [mode, state.primaryStatus, state.secondaryStatus, state.turnIdx,
      state.holedSet, state.gameFinished, state.holedIn, state.cardPending,
      introPlayer, players, dispatch])

  // Player intro complete → fire shot
  const handleIntroComplete = useCallback(() => {
    setIntroPlayer(null)
    fireGameShot()
  }, [fireGameShot])

  // --- Hole transition ---

  useEffect(() => {
    if (!state.holedIn) return
    if (mode === 'game') {
      const allHoled = state.holedSet.length >= players.length
      if (allHoled) {
        const isLastHole = state.holeNumber >= 18
        const delay = isLastHole ? timing.holeTransitionFinal : timing.holeTransition
        const t = setTimeout(() => {
          if (isLastHole) {
            dispatch({ type: 'FINISH_GAME' })
            return
          }
          const nextHoleNum = state.holeNumber + 1
          const nextPar = PAR_LAYOUT[nextHoleNum - 1]
          const newHole = makeHole(nextHoleNum - 1, players.length)
          applyAutoZoom(newHole.positions, newHole.hole)
          const hoCmt = selectHoleOpenCommentary(nextHoleNum, nextPar, recentTemplateIds.current)
          recentTemplateIds.current = [...recentTemplateIds.current, hoCmt.templateId]
          dispatch({
            type: 'TRANSITION_HOLE',
            payload: {
              nextHoleNum,
              hole: newHole.hole,
              positions: newHole.positions,
              commentary: {
                id: Date.now() + 1,
                text: hoCmt.text,
                stroke: 0,
                playerName: '',
              },
            },
          })
        }, delay)
        return () => clearTimeout(t)
      }
      const t = setTimeout(() => {
        dispatch({ type: 'RESUME_AFTER_HOLE' })
      }, timing.holedReset)
      return () => clearTimeout(t)
    }
    // Test mode: reset hole
    const t = setTimeout(() => {
      const h = makeHole(state.holeNumber - 1, players.length)
      dispatch({
        type: 'TRANSITION_HOLE',
        payload: {
          nextHoleNum: state.holeNumber,
          hole: h.hole,
          positions: h.positions,
        },
      })
    }, 2500)
    return () => clearTimeout(t)
  }, [state.holedIn, mode, state.holedSet, state.holeNumber,
      state.turnStrokes, players, dispatch, applyAutoZoom])

  // --- Expose controls to parent ---

  useEffect(() => {
    onControls?.({ primaryStatus: state.primaryStatus, onStart: startGame, onPause: pauseGame, onReset: resetGame, gameFinished: state.gameFinished })
  }, [state.primaryStatus, state.gameFinished, onControls, startGame, pauseGame, resetGame])

  // --- Render ---

  return (
    <div className={`board${isFullscreen ? ' board-game-fullscreen' : ''}`}>
      <div className="board-clip" style={mode === 'illustrate' ? { aspectRatio: `1 / 2` } : undefined}>
        {mode === 'illustrate' ? (
          <IllustrateGrid
            balls={illustBalls}
            varyStat={illustrateConfig.varyStat}
          />
        ) : (
          <>
            {mode === 'game' && state.primaryStatus !== 'off' && (
              <div className="phase-badge">
                <span className="pb-primary">{state.primaryStatus}</span>
                {state.secondaryStatus && <span className="pb-secondary">{state.secondaryStatus}</span>}
                {state.holedIn && <span className="pb-flag">holedIn</span>}
                <span className="pb-info">H{state.holeNumber} P{state.turnIdx + 1}</span>
              </div>
            )}
            {mode === 'game' && !state.gameFinished && state.primaryStatus !== 'off' && (
              <BroadcastTicker
                holeNumber={state.holeNumber}
                currentPar={currentPar}
                activePlayer={players[state.turnIdx]}
                lastOutcome={state.lastOutcome}
              />
            )}
            {mode === 'game' && state.lastOutcome && state.primaryStatus === 'run' && (
              <ShotBanner outcome={state.lastOutcome} shotCount={state.shotCount} />
            )}
            <ActiveEffects
              activeCard={state.activeCard}
              activeWeather={state.activeWeather}
              cardPenalties={state.cardPenalties}
              players={players}
              turnIdx={state.turnIdx}
              stageIndex={state.stageIndex}
            />
            <BoardArea
              ref={boardRef}
              zoom={zoom}
              pan={pan}
              aspectRatio={isFullscreen ? undefined : board.aspectRatio}
              fullscreen={isFullscreen}
              onClick={handleClick}
              mapImageUrl={activeMapImageUrl}
              mapTransform={mapTransform}
            >
              <HoleMarker x={state.holePos.x} y={state.holePos.y} />
              {mode === 'game' && (
                <DistanceGuide
                  activePos={activePos}
                  holePos={state.holePos}
                  isClutch={isClutch}
                  clutchRadius={CLUTCH_THRESHOLD_YD * YD_TO_PCT}
                />
              )}
              <BallLayer balls={state.balls} ydToPct={YD_TO_PCT} />
              {appConfig.cards?.enabled && state.fieldCards.length > 0 && state.fieldCards.map((fc, idx) => (
                <FieldCardMarker
                  key={`fc-${idx}-${fc.cardId}`}
                  fc={fc}
                  ydToPct={YD_TO_PCT}
                  acquireRadiusYd={appConfig.cards.field.acquireRadiusYd}
                />
              ))}
              <HoledEffect x={state.holePos.x} y={state.holePos.y} visible={state.holedIn} />
              {players.map((player, i) => {
                const pDistYd = Math.round(distPct(state.playerPos[i], state.holePos) / YD_TO_PCT)
                return (
                  <PlayerSlot
                    key={player.id}
                    player={player}
                    pos={state.playerPos[i]}
                    isActive={mode === 'game' ? i === state.turnIdx : i === aIdx}
                    isHoled={mode === 'game' && state.holedSet.includes(i)}
                    distYd={pDistYd}
                    showDist={mode === 'game'}
                    transition={mode === 'game'}
                  />
                )
              })}
            </BoardArea>
          </>
        )}
      </div>

      {/* --- Floating overlays (game mode only) --- */}
      {isFullscreen && (
        <>
          {/* Bottom group: hole label + HUD panel */}
          <div className="floating-bottom-group">
            {/* Hole / Par label */}
            {!state.gameFinished && state.primaryStatus !== 'off' && (
              <div className="floating-hole-label">
                <span className="fhl-hole">H{state.holeNumber}<span className="fhl-dim">/18</span></span>
                <span className="fhl-sep" />
                <span className="fhl-par">Par {currentPar}</span>
              </div>
            )}

            {/* HUD: stats left + scores right */}
            <div className="floating-hud">
              {/* Left column: active player stats */}
              <div className="hud-stats-col">
                {(() => {
                  const p = players[state.turnIdx] || players[0]
                  const issue = SWING_ISSUES[p.issue]
                  return (
                    <>
                      <div className="hud-player-header">
                        <span className="hud-stats-dot" style={{ background: p.color }} />
                        <span className="hud-stats-name">{p.abbr}</span>
                      </div>
                      <div className="hud-stat-rows">
                        {['power','aim','touch'].map(key => (
                          <div key={key} className="hud-stat-row">
                            <span className="hud-stat-label">{key === 'power' ? 'PWR' : key === 'aim' ? 'AIM' : 'TCH'}</span>
                            <div className="hud-stat-bar">
                              <div className="hud-stat-fill" style={{ width: `${(p.stats[key] / 10) * 100}%`, background: p.color }} />
                            </div>
                            <span className="hud-stat-val">{p.stats[key]}</span>
                          </div>
                        ))}
                      </div>
                      {issue ? (
                        <div className="hud-issue">
                          <span className="hud-issue-label">{issue.label}</span>
                          <span className="hud-issue-effect">{issue.effect}</span>
                        </div>
                      ) : (
                        <div className="hud-issue hud-issue-clean">
                          <span className="hud-issue-label">Clean Swing</span>
                        </div>
                      )}
                    </>
                  )
                })()}
              </div>

              {/* Right column: scores + commentary */}
              <div className="hud-info-col">
                <Scorecard
                  players={players}
                  scorecard={state.scorecard}
                  holePars={PAR_LAYOUT}
                  holeNumber={state.holeNumber}
                  gameFinished={state.gameFinished}
                />
                {state.commentary?.length > 0 && (
                  <CommentaryFeed commentary={state.commentary} maxLines={4} />
                )}
                {state.gameFinished && <GameFinished />}
              </div>
            </div>
          </div>

          {/* Floating CardPicker */}
          {introPlayer !== null && !state.gameFinished && (
            <FireAnimation
              player={players[introPlayer]}
              onComplete={handleIntroComplete}
            />
          )}
          {appConfig.cards?.enabled && !state.gameFinished && state.cardPending && state.hand.length > 0 && state.turnIdx === 0 && introPlayer === null && (
            <div className="floating-card-picker">
              <CardPicker
                hand={state.hand}
                onUseCard={handleUseCard}
                onSkipCard={handleSkipCard}
                onExchange={handleExchangeCards}
                currentPlayerName={players[state.turnIdx].name}
              />
            </div>
          )}

          {/* Floating DeckPicker — removed, deck is now chosen pre-match */}
        </>
      )}

      {/* --- Inline elements (non-game modes) --- */}
      {mode === 'test' && !onShotResult && (
        <div className="stat-mapping">
          <div className="stat-mapping-title">Training Report → Stats</div>
          {STAT_MAPPING_DESC.map((line, i) => (
            <div key={i} className="stat-mapping-line">{line}</div>
          ))}
        </div>
      )}
      {!isFullscreen && mode !== 'illustrate' && mode !== 'test' && (
        <>
          <CommentaryFeed commentary={state.commentary} />
        </>
      )}
      {mode === 'illustrate' && (
        <div className="illustrate-legend">
          <div className="illustrate-legend-row">
            <span className="illustrate-legend-vary">Varying {illustrateConfig.varyStat} (1–9)</span>
            <span className="illustrate-legend-base">
              {['power','aim','touch'].filter(s => s !== illustrateConfig.varyStat)
                .map(s => `${s.slice(0,3)}=${illustrateConfig.baseStats[s]}`).join(' · ')}
            </span>
          </div>
          <div className="illustrate-legend-desc">{ILLUST_DESC[illustrateConfig.varyStat]}</div>
        </div>
      )}
    </div>
  )
}
