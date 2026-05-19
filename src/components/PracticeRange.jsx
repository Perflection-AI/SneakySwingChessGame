import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { YD_TO_PCT, CLUTCH_THRESHOLD_YD, distPct, SWING_ISSUES } from '../utils/shotPhysics'
import Board from './Board'
import Palette from '../Palette'
import './PracticeRange.css'

const STAT_META = [
  { key: 'power', label: 'PWR', color: '#EF4444' },
  { key: 'aim', label: 'AIM', color: '#008BFF' },
  { key: 'touch', label: 'TCH', color: '#719241' },
]

const LEVEL_THRESHOLDS = [0, 50, 120, 200, 300, 420, 560, 720, 900, 1100]

function tierOf(val) {
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

const ACCURACY_THRESHOLD_YD = 10

export default function PracticeRange({ playerTraining, testConfig, onBack, players, mapImageUrl }) {
  const [stats, setStats] = useState({
    totalShots: 0,
    holedCount: 0,
    bestDistanceYd: Infinity,
    currentStreak: 0,
    bestStreak: 0,
    totalAccuracyYd: 0,
    xp: 0,
  })
  const [shotLabel, setShotLabel] = useState(null)
  const [shotHistory, setShotHistory] = useState([])
  const lastShotTime = useRef(0)
  const labelTimeout = useRef(null)

  const dayStats = playerTraining?.stats
  const issue = dayStats?.issue
  const issueDef = issue && issue !== 'none' ? SWING_ISSUES[issue] : null

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

    setStats(prev => {
      const isAccurate = shot.distYd <= ACCURACY_THRESHOLD_YD
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

  useEffect(() => {
    return () => { if (labelTimeout.current) clearTimeout(labelTimeout.current) }
  }, [])

  const level = getLevel(stats.xp)
  const levelProgress = getLevelProgress(stats.xp)
  const accuracy = stats.totalShots > 0
    ? Math.round((1 - stats.totalAccuracyYd / (stats.totalShots * 100)) * 100)
    : 0
  const bestDistDisplay = stats.bestDistanceYd === Infinity ? '--' : `${Math.round(stats.bestDistanceYd)}yd`

  return (
    <div className="pr-container">
      {/* Top bar */}
      <div className="pr-topbar">
        <button className="pr-back-btn" onClick={onBack}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 2L4 7l5 5" />
          </svg>
          <span>Back</span>
        </button>

        <div className="pr-topbar-stats">
          {STAT_META.map(({ key, label }) => {
            const val = dayStats?.[key] ?? 0
            const tier = tierOf(val)
            return (
              <div key={key} className={`pr-stat-chip`} data-tier={tier}>
                <span className="pr-stat-chip-val">{val}</span>
                <span className="pr-stat-chip-label">{label}</span>
              </div>
            )
          })}
        </div>

        {issueDef && (
          <div className="pr-issue-tag">
            <span className="pr-issue-dot">!</span>
            <span className="pr-issue-name">{issueDef.label}</span>
          </div>
        )}
      </div>

      {/* Board */}
      <div className="pr-board-area">
        <Board
          players={players}
          activePlayerId="you"
          mode="test"
          testConfig={testConfig}
          mapImageUrl={mapImageUrl}
          onShotResult={handleShotResult}
        />
      </div>

      {/* Shot result label */}
      {shotLabel && (
        <div className="pr-shot-label" style={{ color: shotLabel.color }}>
          {shotLabel.label}
          {shotLabel.distYd > 0 && <span className="pr-shot-dist">{shotLabel.distYd}yd</span>}
        </div>
      )}

      {/* Bottom HUD */}
      <div className="pr-hud">
        <div className="pr-hud-section pr-hud-left">
          <div className="pr-hud-counter">
            <span className="pr-hud-counter-val">{stats.totalShots}</span>
            <span className="pr-hud-counter-label">SHOTS</span>
          </div>
          <div className="pr-hud-streak">
            <span className="pr-hud-streak-icon">
              <svg width="14" height="14" viewBox="0 0 16 16" fill={stats.currentStreak >= 3 ? '#FF6B35' : '#828282'}>
                <path d="M8 1C5 4 2 7 2 10c0 3.3 2.7 6 6 6s6-2.7 6-6c0-3-3-6-6-9zm0 13c-2.2 0-4-1.8-4-4 0-2 2-4.5 4-7 2 2.5 4 5 4 7 0 2.2-1.8 4-4 4z"/>
              </svg>
            </span>
            <span className={`pr-hud-streak-val${stats.currentStreak >= 3 ? ' pr-hud-streak-hot' : ''}`}>{stats.currentStreak}</span>
          </div>
        </div>

        <div className="pr-hud-section pr-hud-center">
          <div className="pr-hud-best">
            <span className="pr-hud-best-label">BEST</span>
            <span className="pr-hud-best-val">{bestDistDisplay}</span>
          </div>
          <div className="pr-hud-holed">
            <span className="pr-hud-holed-val">{stats.holedCount}</span>
            <span className="pr-hud-holed-label">HOLED</span>
          </div>
        </div>

        <div className="pr-hud-section pr-hud-right">
          <div className="pr-hud-level">
            <span className="pr-hud-level-badge">LV{level}</span>
          </div>
          <div className="pr-hud-xp-bar">
            <div className="pr-hud-xp-fill" style={{ width: `${levelProgress * 100}%` }} />
          </div>
          <span className="pr-hud-xp-text">{stats.xp} XP</span>
        </div>
      </div>

      {/* Recent shots ticker */}
      {shotHistory.length > 0 && (
        <div className="pr-ticker">
          {shotHistory.map((s, i) => (
            <span key={i} className={`pr-ticker-dot`} style={{ background: s.color, opacity: 1 - i * 0.08 }} />
          ))}
        </div>
      )}
    </div>
  )
}
