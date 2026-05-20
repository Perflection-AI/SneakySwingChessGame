import commentaryTemplates from './commentaryTemplates'

const DEDUP_WINDOW = 8

function fillTemplate(text, ctx) {
  return text
    .replace(/\{playerName\}/g, ctx.playerName || '')
    .replace(/\{progressYd\}/g, ctx.progressYd ?? '')
    .replace(/\{distanceAfter\}/g, ctx.distanceAfter ?? '')
    .replace(/\{stroke\}/g, ctx.stroke ?? '')
    .replace(/\{hole\}/g, ctx.hole ?? '')
    .replace(/\{par\}/g, ctx.par ?? '')
    .replace(/\{cardName\}/g, ctx.cardName || '')
    .replace(/\{cardFlavor\}/g, ctx.cardFlavor || '')
    .replace(/\{targetName\}/g, ctx.targetName || 'opponent')
    .replace(/\{power\}/g, ctx.power ?? '')
    .replace(/\{aim\}/g, ctx.aim ?? '')
    .replace(/\{touch\}/g, ctx.touch ?? '')
}

function matchConditions(conditions, ctx) {
  if (!conditions) return true
  if (conditions.cardId && conditions.cardId !== ctx.cardUsed) return false
  if (conditions.minProgressYd != null && (ctx.progressYd ?? 0) < conditions.minProgressYd) return false
  if (conditions.maxDistanceAfter != null && (ctx.distanceAfter ?? 0) > conditions.maxDistanceAfter) return false
  if (conditions.minDistanceAfter != null && (ctx.distanceAfter ?? 0) < conditions.minDistanceAfter) return false
  return true
}

function weightedRandom(pool) {
  const totalWeight = pool.reduce((s, t) => s + (t.weight || 1), 0)
  let r = Math.random() * totalWeight
  for (const t of pool) {
    r -= (t.weight || 1)
    if (r <= 0) return t
  }
  return pool[pool.length - 1]
}

function getPoolKey(ctx) {
  // Priority: cardUsed > miracle > holed > pinseeker > clutchEnter > clutchMiss > outcome
  if (ctx.cardUsed) return ctx.cardUsed.startsWith('br_') ? 'brainrot_cardUse' : 'cardUse'
  if (ctx.outcome === 'miracle') return 'miracle'
  if (ctx.outcome === 'holed') return 'holed'
  if (ctx.outcome === 'pinseeker') return 'pinseeker'
  if (ctx.enteredClutch) return 'clutchEnter'
  if (ctx.outcome === 'missed' && ctx.isClutch) return 'clutchMiss'
  // Standard outcomes
  if (['great', 'good', 'okay', 'bad'].includes(ctx.outcome)) return ctx.outcome
  return 'good' // fallback
}

export function selectCommentary(ctx, recentIds = []) {
  const key = getPoolKey(ctx)
  const pool = commentaryTemplates[key] || commentaryTemplates.good

  const candidates = pool.filter(t =>
    !recentIds.slice(-DEDUP_WINDOW).includes(t.id) && matchConditions(t.conditions, ctx)
  )

  const finalPool = candidates.length > 0 ? candidates : pool
  const picked = weightedRandom(finalPool)

  return {
    templateId: picked.id,
    text: fillTemplate(picked.text, ctx),
    poolKey: key,
  }
}

export function buildHoleOpenContext(hole, par) {
  return { hole, par, outcome: 'holeOpen' }
}

export function selectHoleOpenCommentary(hole, par, recentIds = []) {
  const pool = commentaryTemplates.holeOpen
  const candidates = pool.filter(t => !recentIds.slice(-DEDUP_WINDOW).includes(t.id))
  const finalPool = candidates.length > 0 ? candidates : pool
  const picked = weightedRandom(finalPool)
  return {
    templateId: picked.id,
    text: fillTemplate(picked.text, { hole, par }),
    poolKey: 'holeOpen',
  }
}
