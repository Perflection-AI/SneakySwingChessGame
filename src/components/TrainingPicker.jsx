import { useState, useMemo, useRef, useCallback, useEffect } from 'react'
import { computeStatsFromTraining } from '../data/trainingRecords'
import { SWING_ISSUES, YD_TO_PCT, distPct } from '../utils/shotPhysics'
import Board from './Board'
import Palette from '../Palette'
import './TrainingPicker.css'

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

function classifyShot(distYd) {
  if (distYd <= 0) return { grade: 'holed', label: 'HOLED!', color: '#FFD700' }
  if (distYd <= 1) return { grade: 'pinseeker', label: 'PINSEEKER!', color: '#FFD700' }
  if (distYd <= 5) return { grade: 'great', label: 'GREAT!', color: '#719241' }
  if (distYd <= 15) return { grade: 'good', label: 'GOOD', color: '#5B9BD5' }
  if (distYd <= 30) return { grade: 'ok', label: 'OK', color: '#B0B0B0' }
  return { grade: 'rough', label: 'ROUGH', color: '#EF4444' }
}

function StatBadge({ value, label, size = 'sm' }) {
  const tier = value >= 8 ? 'S' : value >= 6 ? 'A' : value >= 4 ? 'B' : 'C'
  return (
    <div className={`tp-stat-badge tp-stat-badge-${size}`} data-tier={tier}>
      <span className="tp-stat-badge-val">{value}</span>
      <span className="tp-stat-badge-label">{label}</span>
    </div>
  )
}

