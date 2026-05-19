import { useReducer, useRef } from 'react'
import { PAR_LAYOUT, generateHoleForPar, generateHoleFromMap, generateFieldCardPositions, distPct, YD_TO_PCT } from '../utils/shotPhysics'
import { selectHoleOpenCommentary } from '../commentaryEngine'
import appConfig from '../appConfig'
import { dealCard, getCardDef, getPool } from '../cards'

// ─── Utility functions ────────────────────────────────────────

export function applyStatMod(base, mod, { min = 1, max = 10 } = {}) {
  return Math.max(min, Math.min(max, base + mod))
}

function resetHolePlayState(state, freshHand = []) {
  const n = state.playerIds.length
  return {
    strokes: 0,
    lastOutcome: null,
    holedSet: [],
    turnStrokes: Array(n).fill(0),
    turnIdx: 0,
    holedIn: false,
    secondaryStatus: 'card_picking',
    balls: [],
    hand: freshHand,
    activeCard: null,
    activeWeather: null,
    cardPending: freshHand.length > 0,
    cardPenalties: [],
    stageIndex: 0,
    swingsThisStage: 0,
    stageActivePlayerCount: n,
  }
}

export function computeEffectiveStats(state, playerIdx, players) {
  let pStats = { ...players[playerIdx].stats }
  const penalties = state.cardPenalties || []
  const cap = 10

  for (const pen of penalties) {
    if (pen.targetPlayerIdx === playerIdx && pen.remainingSwings > 0) {
      if (pen.stat === 'touch')  pStats.touch  = applyStatMod(pStats.touch,  pen.mod, { max: cap })
      else if (pen.stat === 'aim')   pStats.aim   = applyStatMod(pStats.aim,   pen.mod, { max: cap })
      else if (pen.stat === 'power') pStats.power = applyStatMod(pStats.power, pen.mod, { max: cap })
    }
  }

  const card = state.activeCard
  if (card?.effect?.copyOpponentStats) {
    const oppIdx = playerIdx === 0 ? 1 : 0
    if (players[oppIdx]) pStats = { ...players[oppIdx].stats }
  } else if (card?.effect?.randomizeAll) {
    const [lo, hi] = card.effect.randomRange
    pStats.power = lo + Math.floor(Math.random() * (hi - lo + 1))
    pStats.aim   = lo + Math.floor(Math.random() * (hi - lo + 1))
    pStats.touch = lo + Math.floor(Math.random() * (hi - lo + 1))
  } else if (card && card.system === 'player_stat') {
    const eff = card.effect
    const scap = eff.allowOverflow ? (eff.overflowCap || 15) : 10
    if (eff.powerMod)    pStats.power = applyStatMod(pStats.power, eff.powerMod, { max: scap })
    if (eff.aimMod)      pStats.aim   = applyStatMod(pStats.aim,   eff.aimMod,   { max: scap })
    if (eff.touchMod)    pStats.touch = applyStatMod(pStats.touch, eff.touchMod, { max: scap })
    if (eff.powerRandom) {
      const delta = Math.round((Math.random() * 2 - 1) * eff.powerRandom)
      pStats.power = applyStatMod(pStats.power, delta, { max: scap })
    }
    if (eff.powerOverride != null) pStats.power = eff.powerOverride
    if (eff.aimOverride != null)   pStats.aim   = eff.aimOverride
  }

  return pStats
}

function isCardsEnabled() {
  return appConfig.cards?.enabled ?? false
}

function currentPool() {
  return getPool(appConfig.cards?.deckType || 'base')
}

function spawnFieldCards(positions, holePos) {
  const cfg = appConfig.cards.field
  const count = cfg.minCount + Math.floor(Math.random() * (cfg.maxCount - cfg.minCount + 1))
  // Use average player position as start reference
  const avgX = positions.reduce((s, p) => s + p.x, 0) / positions.length
  const avgY = positions.reduce((s, p) => s + p.y, 0) / positions.length
  const startPos = { x: avgX, y: avgY }
  const coords = generateFieldCardPositions(startPos, holePos, count, cfg)
  return coords.map(c => ({
    x: c.x,
    y: c.y,
    cardId: dealCard(currentPool()),
    acquired: false,
  }))
}

