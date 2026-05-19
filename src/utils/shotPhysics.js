import appConfig from '../appConfig.js'

const G = appConfig.game

export const YD_TO_PCT = G.ydToPct
export const CLUTCH_THRESHOLD_YD = G.clutchThresholdYd
export const POWER_TO_RANGE = G.powerToRange
export const AIM_TO_OFFSET_RATE = G.aimToOffsetRate
export const PAR_LAYOUT = G.parLayout
export const { distBounds, burstRate, clutchBaseChance, clutchMissDistance, outcomeThresholds, holeDistance, timing, rangeBandInfluence, offsetPenaltyRate } = G

export const FLIGHT_DURATION = timing.flightDuration
export const FADE_DURATION = timing.fadeDuration
export const SHOT_DELAY = timing.shotDelay
export const LAND_DELAY = timing.landDelay

export function distPct(a, b) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2)
}

export function getRangeBand(distYd) {
  if (distYd > 180) return rangeBandInfluence.long
  if (distYd > 80) return rangeBandInfluence.mid
  if (distYd > 20) return rangeBandInfluence.short
  return rangeBandInfluence.clutch
}

export function generateHoleForPar(par, count) {
  const range = holeDistance[par]
  const targetDistYd = range.min + Math.random() * (range.max - range.min)
  const holeX = 30 + Math.random() * 40
  const holeY = 18 + Math.random() * 8
  const playerY = Math.min(94, holeY + targetDistYd * YD_TO_PCT)
  const positions = Array.from({ length: count }, (_, i) => ({
    x: holeX + (i - (count - 1) / 2) * (4 + Math.random() * 4) + (Math.random() - 0.5) * 3,
    y: playerY + (Math.random() - 0.5) * 4,
  }))
  return { hole: { x: holeX, y: holeY }, positions, distYd: targetDistYd }
}

export function generateHoleFromMap(holeIndex, mapPoints, playerCount) {
  const N = mapPoints.length
  const startPt = mapPoints[holeIndex % N]
  const endPt = mapPoints[(holeIndex + 1) % N]

  const du = endPt.uv.u - startPt.uv.u
  const dv = endPt.uv.v - startPt.uv.v
  const imgW = appConfig.map.imageWidth
  const imgH = appConfig.map.imageHeight
  const imgAspect = imgH / imgW

  // Effective UV distance in board-pct space (accounting for image aspect ratio)
  const uvBoardDist = Math.sqrt(du * du + dv * dv * imgAspect * imgAspect)
  if (uvBoardDist < 0.001) {
    return generateHoleForPar(PAR_LAYOUT[holeIndex], playerCount)
  }

  // Par distance → board percentage
  const par = PAR_LAYOUT[holeIndex]
  const range = holeDistance[par]
  const distYd = range.min + Math.random() * (range.max - range.min)
  const distPct = distYd * YD_TO_PCT

  // Scale: how many board-pct-units one UV u-unit corresponds to
  const scale = distPct / uvBoardDist

  // Map UV → board coordinates (anisotropic: v scaled by imgAspect)
  const uvToBoard = (uv) => ({
    x: uv.u * scale,
    y: uv.v * scale * imgAspect,
  })

  // Place tee and hole at UV-mapped board positions, centered on (50, 50)
  const startBoard = uvToBoard(startPt.uv)
  const endBoard = uvToBoard(endPt.uv)
  const midBoard = { x: (startBoard.x + endBoard.x) / 2, y: (startBoard.y + endBoard.y) / 2 }
  const offsetX = 50 - midBoard.x
  const offsetY = 50 - midBoard.y

  const hole = { x: endBoard.x + offsetX, y: endBoard.y + offsetY }
  const tee = { x: startBoard.x + offsetX, y: startBoard.y + offsetY }

  const positions = Array.from({ length: playerCount }, (_, i) => ({
    x: tee.x + (i - (playerCount - 1) / 2) * 3 + (Math.random() - 0.5) * 4,
    y: tee.y + (Math.random() - 0.5) * 6,
  }))

  // Store map image transform
  appConfig.map.transform = { scale, imgAspect, offsetX, offsetY }

  return { hole, positions, distYd }
}

