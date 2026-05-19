import { useState, useMemo, useRef, useCallback, useEffect } from 'react'
import { YD_TO_PCT, distPct } from '../utils/shotPhysics'
import Board from './Board'
import Palette from '../Palette'
import appConfig from '../appConfig'
import './TrainingPicker.css'

const STAT_META = [
  { key: 'power', label: 'PWR', color: '#EF4444' },
  { key: 'aim', label: 'AIM', color: '#008BFF' },
  { key: 'nerve', label: 'NRV', color: '#719241' },
]

const IMAGES = Array.from({ length: 10 }, (_, i) => `/mock-record/day-1/P_${i + 1}.jpg`)
const CLUBS = ['Driver', '6-Iron', '7-Iron', '8-Iron', '9-Iron', 'PW', 'SW', 'GW', '5-Iron', 'Putter']
const ARCHETYPE_PROGRESSION = ['Raw Talent', 'Wildcard', 'Steady Eddie', 'The Bomber', 'The Closer']

function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min }
function rand(min, max) { return min + Math.random() * (max - min) }

const PROGRESSION = [
  { radarMin: 2, radarMax: 4.5, scoreMin: 25, scoreMax: 50, stabMin: 1, stabMax: 2 },
  { radarMin: 3, radarMax: 5.5, scoreMin: 35, scoreMax: 60, stabMin: 1, stabMax: 3 },
  { radarMin: 4, radarMax: 6.5, scoreMin: 45, scoreMax: 70, stabMin: 2, stabMax: 4 },
  { radarMin: 5, radarMax: 7.5, scoreMin: 55, scoreMax: 80, stabMin: 2, stabMax: 5 },
  { radarMin: 6, radarMax: 9,   scoreMin: 65, scoreMax: 95, stabMin: 3, stabMax: 5 },
]

function generateTrainingRecords() {
  return Array.from({ length: 5 }, (_, dayIdx) => {
    const prog = PROGRESSION[dayIdx]
    const swingCount = randInt(5, 10)
    const swings = Array.from({ length: swingCount }, (_, i) => ({
      id: `swing_${dayIdx}_${i}`,
      club: CLUBS[randInt(0, CLUBS.length - 1)],
      score: randInt(prog.scoreMin, prog.scoreMax),
      rotation: +rand(prog.radarMin, prog.radarMax).toFixed(1),
      sequencing: +rand(prog.radarMin, prog.radarMax).toFixed(1),
      balance: +rand(prog.radarMin, prog.radarMax).toFixed(1),
      planeControl: +rand(prog.radarMin, prog.radarMax).toFixed(1),
      impactControl: +rand(prog.radarMin, prog.radarMax).toFixed(1),
      stability: randInt(prog.stabMin, prog.stabMax),
    }))
    const avgScore = Math.round(swings.reduce((s, sw) => s + sw.score, 0) / swings.length)
    const date = new Date(2026, 4, 13 - dayIdx)
    return {
      id: `day_${dayIdx}`,
      date: date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
      swingCount, avgScore,
      archetype: ARCHETYPE_PROGRESSION[dayIdx],
      swings,
    }
  })
}

function computeStats(day) {
  const s = day.swings, n = s.length
  const avgRotation = s.reduce((a, w) => a + w.rotation, 0) / n
  const avgSequencing = s.reduce((a, w) => a + w.sequencing, 0) / n
  const avgBalance = s.reduce((a, w) => a + w.balance, 0) / n
  const avgPlane = s.reduce((a, w) => a + w.planeControl, 0) / n
  const avgImpact = s.reduce((a, w) => a + w.impactControl, 0) / n
  const avgStab = s.reduce((a, w) => a + w.stability, 0) / n
  const power = Math.max(1, Math.min(10, Math.round((avgRotation + avgSequencing) / 2)))
  const aim = Math.max(1, Math.min(10, Math.round((avgPlane + avgImpact) / 2)))
  const nerve = Math.max(1, Math.min(10, Math.round((avgBalance + avgStab) / 2)))
  return { power, aim, nerve }
}