function makeHole(holeIndex, playerCount) {
  const map = appConfig.map
  if (map?.imageUrl && map.points.length >= 2) {
    return generateHoleFromMap(holeIndex, map.points, playerCount)
  }
  const par = PAR_LAYOUT[holeIndex]
  return generateHoleForPar(par, playerCount)
}

function getActivePlayerCount(state) {
  return state.playerIds.length - state.holedSet.length
}

function createInitialState(players) {
  return {
    primaryStatus: 'off',
    secondaryStatus: null,
    savedSecondary: null,

    holeNumber: 1,
    holePos: { x: 50, y: 12 },
    playerPos: Array.from({ length: players.length }, () => ({ x: 50, y: 50 })),
    turnIdx: 0,
    turnStrokes: Array(players.length).fill(0),
    totalStrokes: 0,
    holedSet: [],

    strokes: 0,
    lastOutcome: null,
    shotCount: 0,

    balls: [],
    holedIn: false,

    scorecard: Object.fromEntries(players.map(p => [p.id, Array(18).fill(null)])),
    gameFinished: false,
    commentary: [],
    playerIds: players.map(p => p.id),
    hand: [],
    activeCard: null,
    activeWeather: null,
    cardPending: false,
    cardPenalties: [],
    fieldCards: [],
    stageIndex: 0,
    swingsThisStage: 0,
    stageActivePlayerCount: players.length,
  }
}

