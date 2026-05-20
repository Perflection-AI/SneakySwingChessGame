import { useState, useMemo, useRef, useCallback, useEffect } from 'react'
import { computeStatsFromTraining } from '../data/trainingRecords'
import { SWING_ISSUES, applySwingIssue, YD_TO_PCT, distPct } from '../utils/shotPhysics'
import Board from './Board'
import Palette from '../Palette'
import './TrainingPicker.css'

const STAT_META = [
  { key: 'power', label: 'PWR', color: '#EF4444' },
  { key: 'aim', label: 'AIM', color: '#008BFF' },
  { key: 'touch', label: 'TCH', color: '#719241' },
]

function tierOf(score) {
  if (score >= 80) return 'S'
  if (score >= 60) return 'A'
  if (score >= 40) return 'B'
  return 'C'
}

function tierColor(score) {
  if (score >= 80) return '#FFD700'
  if (score >= 60) return '#719241'
  if (score >= 40) return '#5B9BD5'
  return '#B0B0B0'
}

const LEVEL_THRESHOLDS = [0, 50, 120, 200, 300, 420, 560, 720, 900, 1100]

function statTier(val) {
  if (val >= 8) return 'S'
  if (val >= 6) return 'A'
  if (val >= 4) return 'B'
  return 'C'
}

function getLevel(xp) {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_THRESHOLDS[i]) return i + 1
  }
  return 1
}

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

const IMAGES = Array.from({ length: 10 }, (_, i) => `/mock-record/day-1/P_${i + 1}.jpg`)
const CLUBS = ['Driver', '6-Iron', '7-Iron', '8-Iron', '9-Iron', 'PW', 'SW', 'GW', '5-Iron', 'Putter']

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1))
}

function makeSessions(count) {
  return Array.from({ length: count }, () => ({
    src: IMAGES[randInt(0, IMAGES.length - 1)],
    club: CLUBS[randInt(0, CLUBS.length - 1)],
    score: randInt(30, 95),
  }))
}

const SESSION_THUMBS = [makeSessions(7), makeSessions(5), makeSessions(8), makeSessions(4), makeSessions(6)]

function StatBadge({ value, label, color, size = 'sm' }) {
  const tier = value >= 8 ? 'S' : value >= 6 ? 'A' : value >= 4 ? 'B' : 'C'
  return (
    <div className={`tp-stat-badge tp-stat-badge-${size}`} data-tier={tier}>
      <span className="tp-stat-badge-val">{value}</span>
      <span className="tp-stat-badge-label">{label}</span>
    </div>
  )
}

export default function TrainingPicker({ trainingRecords, onSelectTraining }) {
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
  const playerStats = useMemo(() => {
    if (!selectedDay) return null
    return computeStatsFromTraining(selectedDay)
  }, [selectedDay])

  const effectiveStats = useMemo(() => {
    if (!playerStats) return null
    return applySwingIssue(playerStats, playerStats.issue)
  }, [playerStats])

  const inPractice = selectedIdx !== null

  useEffect(() => {
    if (prevSelectedIdx.current !== selectedIdx && selectedIdx !== null) {
      setPracticeStats({
        totalShots: 0, holedCount: 0, bestDistanceYd: Infinity,
        currentStreak: 0, bestStreak: 0, totalAccuracyYd: 0, xp: 0,
      })
      setShotHistory([])
      setShotLabel(null)
    }
    prevSelectedIdx.current = selectedIdx
  }, [selectedIdx])

  useEffect(() => {
    return () => { if (labelTimeout.current) clearTimeout(labelTimeout.current) }
  }, [])

  const testConfig = useMemo(() => {
    if (!playerStats) return { stats: { power: 5, aim: 5, touch: 5 }, issue: 'none' }
    return { stats: { power: playerStats.power, aim: playerStats.aim, touch: playerStats.touch }, issue: playerStats.issue || 'none' }
  }, [playerStats])

  const practicePlayers = useMemo(() => {
    if (!playerStats || !selectedDay) return []
    return [{
      id: 'you',
      name: 'You',
      abbr: 'YOU',
      score: selectedDay.avgScore,
      color: Palette.red[700],
      stats: playerStats,
      issue: playerStats.issue,
      photoDir: '/mock-record/day-1',
    }]
  }, [playerStats, selectedDay])

  const handleStart = () => {
    if (!selectedDay || !playerStats) return
    onSelectTraining({ day: selectedDay, stats: playerStats })
  }

  const handleShotResult = useCallback(({ endX, endY, holeX, holeY, outcome }) => {
    const now = Date.now()
    if (now - lastShotTime.current < 300) return
    lastShotTime.current = now

    const distPctVal = distPct({ x: endX, y: endY }, { x: holeX, y: holeY })
    const distYd = distPctVal / YD_TO_PCT

    let shot
    if (outcome === 'holed' || outcome === 'miracle') {
      shot = { grade: 'holed', xp: 50, label: outcome === 'miracle' ? 'MIRACLE!' : 'HOLED!', color: '#FFD700', distYd: 0 }
    } else {
      shot = { ...classifyShot(distYd), distYd: Math.round(distYd) }
    }

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
  const issueDef = playerStats?.issue && playerStats.issue !== 'none' ? SWING_ISSUES[playerStats.issue] : null

  const handleSelectDay = (i) => {
    if (selectedIdx === i) {
      setSelectedIdx(null)
    } else {
      setSelectedIdx(i)
    }
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
              const stats = computeStatsFromTraining(day)
              const tier = tierOf(day.avgScore)
              return (
                <div
                  key={day.id}
                  className="tp-day-card"
                  onClick={() => setSelectedIdx(i)}
                >
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
                        <StatBadge value={stats.power} label="PWR" color="#EF4444" />
                        <StatBadge value={stats.aim} label="AIM" color="#008BFF" />
                        <StatBadge value={stats.touch} label="TCH" color="#719241" />
                      </div>
                      {stats.issue && stats.issue !== 'none' && (
                        <div className="tp-day-debuff">
                          <span className="tp-debuff-icon">!</span>
                          <span className="tp-debuff-name">{SWING_ISSUES[stats.issue]?.label || stats.issue}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="tp-summary">
            <span className="tp-summary-empty">Select a day above to preview stats</span>
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
              {trainingRecords.map((day, i) => {
                const tier = tierOf(day.avgScore)
                const active = selectedIdx === i
                return (
                  <button
                    key={day.id}
                    className={`tp-pill${active ? ' tp-pill-active' : ''}`}
                    data-tier={tier}
                    onClick={() => handleSelectDay(i)}
                  >
                    <span className="tp-pill-day">D{i + 1}</span>
                    <span className="tp-pill-score">{day.avgScore}</span>
                  </button>
                )
              })}
            </div>

            <div className="tp-practice-stats">
              {STAT_META.map(({ key, label }) => {
                const val = playerStats?.[key] ?? 0
                const tier = statTier(val)
                return (
                  <div key={key} className="tp-practice-stat" data-tier={tier}>
                    <span className="tp-practice-stat-val">{val}</span>
                    <span className="tp-practice-stat-label">{label}</span>
                  </div>
                )
              })}
              {issueDef && (
                <div className="tp-practice-issue">
                  <span className="tp-practice-issue-dot">!</span>
                  <span className="tp-practice-issue-name">{issueDef.label}</span>
                </div>
              )}
            </div>
          </div>

          <div className="tp-board-area">
            <Board
              players={practicePlayers}
              activePlayerId="you"
              mode="test"
              testConfig={testConfig}
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
              <span className="tp-hud-match-arrow">&#x2192;</span>
            </button>
          </div>
        </>
      )}
    </div>
  )
}