function statTier(v) { return v >= 8 ? 'S' : v >= 6 ? 'A' : v >= 4 ? 'B' : 'C' }
function tierColor(v) { return v >= 80 ? '#FFD700' : v >= 60 ? '#719241' : v >= 40 ? '#5B9BD5' : '#B0B0B0' }
function scoreTier(v) { return v >= 80 ? 'S' : v >= 60 ? 'A' : v >= 40 ? 'B' : 'C' }

const LEVEL_THRESHOLDS = [0, 50, 120, 200, 300, 420, 560, 720, 900, 1100]
function getLevel(xp) { for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) if (xp >= LEVEL_THRESHOLDS[i]) return i + 1; return 1 }
function getLevelProgress(xp) {
  const lv = getLevel(xp)
  const cur = LEVEL_THRESHOLDS[lv - 1] || 0
  const next = LEVEL_THRESHOLDS[lv] || LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1] + 200
  return (xp - cur) / (next - cur)
}

function classifyShot(distYd) {
  if (distYd <= 0) return { grade: 'holed', xp: 50, label: 'HOLED!', color: '#FFD700' }
  if (distYd <= 1) return { grade: 'pinseeker', xp: 30, label: 'PINSEEKER!', color: '#FFD700' }
  if (distYd <= 5) return { grade: 'great', xp: 15, label: 'GREAT!', color: '#719241' }
  if (distYd <= 15) return { grade: 'good', xp: 10, label: 'GOOD', color: '#5B9BD5' }
  if (distYd <= 30) return { grade: 'ok', xp: 5, label: 'OK', color: '#B0B0B0' }
  return { grade: 'rough', xp: 2, label: 'ROUGH', color: '#EF4444' }
}

const SESSION_THUMBS = Array.from({ length: 5 }, () =>
  Array.from({ length: randInt(4, 7) }, () => ({
    src: IMAGES[randInt(0, IMAGES.length - 1)],
    club: CLUBS[randInt(0, CLUBS.length - 1)],
    score: randInt(30, 95),
  }))
)