export default function TrainingPicker({ trainingRecords, onSelectTraining, onPracticeRange }) {
  const [selectedIdx, setSelectedIdx] = useState(null)
  const [shotCount, setShotCount] = useState(0)
  const [bestDist, setBestDist] = useState(null)
  const [shotLabel, setShotLabel] = useState(null)
  const lastShotTime = useRef(0)
  const labelTimeout = useRef(null)
  const prevSelectedIdx = useRef(null)

  const selectedDay = selectedIdx !== null ? trainingRecords[selectedIdx] : null
  const playerStats = useMemo(() => {
    if (!selectedDay) return null
    return computeStatsFromTraining(selectedDay)
  }, [selectedDay])

  useEffect(() => {
    if (prevSelectedIdx.current !== selectedIdx && selectedIdx !== null) {
      setShotCount(0)
      setBestDist(null)
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
    const stats = playerStats || { power: 5, aim: 5, touch: 5 }
    return [{
      id: 'you',
      name: 'You',
      abbr: 'YOU',
      score: selectedDay?.avgScore ?? 50,
      color: Palette.red[700],
      stats,
      issue: stats.issue || 'none',
      photoDir: '/mock-record/day-1',
    }]
  }, [playerStats, selectedDay])

  const handleStart = () => {
    if (!selectedDay || !playerStats) return
    onSelectTraining({ day: selectedDay, stats: playerStats })
  }

  const handlePracticeRange = () => {
    if (!selectedDay || !playerStats) return
    onPracticeRange({ day: selectedDay, stats: playerStats })
  }

  const handleShotResult = useCallback(({ endX, endY, holeX, holeY, outcome }) => {
    const now = Date.now()
    if (now - lastShotTime.current < 300) return
    lastShotTime.current = now

    const distPctVal = distPct({ x: endX, y: endY }, { x: holeX, y: holeY })
    const distYd = distPctVal / YD_TO_PCT

    let shot
    if (outcome === 'holed' || outcome === 'miracle') {
      shot = { grade: 'holed', label: outcome === 'miracle' ? 'MIRACLE!' : 'HOLED!', color: '#FFD700', distYd: 0 }
    } else {
      shot = { ...classifyShot(distYd), distYd: Math.round(distYd) }
    }

    setShotCount(c => c + 1)
    setBestDist(prev => prev === null ? shot.distYd : Math.min(prev, shot.distYd))
    setShotLabel(shot)
    if (labelTimeout.current) clearTimeout(labelTimeout.current)
    labelTimeout.current = setTimeout(() => setShotLabel(null), 1200)
  }, [])

  const bestDistDisplay = bestDist === null ? '--' : `${Math.round(bestDist)}yd`
  const issueDef = playerStats?.issue && playerStats.issue !== 'none' ? SWING_ISSUES[playerStats.issue] : null

  return (
    <div className="tp-container">
      {/* Header */}
      <div className="tp-header">
        <h2 className="tp-title">Training Records</h2>
        <span className="tp-subtitle">Pick a day to preview & test</span>
      </div>

      {/* Day cards list — scrollable, compact */}
      <div className="tp-day-list">
        {trainingRecords.map((day, i) => {
          const stats = computeStatsFromTraining(day)
          const tier = tierOf(day.avgScore)
          const active = selectedIdx === i
          return (
            <div
              key={day.id}
              className={`tp-day-card${active ? ' tp-day-card-active' : ''}`}
              onClick={() => setSelectedIdx(prev => prev === i ? null : i)}
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
                    <StatBadge value={stats.power} label="PWR" size="xs" />
                    <StatBadge value={stats.aim} label="AIM" size="xs" />
                    <StatBadge value={stats.touch} label="TCH" size="xs" />
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

      {/* Test field — small, always visible */}
      <div className="tp-board-area">
        <Board
          players={practicePlayers}
          activePlayerId="you"
          mode="test"
          testConfig={testConfig}
          illustrateConfig={{ varyStat: 'power', baseStats: { power: 5, aim: 5, touch: 5 }, paused: true }}
          onShotResult={handleShotResult}
        />
        {shotLabel && (
          <div className="tp-shot-label" style={{ color: shotLabel.color }}>
            {shotLabel.label}
            {shotLabel.distYd > 0 && <span className="tp-shot-dist">{shotLabel.distYd}yd</span>}
          </div>
        )}
      </div>

      {/* HUD */}
      <div className="tp-practice-hud">
        <div className="tp-hud-stat">
          <span className="tp-hud-stat-val">{shotCount}</span>
          <span className="tp-hud-stat-label">SHOTS</span>
        </div>
        <div className="tp-hud-stat">
          <span className="tp-hud-stat-val">{bestDistDisplay}</span>
          <span className="tp-hud-stat-label">BEST</span>
        </div>

        {selectedDay && playerStats && (
          <>
            <div className="tp-hud-stat tp-hud-stat-preview">
              <span className="tp-hud-preview-label">SELECTED</span>
              <div className="tp-hud-preview-stats">
                <span style={{ color: '#EF4444' }}>P{playerStats.power}</span>
                <span style={{ color: '#008BFF' }}>A{playerStats.aim}</span>
                <span style={{ color: '#719241' }}>T{playerStats.touch}</span>
                {issueDef && <span className="tp-hud-issue-tag">{issueDef.label}</span>}
              </div>
            </div>
          </>
        )}

        <div className="tp-hud-spacer" />

        <button className="tp-hud-range-btn" onClick={handlePracticeRange}>
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="8" cy="8" r="3" />
            <line x1="8" y1="1" x2="8" y2="3" />
            <line x1="8" y1="13" x2="8" y2="15" />
            <line x1="1" y1="8" x2="3" y2="8" />
            <line x1="13" y1="8" x2="15" y2="8" />
          </svg>
          <span className="tp-hud-range-label">RANGE</span>
        </button>

        <button className={`tp-hud-match-btn${!selectedDay ? ' tp-hud-match-disabled' : ''}`} onClick={handleStart} disabled={!selectedDay}>
          <span className="tp-hud-match-label">MATCH</span>
          <span className="tp-hud-match-arrow">&#x2192;</span>
        </button>
      </div>
    </div>
  )
}