function gameReducer(state, action) {
  switch (action.type) {
    case 'START_GAME': {
      const { players } = action.payload
      const firstHole = makeHole(0, players.length)
      const hoCmt = selectHoleOpenCommentary(1, PAR_LAYOUT[0], [])
      return {
        ...state,
        primaryStatus: 'run',
        secondaryStatus: 'card_picking',
        savedSecondary: null,
        holeNumber: 1,
        holePos: firstHole.hole,
        playerPos: firstHole.positions,
        turnIdx: 0,
        turnStrokes: Array(players.length).fill(0),
        totalStrokes: 0,
        holedSet: [],
        strokes: 0,
        lastOutcome: null,
        shotCount: 0,
        balls: [],
        holedIn: false,
        scorecard: Object.fromEntries(players.map(p => [p.id, Array(18).fill(null)])),
        gameFinished: false,
        commentary: [{
          id: Date.now(),
          text: hoCmt.text,
          stroke: 0,
          playerName: '',
        }],
        playerIds: players.map(p => p.id),
        hand: [],
        activeCard: null,
        activeWeather: null,
        cardPending: false,
        cardPenalties: [],
        fieldCards: [],
        stageIndex: 0,
        swingsThisStage: 0,
        stageActivePlayerCount: players.length,
      }
    }

    case 'PAUSE_GAME':
      return {
        ...state,
        primaryStatus: 'pause',
        savedSecondary: state.secondaryStatus,
        secondaryStatus: null,
      }

    case 'RESUME_GAME':
      return {
        ...state,
        primaryStatus: 'run',
        secondaryStatus: state.savedSecondary || 'card_picking',
        savedSecondary: null,
      }

    case 'RESET_GAME':
      return {
        ...state,
        primaryStatus: 'off',
        savedSecondary: null,
        secondaryStatus: null,
        gameFinished: false,
        holedIn: false,
        strokes: 0,
        lastOutcome: null,
        shotCount: 0,
        balls: [],
        hand: [],
        activeCard: null,
        activeWeather: null,
        cardPending: false,
        cardPenalties: [],
        stageIndex: 0,
        swingsThisStage: 0,
        stageActivePlayerCount: state.playerIds.length,
      }

    case 'FIRE_SHOT': {
      const p = action.payload
      const newHoledSet = p.isHoled && !state.holedSet.includes(p.holedPlayerIdx)
        ? [...state.holedSet, p.holedPlayerIdx]
        : state.holedSet
      // animal_event and brainrot_meta cards keep activeCard until BALL_LANDED
      const cardSystem = state.activeCard?.system
      const clearCard = cardSystem !== 'animal_event' && cardSystem !== 'brainrot_meta'
      return {
        ...state,
        secondaryStatus: 'during_swing',
        balls: [...state.balls, p.ball],
        strokes: state.strokes + 1,
        lastOutcome: p.lastOutcome,
        shotCount: state.shotCount + 1,
        commentary: [...state.commentary.slice(-49), ...p.commentary],
        holedSet: newHoledSet,
        holedIn: p.isHoled,
        turnStrokes: p.updatedTurnStrokes || state.turnStrokes,
        totalStrokes: p.updatedTotalStrokes != null ? p.updatedTotalStrokes : state.totalStrokes,
        activeCard: clearCard ? null : state.activeCard,
        activeWeather: state.activeWeather,
      }
    }

    case 'TICK_ANIMATION': {
      const { balls: updatedBalls, removed = [] } = action.payload
      const removedSet = new Set(removed)
      const updatedMap = new Map(updatedBalls.map(b => [b.id, b]))
      const newBalls = state.balls
        .filter(b => !removedSet.has(b.id))
        .map(b => updatedMap.get(b.id) || b)
      const stateIds = new Set(state.balls.map(b => b.id))
      for (const b of updatedBalls) {
        if (!stateIds.has(b.id)) newBalls.push(b)
      }
      return { ...state, balls: newBalls }
    }

    case 'BALL_LANDED': {
      const { playerIdx, endX, endY, isHoled, animalUpdates, swapPositions } = action.payload
      const newPlayerPos = state.playerPos.map((p, i) =>
        i === playerIdx ? { x: endX, y: endY } : p
      )

      // Apply animal event position updates (displace opponents)
      let finalPlayerPos = newPlayerPos
      if (animalUpdates?.length) {
        finalPlayerPos = newPlayerPos.map((p, i) => {
          const upd = animalUpdates.find(u => u.idx === i)
          return upd ? { x: upd.x, y: upd.y } : p
        })
      }

      // Brainrot: swapPositions (Ball Swap) — swap self with opponent
      if (swapPositions && state.playerIds.length >= 2) {
        const oppIdx = playerIdx === 0 ? 1 : 0
        const selfPos = { ...finalPlayerPos[playerIdx] }
        const oppPos = { ...finalPlayerPos[oppIdx] }
        finalPlayerPos = [...finalPlayerPos]
        finalPlayerPos[playerIdx] = oppPos
        finalPlayerPos[oppIdx] = selfPos
      }

      // Field card acquisition: check if ball landed near any unacquired card
      // NPC balls "consume" the card (remove from field) but don't add to hand.
      // Only the human player (playerIdx 0) picks cards into hand.
      let acquiredHand = state.hand
      let acquiredFieldCards = state.fieldCards
      if (isCardsEnabled() && state.fieldCards.length > 0) {
        const cfg = appConfig.cards.field
        const radiusPct = cfg.acquireRadiusYd * YD_TO_PCT
        const landPos = { x: endX, y: endY }
        const newCards = []
        const updatedField = state.fieldCards.map(fc => {
          if (fc.acquired) return fc
          const d = distPct(landPos, fc)
          if (d <= radiusPct) {
            if (playerIdx === 0) newCards.push(fc.cardId)
            return { ...fc, acquired: true }
          }
          return fc
        })
        if (updatedField !== state.fieldCards) {
          acquiredFieldCards = updatedField
          if (newCards.length > 0) acquiredHand = [...state.hand, ...newCards]
        }
      }

      // Brainrot: resetHole (Nuclear Option) — reset entire hole
      if (state.activeCard?.effect?.resetHole) {
        const nextHoleNum = state.holeNumber
        const nextPar = PAR_LAYOUT[nextHoleNum - 1]
        const newHole = makeHole(nextHoleNum - 1, state.playerIds.length)
        const resetFieldCards = isCardsEnabled()
          ? spawnFieldCards(newHole.positions, newHole.hole)
          : []
        return {
          ...state,
          holePos: newHole.hole,
          playerPos: newHole.positions,
          totalStrokes: state.totalStrokes,
          ...resetHolePlayState(state, []),
          fieldCards: resetFieldCards,
          commentary: [...state.commentary.slice(-49), {
            id: Date.now(),
            text: 'Nuclear Option! Hole reset. Back to square one.',
            stroke: 0,
            playerName: '',
          }],
        }
      }

      // Compute next turn index, skipping players already holed out
      const holed = state.holedSet
      const n = state.playerIds.length
      let nextTi = (playerIdx + 1) % n
      for (let i = 0; i < n && holed.includes(nextTi); i++) {
        nextTi = (nextTi + 1) % n
      }
      const newSwingsThisStage = state.swingsThisStage + 1
      if (isHoled) {
        return {
          ...state,
          playerPos: finalPlayerPos,
          turnIdx: nextTi,
          secondaryStatus: 'camera_followup',
          activeCard: null,
          activeWeather: state.activeWeather,
          swingsThisStage: newSwingsThisStage,
          hand: acquiredHand,
          fieldCards: acquiredFieldCards,
        }
      }
      const newTurnStrokes = [...state.turnStrokes]
      newTurnStrokes[playerIdx] += 1
      return {
        ...state,
        playerPos: finalPlayerPos,
        turnStrokes: newTurnStrokes,
        totalStrokes: state.totalStrokes + 1,
        turnIdx: nextTi,
        secondaryStatus: 'camera_followup',
        activeCard: null,
        activeWeather: state.activeWeather,
        swingsThisStage: newSwingsThisStage,
        hand: acquiredHand,
        fieldCards: acquiredFieldCards,
      }
    }

    case 'CAMERA_SETTLED': {
      // Stage-based lifecycle: stage completes when all active players have swung
      const stageJustCompleted = state.swingsThisStage >= state.stageActivePlayerCount

      // Cards come from field card acquisition, not auto-dealing.
      // Show card picker if hand has cards.
      const pending = isCardsEnabled() ? state.hand.length > 0 : false

      const newStageIndex = stageJustCompleted ? state.stageIndex + 1 : state.stageIndex
      const newSwingsThisStage = stageJustCompleted ? 0 : state.swingsThisStage
      const newStageActiveCount = stageJustCompleted
        ? getActivePlayerCount(state)
        : state.stageActivePlayerCount

      // Weather persists for the entire stage — clear only when stage completes
      const newWeather = stageJustCompleted ? null : state.activeWeather

      // Card penalties decrement per-stage (not per-turn)
      const updatedPenalties = stageJustCompleted
        ? state.cardPenalties
            .map(p => ({ ...p, remainingSwings: p.remainingSwings - 1 }))
            .filter(p => p.remainingSwings > 0)
        : state.cardPenalties

      return {
        ...state,
        secondaryStatus: 'card_picking',
        hand: state.hand,
        cardPending: pending,
        activeCard: null,
        activeWeather: newWeather,
        stageIndex: newStageIndex,
        swingsThisStage: newSwingsThisStage,
        stageActivePlayerCount: newStageActiveCount,
        cardPenalties: updatedPenalties,
      }
    }

    case 'SPAWN_FIELD_CARDS': {
      if (!isCardsEnabled()) return state
      const newFieldCards = spawnFieldCards(state.playerPos, state.holePos)
      return {
        ...state,
        fieldCards: newFieldCards,
      }
    }

    case 'SWITCH_TURN':
      return {
        ...state,
        turnIdx: action.payload.nextTurnIdx,
        secondaryStatus: 'card_picking',
      }

    case 'TRANSITION_HOLE': {
      const { nextHoleNum, hole, positions, commentary } = action.payload
      const hn = state.holeNumber
      const ts = state.turnStrokes
      const newScorecard = { ...state.scorecard }
      state.playerIds.forEach((pid, i) => {
        newScorecard[pid] = [...newScorecard[pid]]
        newScorecard[pid][hn - 1] = ts[i]
      })
      // Generate field cards for the new hole
      const newFieldCards = isCardsEnabled()
        ? spawnFieldCards(positions, hole)
        : []
      return {
        ...state,
        holeNumber: nextHoleNum,
        holePos: hole,
        playerPos: positions,
        totalStrokes: state.totalStrokes,
        commentary: commentary
          ? [...state.commentary.slice(-49), commentary]
          : state.commentary,
        scorecard: newScorecard,
        ...resetHolePlayState(state, []),
        fieldCards: newFieldCards,
      }
    }

    case 'FINISH_GAME': {
      const hn = state.holeNumber
      const ts = state.turnStrokes
      const newScorecard = { ...state.scorecard }
      state.playerIds.forEach((pid, i) => {
        newScorecard[pid] = [...newScorecard[pid]]
        newScorecard[pid][hn - 1] = ts[i]
      })
      const parTotal = PAR_LAYOUT.reduce((a, b) => a + b, 0)
      const summary = state.playerIds.map((pid, i) => {
        const scores = newScorecard[pid]
        const total = scores.reduce((s, v) => s + (v ?? 0), 0)
        const vsPar = total - parTotal
        return { id: pid, total, vsPar, scores }
      })
      return {
        ...state,
        ...resetHolePlayState(state, []),
        primaryStatus: 'off',
        secondaryStatus: null,
        gameFinished: true,
        scorecard: newScorecard,
      }
    }

    case 'RESUME_AFTER_HOLE': {
      return {
        ...state,
        holedIn: false,
        secondaryStatus: 'card_picking',
        activeCard: null,
        activeWeather: null,
      }
    }

    case 'DEAL_CARD': {
      if (!isCardsEnabled()) return state
      if (state.hand.length >= 4) return state
      return state
    }

    case 'USE_CARD': {
      const { cardId } = action.payload
      const cardDef = getCardDef(cardId)
      if (!cardDef) return state
      const newHand = state.hand.filter(id => id !== cardId)
      let newWeather = state.activeWeather
      let newPenalties = state.cardPenalties
      if (cardDef.system === 'weather') {
        newWeather = cardDef
      }
      // Animal cards with stat mods: apply to ALL opponents
      if (cardDef.system === 'animal_event') {
        const selfIdx = state.turnIdx
        const oppPenalties = []
        if (cardDef.effect.touchMod) {
          for (const i of state.playerIds.map((_, i) => i).filter(i => i !== selfIdx)) {
            oppPenalties.push({ stat: 'touch', mod: cardDef.effect.touchMod, remainingSwings: 1, targetPlayerIdx: i })
          }
        }
        if (cardDef.effect.aimMod) {
          for (const i of state.playerIds.map((_, i) => i).filter(i => i !== selfIdx)) {
            oppPenalties.push({ stat: 'aim', mod: cardDef.effect.aimMod, remainingSwings: 1, targetPlayerIdx: i })
          }
        }
        if (oppPenalties.length) newPenalties = [...state.cardPenalties, ...oppPenalties]
      }
      return {
        ...state,
        hand: newHand,
        activeCard: cardDef,
        cardPending: false,
        activeWeather: newWeather,
        cardPenalties: newPenalties,
      }
    }

    case 'SKIP_CARD':
      return {
        ...state,
        activeCard: null,
        cardPending: false,
      }

    case 'EXCHANGE_CARDS': {
      if (!isCardsEnabled()) return state
      const { cardIds } = action.payload
      if (!cardIds || cardIds.length !== 2) return state
      const remaining = state.hand.filter(id => !cardIds.includes(id))
      const newCard = dealCard(currentPool())
      if (!newCard) return state
      return {
        ...state,
        hand: [...remaining, newCard],
        cardPending: true,
      }
    }

    case 'SELECT_DECK': {
      const { deckType } = action.payload
      if (state.primaryStatus !== 'off') return state
      appConfig.cards.deckType = deckType
      return { ...state, hand: [], activeCard: null, activeWeather: null, cardPending: false, cardPenalties: [] }
    }

    default:
      return state
  }
}

export function useGameReducer(players) {
  const [state, dispatch] = useReducer(gameReducer, players, createInitialState)
  const gameRef = useRef(state)
  gameRef.current = state
  return [state, dispatch, gameRef]
}