export function sampleAroundIdeal(ideal, min, max, stability) {
  const t = stability / 10
  const rolls = Math.round(1 + t * 5)
  let sum = 0
  for (let i = 0; i < rolls; i++) sum += Math.random()
  const normalized = sum / rolls
  let value = min + normalized * (max - min)
  value = value * (1 - t * 0.45) + ideal * (t * 0.45)
  return value
}

function computeDistance(touch, maxPushYd, idealOverride) {
  const idealDistYd = idealOverride != null ? idealOverride : maxPushYd
  const ideal = Math.min(idealDistYd, maxPushYd)
  const minRate = 0.3 + touch * 0.06
  const minDistYd = ideal * minRate
  const softCapYd = Math.min(ideal * distBounds.softCap, maxPushYd * distBounds.maxPushSoftCap)
  const actualDistYd = sampleAroundIdeal(ideal, minDistYd, softCapYd, touch)
  const br = touch >= 8 ? burstRate.high : touch >= 5 ? burstRate.mid : burstRate.low
  const hardCapYd = maxPushYd * br
  return Math.min(actualDistYd, hardCapYd)
}

function computeOffset(clampedDistYd, aim, bandScale = 1) {
  const maxOffsetYd = clampedDistYd * AIM_TO_OFFSET_RATE[aim] * (0.5 + bandScale * 0.5)
  let offsetYd = sampleAroundIdeal(0, -maxOffsetYd, maxOffsetYd, aim)
  if (aim >= 7) offsetYd *= (1 - (aim - 6) * 0.1)
  return offsetYd
}

