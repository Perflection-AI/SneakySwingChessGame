const appConfig = {
  debug: false,

  board: {
    aspectRatio: 1,
  },

  cards: {
    enabled: false,
    deckType: 'base',
    field: {
      minCount: 4,              // min cards spawned per hole
      maxCount: 7,              // max cards spawned per hole
      acquireRadiusYd: 25,      // ball landing within this radius acquires card
      pathStartPct: 0.05,       // spawn zone start along player→hole path
      pathEndPct: 0.95,         // spawn zone end along player→hole path
      lateralSpread: 5,         // max perpendicular offset (board pct)
      minSpacingPct: 3,         // min distance between cards (board pct)
      spawnRetries: 10,         // max retries per card if too close
    },
  },

  map: {
    enabled: false,
    availableMaps: [],          // [{ id, pointCount, data }]
    selectedMaps: [],           // ['map_1', 'map_3'] — checked IDs in order
    imageUrl: null,
    imageWidth: 0,
    imageHeight: 0,
    holePlan: [],               // runtime: [{ startPt, endPt, mapId, imageUrl, imageWidth, imageHeight }]
    points: [],                 // merged from all selected maps
  },

  game: {
    /** Yards → board percentage conversion */
    ydToPct: 0.20,

    /** Distance (yd) below which we switch to Clutch Roll */
    clutchThresholdYd: 20,

    /** Power stat → max push distance (yd), aggressive diminishing returns */
    powerToRange: {
      0: 20, 1: 30, 2: 46, 3: 62, 4: 80,
      5: 100, 6: 116, 7: 130, 8: 142, 9: 152, 10: 162,
      11: 171, 12: 179, 13: 186, 14: 192, 15: 197,
    },

    /** Aim stat → lateral offset rate (exponential decay: ~1.7 × e^(-0.42×aim)) */
    aimToOffsetRate: {
      1: 1.10, 2: 0.73, 3: 0.49, 4: 0.32, 5: 0.22,
      6: 0.14, 7: 0.095, 8: 0.063, 9: 0.042, 10: 0.028,
      11: 0.018, 12: 0.012, 13: 0.008, 14: 0.005, 15: 0.003,
    },

    /** 18-hole par layout */
    parLayout: [4, 3, 4, 4, 3, 5, 4, 3, 4, 3, 4, 3, 4, 4, 3, 4, 5, 3],

    /** Hole distance generation ranges (yd) */
    holeDistance: {
      3: { min: 100, max: 160 },
      4: { min: 210, max: 300 },
      5: { min: 340, max: 400 },
    },

    /** Distance sampling bounds (multipliers of idealDist) */
    distBounds: {
      min: 0.6,
      softCap: 1.12,
      maxPushSoftCap: 1.05,
    },

    /** Hard cap burst rates by touch tier */
    burstRate: {
      high: 1.05,   // touch >= 8
      mid: 1.03,    // touch >= 5
      low: 1.02,
    },

    /** Clutch Roll: base make chance by distance tier (yd) */
    clutchBaseChance: [
      { maxDist: 2,  chance: 0.95 },
      { maxDist: 5,  chance: 0.82 },
      { maxDist: 10, chance: 0.60 },
      { maxDist: 15, chance: 0.42 },
      { maxDist: Infinity, chance: 0.28 },
    ],

    /** Clutch Roll: miss distance ranges (yd) */
    clutchMissDistance: [
      { maxDist: 2,  min: 0.3, range: 0.5 },
      { maxDist: 5,  min: 0.5, range: 1.0 },
      { maxDist: 10, min: 1.0, range: 2.0 },
      { maxDist: 15, min: 2.0, range: 3.0 },
      { maxDist: Infinity, min: 3.0, range: 4.0 },
    ],

    /** Range-band influence: how much each stat matters at different distances */
    rangeBandInfluence: {
      long:  { minDist: 180, power: 1.0, aim: 0.5, touch: 0.2 },
      mid:   { minDist: 80,  maxDist: 180, power: 0.8, aim: 1.0, touch: 0.6 },
      short: { minDist: 20,  maxDist: 80,  power: 0.4, aim: 0.9, touch: 0.9 },
      clutch:{ minDist: 0,   maxDist: 20,  power: 0.1, aim: 0.4, touch: 1.0 },
    },

    /** How Aim offset converts to effective remaining distance penalty */
    offsetPenaltyRate: 0.6,

    /** Shot outcome label thresholds */
    outcomeThresholds: {
      holedYd: 1,
      pinseekerYd: 5,
      great: { minProgress: 0.85, maxOffset: 5 },
      good:  { minProgress: 0.65, maxOffset: 10 },
      okay:  { minProgress: 0.4, maxOffset: 25 },
    },

    /** Animation & pacing (ms) */
    timing: {
      flightDuration: 0.8,     // ball in-flight time
      fadeDuration: 1.6,       // ball trail fade-out time
      shotDelay: 600,          // ms pause before each auto-shot
      landDelay: 400,          // ms pause after ball lands, before turn switch
      cameraFollowUp: 700,     // ms for camera to refocus between shots
      holedReset: 800,         // ms after one player holes, before next turn resumes
      holeTransition: 1200,    // ms pause between holes (both holed)
      holeTransitionFinal: 2000, // ms pause after final hole
      introFrameDuration: 80,  // ms per photo in fire intro animation
    },
  },
}

export default appConfig