export default function TrainingPicker({ onSelectTraining }) {
  const [trainingRecords] = useState(() => generateTrainingRecords())
  const [selectedIdx, setSelectedIdx] = useState(null)
  const [practiceStats, setPracticeStats] = useState({
    totalShots: 0, holedCount: 0, bestDistanceYd: Infinity,
    currentStreak: 0, bestStreak: 0, totalAccuracyYd: 0, xp: 0,
  })
  const [shotLabel, setShotLabel] = useState(null)
  const [shotHistory, setShotHistory] = useState([])
  const lastShotTime = useRef(0)
  const labelTimeout = useRef(null)
  const prevSelectedIdx = useRef(null)

  const selectedDay = selectedIdx !== null ? trainingRecords[selectedIdx] : null
  const playerStats = useMemo(() => selectedDay ? computeStats(selectedDay) : null, [selectedDay])
  const inPractice = selectedIdx !== null

  useEffect(() => {
    if (prevSelectedIdx.current !== selectedIdx && selectedIdx !== null) {
      setPracticeStats({ totalShots: 0, holedCount: 0, bestDistanceYd: Infinity, currentStreak: 0, bestStreak: 0, totalAccuracyYd: 0, xp: 0 })
      setShotHistory([]); setShotLabel(null)
    }
    prevSelectedIdx.current = selectedIdx
  }, [selectedIdx])

  useEffect(() => () => { if (labelTimeout.current) clearTimeout(labelTimeout.current) }, [])

  const practicePlayers = useMemo(() => {
    if (!playerStats || !selectedDay) return []
    return [{
      id: 'you', name: 'You', abbr: 'YOU', score: selectedDay.avgScore,
      color: Palette.red[700], stats: playerStats,
      curse: { issue: 'None', desc: '', effect: { stat: null, mod: 0, label: '' } },
    }]
  }, [playerStats, selectedDay])

  const handleStart = () => {
    if (!selectedDay || !playerStats) return
    onSelectTraining?.({ day: selectedDay, stats: playerStats })
  }

  const handleShotResult = useCallback(({ endX, endY, holeX, holeY }) => {
    const now = Date.now()
    if (now - lastShotTime.current < 300) return
    lastShotTime.current = now

    const distPctVal = distPct({ x: endX, y: endY }, { x: holeX, y: holeY })
    const distYd = distPctVal / YD_TO_PCT
    const shot = { ...classifyShot(distYd), distYd: Math.round(distYd) }

    setPracticeStats(prev => {
      const isAccurate = shot.distYd <= 10
      const newStreak = isAccurate ? prev.currentStreak + 1 : 0
      const streakXp = isAccurate ? newStreak * 2 : 0
      const newBestDist = Math.min(prev.bestDistanceYd, shot.distYd)
      return {
        totalShots: prev.totalShots + 1,
        holedCount: prev.holedCount + (shot.grade === 'holed' ? 1 : 0),
        bestDistanceYd: newBestDist === Infinity ? shot.distYd : newBestDist,
        currentStreak: newStreak,
        bestStreak: Math.max(prev.bestStreak, newStreak),
        totalAccuracyYd: prev.totalAccuracyYd + shot.distYd,
        xp: prev.xp + shot.xp + streakXp,
      }
    })

    setShotLabel(shot)
    setShotHistory(prev => [shot, ...prev].slice(0, 10))
    if (labelTimeout.current) clearTimeout(labelTimeout.current)
    labelTimeout.current = setTimeout(() => setShotLabel(null), 1200)
  }, [])

  const level = getLevel(practiceStats.xp)
  const levelProgress = getLevelProgress(practiceStats.xp)
  const bestDistDisplay = practiceStats.bestDistanceYd === Infinity ? '--' : `${Math.round(practiceStats.bestDistanceYd)}yd`

  const handleSelectDay = (i) => {
    setSelectedIdx(prev => prev === i ? null : i)
  }

  return (
    <div className={`tp-container${inPractice ? ' tp-practice-mode' : ''}`}>
      {!inPractice ? (
        <>
          <div className="tp-header">
            <h2 className="tp-title">Training Records</h2>
            <span className="tp-subtitle">Pick a day to build your stats</span>
          </div>

          <div className="tp-day-list">
            {trainingRecords.map((day, i) => {
              const stats = computeStats(day)
              const tier = scoreTier(day.avgScore)
              return (
                <div key={day.id} className="tp-day-card" onClick={() => setSelectedIdx(i)}>
                  <div className="tp-day-top">
                    <div className="tp-day-meta">
                      <span className="tp-day-num">DAY {i + 1}</span>
                      <span className="tp-day-date">{day.date}</span>
                    </div>
                    <div className="tp-day-score-ring" data-tier={tier}>
                      <span className="tp-day-score-val">{day.avgScore}</span>
                    </div>
                  </div>
                  <div className="tp-day-body">
                    <div className="tp-day-left">
                      <div className="tp-sessions">
                        {(SESSION_THUMBS[i] || []).map((s, si) => (
                          <div key={si} className="tp-session">
                            <div className="tp-session-thumb">
                              <img src={s.src} alt="" loading="lazy" />
                              <span className="tp-session-club">{s.club}</span>
                            </div>
                            <span className="tp-session-score" style={{ color: tierColor(s.score) }}>{s.score}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="tp-day-right">
                      <div className="tp-day-stat-row">
                        {STAT_META.map(({ key, label }) => {
                          const v = stats[key], t = statTier(v)
                          return (
                            <div key={key} className="tp-stat-badge" data-tier={t}>
                              <span className="tp-stat-badge-val">{v}</span>
                              <span className="tp-stat-badge-label">{label}</span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="tp-summary">
            <span className="tp-summary-empty">Select a day above to start practice</span>
          </div>
        </>
      ) : (
        <>
          <div className="tp-practice-header">
            <button className="tp-practice-close" onClick={() => setSelectedIdx(null)}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M3 3l8 8M11 3l-8 8" />
              </svg>
            </button>

            <div className="tp-pill-strip">
              {trainingRecords.map((day, i) => (
                <button
                  key={day.id}
                  className={`tp-pill${selectedIdx === i ? ' tp-pill-active' : ''}`}
                  data-tier={scoreTier(day.avgScore)}
                  onClick={() => handleSelectDay(i)}
                >
                  <span className="tp-pill-day">D{i + 1}</span>
                  <span className="tp-pill-score">{day.avgScore}</span>
                </button>
              ))}
            </div>

            <div className="tp-practice-stats">
              {STAT_META.map(({ key, label }) => {
                const val = playerStats?.[key] ?? 0
                return (
                  <div key={key} className="tp-practice-stat" data-tier={statTier(val)}>
                    <span className="tp-practice-stat-val">{val}</span>
                    <span className="tp-practice-stat-label">{label}</span>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="tp-board-area">
            <Board
              players={practicePlayers}
              activePlayerId="you"
              mode="test"
              onShotResult={handleShotResult}
            />
          </div>

          {shotLabel && (
            <div className="tp-shot-label" style={{ color: shotLabel.color }}>
              {shotLabel.label}
              {shotLabel.distYd > 0 && <span className="tp-shot-dist">{shotLabel.distYd}yd</span>}
            </div>
          )}

          {shotHistory.length > 0 && (
            <div className="tp-ticker">
              {shotHistory.map((s, i) => (
                <span key={i} className="tp-ticker-dot" style={{ background: s.color, opacity: 1 - i * 0.08 }} />
              ))}
            </div>
          )}

          <div className="tp-practice-hud">
            <div className="tp-hud-left">
              <div className="tp-hud-counter">
                <span className="tp-hud-counter-val">{practiceStats.totalShots}</span>
                <span className="tp-hud-counter-label">SHOTS</span>
              </div>
              <div className="tp-hud-streak">
                <svg width="12" height="12" viewBox="0 0 16 16" fill={practiceStats.currentStreak >= 3 ? '#FF6B35' : '#666'}>
                  <path d="M8 1C5 4 2 7 2 10c0 3.3 2.7 6 6 6s6-2.7 6-6c0-3-3-6-6-9zm0 13c-2.2 0-4-1.8-4-4 0-2 2-4.5 4-7 2 2.5 4 5 4 7 0 2.2-1.8 4-4 4z"/>
                </svg>
                <span className={`tp-hud-streak-val${practiceStats.currentStreak >= 3 ? ' tp-hud-streak-hot' : ''}`}>{practiceStats.currentStreak}</span>
              </div>
            </div>

            <div className="tp-hud-center">
              <div className="tp-hud-best">
                <span className="tp-hud-best-label">BEST</span>
                <span className="tp-hud-best-val">{bestDistDisplay}</span>
              </div>
              <div className="tp-hud-holed">
                <span className="tp-hud-holed-val">{practiceStats.holedCount}</span>
                <span className="tp-hud-holed-label">HOLED</span>
              </div>
            </div>

            <div className="tp-hud-right">
              <span className="tp-hud-level">LV{level}</span>
              <div className="tp-hud-xp-bar">
                <div className="tp-hud-xp-fill" style={{ width: `${levelProgress * 100}%` }} />
              </div>
              <span className="tp-hud-xp-text">{practiceStats.xp}XP</span>
            </div>

            <button className="tp-hud-match-btn" onClick={handleStart}>
              <span className="tp-hud-match-label">MATCH</span>
              <span className="tp-hud-match-arrow">→</span>
            </button>
          </div>
        </>
      )}
    </div>
  )
}