export function labelShot(remainingYd, originalDistYd, offsetYd) {
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

export function rollBreakthrough(controlScore, distYd, canReach) {
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

export const SWING_ISSUES = {
  none:          { label: 'None',          desc: 'No swing issue', effect: 'No modifier' },
  earlyExt:      { label: 'Early Extension',    desc: 'Hips fire early, direction lost',     effect: 'Aim −2, large lateral', aimMod: -2, offsetMult: 1.5 },
  casting:       { label: 'Casting',             desc: 'Casting the club, losing lag',        effect: 'Distance −25%',          distMult: 0.75 },
  overTheTop:    { label: 'Over the Top',        desc: 'Out-to-in path, right bias',          effect: 'Right-biased offset',    offsetBias: 'right' },
  poorFace:      { label: 'Poor Face Control',   desc: 'Clubface inconsistent at impact',     effect: 'Aim −2, random dir',     aimMod: -2, randomDir: true },
  sway:          { label: 'Sway',                desc: 'Lateral sway ruins balance',           effect: 'Distance ±10–25%',       distRandom: true },
  slide:         { label: 'Slide',               desc: 'Lower body slides past, small loss',   effect: 'Distance −10%',          distMult: 0.90 },
  reverseSpine:  { label: 'Reverse Spine Angle', desc: 'Spine tilts toward target',           effect: 'Double outcome penalty',  outcomeDrop: 2 },
  lossOfPosture: { label: 'Loss of Posture',     desc: 'Stand up through impact',             effect: 'Outcome downgrade',       outcomeDrop: 1 },
  hangingBack:   { label: 'Hanging Back',        desc: 'Weight stuck on back foot',           effect: 'Max Push −20%',          maxPushMult: 0.80 },
  poorTempo:     { label: 'Poor Tempo',          desc: 'Occasional total rhythm breakdown',    effect: 'Random small penalty',   randomPenalty: true },
}

export function applySwingIssue(stats, issueName) {
  if (!issueName || issueName === 'none') return { ...stats, issue: null }
  const issue = SWING_ISSUES[issueName]
  if (!issue) return { ...stats, issue: null }

  const s = { ...stats }
  if (issue.aimMod) s.aim = Math.max(1, Math.min(10, s.aim + issue.aimMod))
  return { ...s, issue }
}

export function calculateTestLanding(sx, sy, tx, ty, stats, issueName) {
  let { power, aim, touch } = stats
  const issue = (!issueName || issueName === 'none') ? null : (SWING_ISSUES[issueName] || null)

  // Apply stat modifiers from issue
  if (issue?.aimMod) aim = Math.max(1, Math.min(10, aim + issue.aimMod))

  const dx = tx - sx, dy = ty - sy
  const clickDist = Math.sqrt(dx * dx + dy * dy)
  if (clickDist < 1) return null

  let maxPushYd = POWER_TO_RANGE[power]
  if (issue?.maxPushMult) maxPushYd = maxPushYd * issue.maxPushMult

  const clickDistYd = clickDist / YD_TO_PCT
  let idealDistYd = Math.min(clickDistYd, maxPushYd)
  const minDistYd = idealDistYd * distBounds.min
  const softCapYd = Math.min(idealDistYd * distBounds.softCap, maxPushYd * distBounds.maxPushSoftCap)
  let actualDistYd = sampleAroundIdeal(idealDistYd, minDistYd, softCapYd, touch)

  const br = touch >= 8 ? burstRate.high : touch >= 5 ? burstRate.mid : burstRate.low
  const hardCapYd = maxPushYd * br
  let clampedDistYd = Math.min(actualDistYd, hardCapYd)

  // Issue: distance modifiers
  if (issue?.distMult) clampedDistYd *= issue.distMult
  if (issue?.distRandom) {
    const roll = Math.random()
    if (roll < 0.25) clampedDistYd *= 0.75
    else if (roll < 0.50) clampedDistYd *= 0.90
    else if (roll < 0.75) clampedDistYd *= 1.10
    else clampedDistYd *= 1.25
  }

  // Issue: random small penalty (Poor Tempo)
  if (issue?.randomPenalty) {
    const roll = Math.random()
    if (roll < 0.30) clampedDistYd *= 0.80
    else if (roll < 0.50) aim = Math.max(1, aim - 2)
    else if (roll < 0.65) touch = Math.max(1, touch - 2)
  }

  let maxOffsetYd = clampedDistYd * AIM_TO_OFFSET_RATE[aim]
  if (issue?.offsetMult) maxOffsetYd *= issue.offsetMult

  let offsetYd = sampleAroundIdeal(0, -maxOffsetYd, maxOffsetYd, aim)

  // Issue: right-biased offset (Over the Top)
  if (issue?.offsetBias === 'right') {
    offsetYd = Math.abs(offsetYd) * (0.6 + Math.random() * 0.4)
  }

  // Issue: random direction (Poor Face Control)
  if (issue?.randomDir && Math.random() < 0.35) {
    offsetYd = -offsetYd
  }

  const clampedDistPct = clampedDistYd * YD_TO_PCT
  const offsetPct = offsetYd * YD_TO_PCT

  let dirX = dx / clickDist, dirY = dy / clickDist
  // Issue: random direction flip
  if (issue?.randomDir && Math.random() < 0.20) {
    dirX = -dirX
    dirY = -dirY
  }
  const perpX = -dirY, perpY = dirX

  return {
    endX: sx + dirX * clampedDistPct + perpX * offsetPct,
    endY: sy + dirY * clampedDistPct + perpY * offsetPct,
  }
}

export function calculateGameLanding(pp, hole, mx, my, stats) {
  const { power, aim, touch } = stats
  const distP = distPct(pp, hole)
  const distYd = distP / YD_TO_PCT

  if (distYd <= CLUTCH_THRESHOLD_YD) {
    const tier = clutchBaseChance.find(t => distYd <= t.maxDist)
    let baseChance = tier ? tier.chance : 0.28
    const touchBonus = 0.7 + 0.3 * Math.pow(touch / 10, 0.6)
    const finalChance = Math.min(0.95, Math.max(0.05, baseChance * touchBonus))

    if (Math.random() < finalChance) {
      return { endX: hole.x, endY: hole.y, outcome: 'holed', remainingYd: 0, isClutch: true }
    }

    const missTier = clutchMissDistance.find(t => distYd <= t.maxDist) || clutchMissDistance[clutchMissDistance.length - 1]
    let newDistYd = missTier.min + Math.random() * missTier.range
    if (touch >= 7) newDistYd *= 0.7
    else if (touch <= 3) newDistYd *= 1.3

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

  const controlScore = aim * 0.6 + touch * 0.4
  const maxPushYd = POWER_TO_RANGE[power]
  const canReach = distYd <= maxPushYd
  let effectiveTouch = touch

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
  if (bt === 'clean') effectiveTouch = Math.min(10, touch + 2)

  // Power reserve bonus: extra power → easier distance control on short holes
  if (distYd > 0) {
    const powerReserve = (maxPushYd - distYd) / maxPushYd
    if (powerReserve > 0.3) {
      effectiveTouch = Math.min(10, effectiveTouch + Math.floor(powerReserve * 3))
    }
  }

  const idealDistYd = Math.min(distYd, maxPushYd)
  const clampedDistYd = computeDistance(effectiveTouch, maxPushYd, idealDistYd)

  const band = getRangeBand(distYd)

  // Aim offset scaled by range-band: Aim matters more at mid-range
  const offsetYd = computeOffset(clampedDistYd, aim, band.aim)

  const dx = hole.x - pp.x, dy = hole.y - pp.y
  const d = Math.sqrt(dx * dx + dy * dy)
  if (d < 1) return { endX: hole.x, endY: hole.y, outcome: 'great', remainingYd: 0, isClutch: false }
  const dirX = dx / d, dirY = dy / d
  const perpX = -dirY, perpY = dirX
  const distancePct = clampedDistYd * YD_TO_PCT
  const offsetPct = offsetYd * YD_TO_PCT

  const endX = pp.x + dirX * distancePct + perpX * offsetPct
  const endY = pp.y + dirY * distancePct + perpY * offsetPct

  // Overshoot: low Touch + excess power → ball flies past
  let finalEndX = endX, finalEndY = endY
  if (touch < 7 && clampedDistYd > distYd * 0.9 && distYd < maxPushYd * 0.5) {
    const excessRatio = (maxPushYd - distYd) / maxPushYd
    const overshootChance = excessRatio * (1 - touch * 0.08)
    if (Math.random() < overshootChance) {
      const overshootYd = distYd * (0.1 + Math.random() * 0.25)
      const overshootPct = overshootYd * YD_TO_PCT
      finalEndX = endX - dirX * overshootPct
      finalEndY = endY - dirY * overshootPct
    }
  }

  const landingDistYd = distPct({ x: finalEndX, y: finalEndY }, hole) / YD_TO_PCT

  // Aim offset penalty: lateral miss pulls ball backward (away from hole)
  // At long range, pure lateral offset barely changes 2D distance.
  // This ensures Aim matters at ALL distances, not just close range.
  let adjustedEndX = finalEndX, adjustedEndY = finalEndY
  if (landingDistYd > 1) {
    const absOffset = Math.abs(offsetYd)
    const penaltyYd = absOffset * offsetPenaltyRate * band.aim
    if (penaltyYd > 0) {
      const penaltyPct = penaltyYd * YD_TO_PCT
      adjustedEndX = finalEndX - dirX * penaltyPct
      adjustedEndY = finalEndY - dirY * penaltyPct
    }
  }

  const adjustedDistYd = distPct({ x: adjustedEndX, y: adjustedEndY }, hole) / YD_TO_PCT
  if (adjustedDistYd <= 1) {
    return { endX: hole.x, endY: hole.y, outcome: 'holed', remainingYd: 0, isClutch: false }
  }

  const remainingYd = adjustedDistYd
  const outcome = labelShot(remainingYd, distYd, offsetYd)

  return { endX: adjustedEndX, endY: adjustedEndY, outcome, remainingYd, isClutch: false }
}
