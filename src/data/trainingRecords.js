const CLUBS = ['Driver', '6-Iron', '8-Iron', 'Pitching Wedge', 'Putter', '9-Iron', 'Sand Wedge', '7-Iron', '5-Iron', 'Gap Wedge']

const SWING_ISSUES = [
  'earlyExt', 'casting', 'overTheTop', 'poorTempo', 'chickenWing',
  'slideHip', 'reversePivot', 'scoop', 'fatShot', 'thinShot',
]

function rand(min, max) {
  return min + Math.random() * (max - min)
}

function randInt(min, max) {
  return Math.floor(rand(min, max + 1))
}

function generateSwing(index) {
  const club = CLUBS[randInt(0, CLUBS.length - 1)]
  const rotation = +rand(2, 9.5).toFixed(1)
  const sequencing = +rand(2, 9.5).toFixed(1)
  const balance = +rand(1.5, 9.5).toFixed(1)
  const planeControl = +rand(1.5, 9.5).toFixed(1)
  const impactControl = +rand(1.5, 9.5).toFixed(1)
  const score = randInt(25, 95)
  const potential = randInt(1, 5)
  const stability = randInt(1, 5)
  const issue = SWING_ISSUES[randInt(0, SWING_ISSUES.length - 1)]

  return {
    id: `swing_${Date.now()}_${index}`,
    club,
    score,
    potential,
    stability,
    issue,
    technicalRadar: [
      { name: 'Rotation', value: rotation },
      { name: 'Sequencing', value: sequencing },
      { name: 'Balance', value: balance },
      { name: 'Plane Control', value: planeControl },
      { name: 'Impact Control', value: impactControl },
    ],
  }
}

function generateDay(dayOffset) {
  const date = new Date(2026, 4, 13 - dayOffset)
  const swingCount = randInt(5, 10)
  const swings = Array.from({ length: swingCount }, (_, i) => generateSwing(i))

  const avgScore = Math.round(swings.reduce((s, sw) => s + sw.score, 0) / swings.length)

  const archetypes = ['The Bomber', 'The Sniper', 'The Closer', 'Wildcard', 'Steady Eddie', 'Raw Talent']
  const archetype = archetypes[randInt(0, archetypes.length - 1)]

  return {
    id: `day_${dayOffset}`,
    date: date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
    fullDate: date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
    swingCount,
    avgScore,
    archetype,
    swings,
  }
}

const DAYS = 5
const trainingRecords = Array.from({ length: DAYS }, (_, i) => generateDay(i))

export function computeStatsFromTraining(day) {
  const swings = day.swings
  const n = swings.length

  const avgRotation = swings.reduce((s, sw) => s + sw.technicalRadar[0].value, 0) / n
  const avgSequencing = swings.reduce((s, sw) => s + sw.technicalRadar[1].value, 0) / n
  const avgBalance = swings.reduce((s, sw) => s + sw.technicalRadar[2].value, 0) / n
  const avgPlaneControl = swings.reduce((s, sw) => s + sw.technicalRadar[3].value, 0) / n
  const avgImpactControl = swings.reduce((s, sw) => s + sw.technicalRadar[4].value, 0) / n
  const avgStability = swings.reduce((s, sw) => s + sw.stability, 0) / n

  const power = Math.max(1, Math.min(10, Math.round((avgRotation + avgSequencing) / 2)))
  const aim = Math.max(1, Math.min(10, Math.round((avgPlaneControl + avgImpactControl) / 2)))
  const touch = Math.max(1, Math.min(10, Math.round((avgBalance + avgStability) / 2)))

  const issueCounts = {}
  for (const sw of swings) {
    issueCounts[sw.issue] = (issueCounts[sw.issue] || 0) + 1
  }
  const dominantIssue = Object.entries(issueCounts).sort((a, b) => b[1] - a[1])[0][0]

  return { power, aim, touch, issue: dominantIssue }
}

export default trainingRecords
