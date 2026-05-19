const CARD_DEFS = {
  red_bull: {
    id: 'red_bull',
    name: 'Red Bull',
    system: 'player_stat',
    target: 'self',
    description: 'Power +2, Nerve -1',
    flavorText: '给你翅膀',
    effect: { powerMod: 2, nerveMod: -1 },
  },
  drunk_swing: {
    id: 'drunk_swing',
    name: 'Drunk Swing',
    system: 'player_stat',
    target: 'self',
    description: 'Power random +/-3',
    flavorText: '闭眼，挥',
    effect: { powerRandom: 3 },
  },
  zen_mode: {
    id: 'zen_mode',
    name: 'Zen Mode',
    system: 'player_stat',
    target: 'self',
    description: 'Nerve +2, Power -1',
    flavorText: '稳住，别浪',
    effect: { nerveMod: 2, powerMod: -1 },
  },
  hot_head: {
    id: 'hot_head',
    name: 'Hot Head',
    system: 'player_stat',
    target: 'self',
    description: 'Power +1, Aim +1, Curse +30%',
    flavorText: '越怒越猛',
    effect: { powerMod: 1, aimMod: 1, curseTriggerBonus: 30 },
  },
}

export const STAT_CARD_POOL = Object.keys(CARD_DEFS)

// ─── Brainrot Deck (10 cards) ───

const BRAINROT_DEFS = {
  // ─── Drinks (3) ───
  br_red_bull_ultra: {
    id: 'br_red_bull_ultra',
    name: 'Red Bull Ultra™',
    system: 'player_stat',
    deck: 'brainrot',
    target: 'self',
    description: 'Power +5 (can exceed 10, max 15)',
    flavorText: 'Gives you wings. Direction not included.',
    effect: { powerMod: 5, allowOverflow: true, overflowCap: 15 },
  },
  br_mystery_flask: {
    id: 'br_mystery_flask',
    name: 'Mystery Flask',
    system: 'player_stat',
    deck: 'brainrot',
    target: 'self',
    description: 'Power/Aim/Touch each random 1-15',
    flavorText: 'Mystery potion. Bottoms up.',
    effect: { randomizeAll: true, randomRange: [1, 15] },
  },
  br_scope_creep: {
    id: 'br_scope_creep',
    name: 'Scope Creep',
    system: 'player_stat',
    deck: 'brainrot',
    target: 'self',
    description: 'Aim = 15 (perfect), Power = 1 (30yd)',
    flavorText: 'We want everything. We get 30 yards.',
    effect: { aimOverride: 15, powerOverride: 1 },
  },

  // ─── Creatures (2) ───
  br_dragon: {
    id: 'br_dragon',
    name: "Dragon's Hoard",
    system: 'animal_event',
    deck: 'brainrot',
    target: 'opponent',
    description: "Opponent ball stolen 30-60yd",
    flavorText: "The dragon has opinions about your ball.",
    effect: { displacementRange: [30, 60], displacementAxis: 'both' },
  },
  br_void_fish: {
    id: 'br_void_fish',
    name: 'Void Fish',
    system: 'animal_event',
    deck: 'brainrot',
    target: 'opponent',
    description: 'Opponent ball teleported 3-15yd from hole',
    flavorText: 'The void fish is beyond reason.',
    effect: { teleportNearHole: true, teleportRange: [3, 15] },
  },

  // ─── Weather (2) ───
  br_gravity: {
    id: 'br_gravity',
    name: 'Gravity Anomaly',
    system: 'weather',
    deck: 'brainrot',
    target: 'all',
    description: 'Distance x1.8',
    flavorText: 'Gravity is now optional.',
    effect: { pushMultiplier: 1.8 },
  },
  br_wildfire: {
    id: 'br_wildfire',
    name: 'Wildfire',
    system: 'weather',
    deck: 'brainrot',
    target: 'all',
    description: 'All balls random offset 15-30yd',
    flavorText: 'The course is on fire.',
    effect: { offsetXRange: [-30, 30] },
  },

  // ─── Pure Brainrot (3) ───
  br_ball_swap: {
    id: 'br_ball_swap',
    name: 'Ball Swap',
    system: 'animal_event',
    deck: 'brainrot',
    target: 'both',
    description: 'Swap your ball position with opponent',
    flavorText: 'Yours is mine.',
    effect: { swapPositions: true },
  },
  br_identity_theft: {
    id: 'br_identity_theft',
    name: 'Identity Theft',
    system: 'player_stat',
    deck: 'brainrot',
    target: 'self',
    description: 'Use opponent Power/Aim/Touch this shot',
    flavorText: "I am you. You are me. Let's golf.",
    effect: { copyOpponentStats: true },
  },
  br_nuclear_option: {
    id: 'br_nuclear_option',
    name: 'Nuclear Option',
    system: 'brainrot_meta',
    deck: 'brainrot',
    target: 'all',
    description: 'Reset hole: all balls to tee, strokes to 0',
    flavorText: 'Back to square one.',
    effect: { resetHole: true },
  },
}

export const BRAINROT_CARD_POOL = Object.keys(BRAINROT_DEFS)

export function getPool(deckType) {
  return deckType === 'brainrot' ? BRAINROT_CARD_POOL : STAT_CARD_POOL
}

export function dealCard(pool) {
  return pool[Math.floor(Math.random() * pool.length)]
}

export function getCardDef(id) {
  return CARD_DEFS[id] || BRAINROT_DEFS[id] || null
}

export default CARD_DEFS
