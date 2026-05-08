const appConfig = {
  board: {
    aspectRatio: 1,
  },

  game: {
    /** Yards → board percentage conversion */
    ydToPct: 0.20,

    /** Distance (yd) below which we switch to Clutch Roll */
    clutchThresholdYd: 20,

    /** Power stat → max push distance (yd) */
    powerToRange: {
      0: 20, 1: 30, 2: 42, 3: 56, 4: 74,
      5: 96, 6: 122, 7: 152, 8: 186, 9: 224, 10: 266,
    },

    /** Aim stat → lateral offset rate */
    aimToOffsetRate: {
      1: 0.35, 2: 0.28, 3: 0.20, 4: 0.14, 5: 0.10,
      6: 0.07, 7: 0.04, 8: 0.025, 9: 0.015, 10: 0.008,
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

    /** Hard cap burst rates by nerve tier */
    burstRate: {
      high: 1.06,   // nerve >= 8
      mid: 1.04,    // nerve >= 5
      low: 1.03,
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

    /** Shot outcome label thresholds */
    outcomeThresholds: {
      holedYd: 1,
      pinseekerYd: 5,
      great: { minProgress: 0.85, maxOffset: 8 },
      good:  { minProgress: 0.65, maxOffset: 15 },
      okay:  { minProgress: 0.4 },
    },
  },
}

export default appConfig
